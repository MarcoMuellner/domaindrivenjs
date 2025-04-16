// packages/core/src/repositories/Base.js
import { DomainError } from "../errors/index.js";
import { eventBus } from "../events/EventBus.js";
import { withEvents } from "../aggregates/EventSourced.js";

/**
 * Error thrown when repository operations fail
 * @extends DomainError
 */
export class RepositoryError extends DomainError {
  /**
   * @param {string} message - Error message
   * @param {Error} [cause] - The underlying cause
   * @param {Record<string, any>} [context] - Additional context
   */
  constructor(message, cause, context = {}) {
    super(message, cause);
    this.context = context;
  }
}

/**
 * @template T
 * @typedef {Object} RepositoryAdapter
 * @property {(id: string) => Promise<T | null>} findById - Find aggregate by ID
 * @property {(filter?: any) => Promise<T[]>} findAll - Find all aggregates matching filter
 * @property {(aggregate: T) => Promise<void>} save - Save aggregate
 * @property {(id: string) => Promise<void>} delete - Delete aggregate by ID
 * @property {(ids: string[]) => Promise<Map<string, T>>} [findByIds] - Find aggregates by multiple IDs
 * @property {(aggregates: T[]) => Promise<void>} [saveAll] - Save multiple aggregates
 * @property {(filter?: any) => Promise<number>} [count] - Count aggregates matching filter
 * @property {(specification: any) => Promise<T[]>} [findBySpecification] - Find using specification
 */

/**
 * Validates that an adapter implements all required methods
 * @template T
 * @param {RepositoryAdapter<T>} adapter - The adapter to validate
 * @throws {Error} If the adapter is missing required methods
 */
function validateAdapter(adapter) {
  const requiredMethods = ["findById", "findAll", "save", "delete"];

  for (const method of requiredMethods) {
    if (typeof adapter[method] !== "function") {
      throw new Error(`Adapter is missing required method: ${method}`);
    }
  }
}

/**
 * Creates a repository for an aggregate
 *
 * @template T - Aggregate type
 * @param {object} options - Repository configuration
 * @param {object} options.aggregate - The aggregate factory
 * @param {RepositoryAdapter<T>} options.adapter - Storage adapter
 * @param {object} [options.events] - Event handling options
 * @param {boolean} [options.events.publishOnSave=true] - Auto-publish events on save
 * @param {boolean} [options.events.clearAfterPublish=true] - Clear events after publishing
 * @returns {object} A repository for the aggregate
 */
export function repository({
  aggregate,
  adapter,
  events = {
    publishOnSave: true,
    clearAfterPublish: true,
  },
}) {
  if (!aggregate) {
    throw new Error("Repository requires an aggregate factory");
  }

  if (!adapter) {
    throw new Error("Repository requires an adapter");
  }

  // Validate the adapter implements required methods
  validateAdapter(adapter);

  // Extract aggregate identity field
  const identityField = aggregate.identity;
  if (!identityField) {
    throw new Error("Aggregate must have an identity field");
  }

  /**
   * Finds an aggregate by its ID
   * @param {string} id - The aggregate ID
   * @returns {Promise<T | null>} The aggregate or null if not found
   * @throws {RepositoryError} If an error occurs during the operation
   */
  async function findById(id) {
    if (!id) {
      throw new RepositoryError("ID is required");
    }

    try {
      const data = await adapter.findById(id);
      // Return null if not found
      if (data === null) {
        return null;
      }
      // Convert to proper aggregate instance with event capability
      const aggregateInstance = aggregate.create(data);
      return withEvents(aggregateInstance);
    } catch (error) {
      throw new RepositoryError(
        `Failed to find ${aggregate.name} with ID ${id}`,
        error,
        { id, aggregateType: aggregate.name },
      );
    }
  }

  /**
   * Finds multiple aggregates by their IDs
   * @param {string[]} ids - The aggregate IDs
   * @returns {Promise<Map<string, T>>} Map of IDs to aggregates
   * @throws {RepositoryError} If an error occurs during the operation
   */
  async function findByIds(ids) {
    if (!Array.isArray(ids)) {
      throw new RepositoryError("IDs must be an array");
    }

    if (ids.length === 0) {
      return new Map();
    }

    try {
      // If adapter provides findByIds, use it directly
      if (typeof adapter.findByIds === "function") {
        const dataMap = await adapter.findByIds(ids);
        // Convert the data map to aggregate instances
        const result = new Map();
        for (const [id, data] of dataMap.entries()) {
          const aggregateInstance = aggregate.create(data);
          result.set(id, withEvents(aggregateInstance));
        }
        return result;
      }

      // Otherwise, implement with individual findById calls
      const result = new Map();

      // Use Promise.all for parallel execution
      const dataArray = await Promise.all(
        ids.map((id) => adapter.findById(id)),
      );

      // Add found aggregates to the result map
      for (let i = 0; i < ids.length; i++) {
        const data = dataArray[i];
        if (data) {
          const aggregateInstance = aggregate.create(data);
          result.set(ids[i], withEvents(aggregateInstance));
        }
      }

      return result;
    } catch (error) {
      throw new RepositoryError(
        `Failed to find ${aggregate.name} with IDs ${ids.join(", ")}`,
        error,
        { ids, aggregateType: aggregate.name },
      );
    }
  }

  /**
   * Checks if an aggregate with the given ID exists
   * @param {string} id - The aggregate ID
   * @returns {Promise<boolean>} True if the aggregate exists
   * @throws {RepositoryError} If an error occurs during the operation
   */
  async function exists(id) {
    if (!id) {
      throw new RepositoryError("ID is required");
    }

    try {
      return (await findById(id)) !== null;
    } catch (error) {
      throw new RepositoryError(
        `Failed to check if ${aggregate.name} exists with ID ${id}`,
        error,
        { id, aggregateType: aggregate.name },
      );
    }
  }

  /**
   * Finds all aggregates matching the optional filter
   * @param {any} [filter] - Optional filter criteria
   * @returns {Promise<T[]>} Array of matching aggregates
   * @throws {RepositoryError} If an error occurs during the operation
   */
  async function findAll(filter) {
    try {
      const dataArray = await adapter.findAll(filter);
      // Convert all data to aggregate instances with event capability
      return dataArray.map((data) => {
        const aggregateInstance = aggregate.create(data);
        return withEvents(aggregateInstance);
      });
    } catch (error) {
      throw new RepositoryError(
        `Failed to find ${aggregate.name} with filter`,
        error,
        { filter, aggregateType: aggregate.name },
      );
    }
  }

  /**
   * Finds a single aggregate matching the filter
   * @param {any} filter - Filter criteria
   * @returns {Promise<T | null>} The first matching aggregate or null
   * @throws {RepositoryError} If an error occurs during the operation
   */
  async function findOne(filter) {
    if (!filter || Object.keys(filter).length === 0) {
      throw new RepositoryError("Filter is required for findOne");
    }

    try {
      const results = await findAll(filter);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      throw new RepositoryError(
        `Failed to find one ${aggregate.name} with filter`,
        error,
        { filter, aggregateType: aggregate.name },
      );
    }
  }

  /**
   * Finds aggregates using a specification
   * @param {any} specification - The specification object
   * @returns {Promise<T[]>} Matching aggregates
   * @throws {RepositoryError} If an error occurs during the operation
   */
  async function findBySpecification(specification) {
    if (!specification) {
      throw new RepositoryError("Specification is required");
    }

    try {
      // If adapter supports specifications directly
      if (typeof adapter.findBySpecification === "function") {
        const results = await adapter.findBySpecification(specification);
        // Convert raw data to aggregate instances with event capability
        return results.map((data) => {
          const aggregateInstance = aggregate.create(data);
          return withEvents(aggregateInstance);
        });
      }

      // Otherwise, load all and filter in memory
      // This is inefficient but provides a fallback
      const allData = await adapter.findAll();
      // Convert raw data to aggregate instances with event capability
      const allAggregates = allData.map((data) => {
        const aggregateInstance = aggregate.create(data);
        return withEvents(aggregateInstance);
      });

      // Validate specification before use
      if (specification && typeof specification.isSatisfiedBy === "function") {
        return allAggregates.filter((agg) => specification.isSatisfiedBy(agg));
      } else if (typeof specification === "function") {
        // Also support specification as a function predicate
        return allAggregates.filter(specification);
      }

      throw new Error(
        "Invalid specification: must have isSatisfiedBy method or be a function",
      );
    } catch (error) {
      if (error.message && error.message.includes("Invalid specification")) {
        throw error; // Re-throw the original error for expected test behavior
      }
      throw new RepositoryError(
        `Failed to find ${aggregate.name} with specification`,
        error,
        { specification, aggregateType: aggregate.name },
      );
    }
  }

  /**
   * Counts aggregates matching the optional filter
   * @param {any} [filter] - Optional filter criteria
   * @returns {Promise<number>} Count of matching aggregates
   * @throws {RepositoryError} If an error occurs during the operation
   */
  async function count(filter) {
    try {
      // If adapter provides count, use it
      if (typeof adapter.count === "function") {
        return await adapter.count(filter);
      }

      // Otherwise, use findAll and count the results
      const results = await findAll(filter);
      return results.length;
    } catch (error) {
      throw new RepositoryError(
        `Failed to count ${aggregate.name} with filter`,
        error,
        { filter, aggregateType: aggregate.name },
      );
    }
  }

  /**
   * Saves an aggregate and optionally publishes its events
   * @param {T} aggregate - The aggregate to save
   * @returns {Promise<void>}
   * @throws {RepositoryError} If an error occurs during the operation
   */
  async function save(aggregate) {
    if (!aggregate) {
      throw new RepositoryError("Aggregate is required");
    }

    try {
      // Save the aggregate
      await adapter.save(aggregate);

      // Check if aggregate has domain events to publish
      if (
        events.publishOnSave &&
        aggregate._domainEvents &&
        aggregate._domainEvents.length > 0
      ) {
        // Get all events
        const domainEvents = aggregate.getDomainEvents();

        // Publish events
        await eventBus.publishAll(domainEvents);

        // Clear events if configured to do so
        if (events.clearAfterPublish) {
          aggregate.clearDomainEvents();
        }
      }
    } catch (error) {
      const id = aggregate[identityField];
      throw new RepositoryError(
        `Failed to save ${aggregate.name} with ID ${id}`,
        error,
        { id, aggregateType: aggregate.name, aggregate },
      );
    }
  }

  /**
   * Saves multiple aggregates in a batch
   * @param {T[]} aggregates - The aggregates to save
   * @returns {Promise<void>}
   * @throws {RepositoryError} If an error occurs during the operation
   */
  async function saveAll(aggregates) {
    if (!Array.isArray(aggregates)) {
      throw new RepositoryError("Aggregates must be an array");
    }

    if (aggregates.length === 0) {
      return;
    }

    try {
      // If adapter provides bulk save, use it
      if (typeof adapter.saveAll === "function") {
        await adapter.saveAll(aggregates);

        // Handle events if needed
        if (events.publishOnSave) {
          const allEvents = [];

          // Collect events from all aggregates
          for (const aggregate of aggregates) {
            if (aggregate._domainEvents && aggregate._domainEvents.length > 0) {
              allEvents.push(...aggregate.getDomainEvents());

              if (events.clearAfterPublish) {
                aggregate.clearDomainEvents();
              }
            }
          }

          // Publish all events in one batch
          if (allEvents.length > 0) {
            await eventBus.publishAll(allEvents);
          }
        }
      } else {
        // Otherwise, save one by one
        for (const aggregate of aggregates) {
          await save(aggregate);
        }
      }
    } catch (error) {
      throw new RepositoryError(
        `Failed to save multiple ${aggregate.name} aggregates`,
        error,
        { count: aggregates.length, aggregateType: aggregate.name },
      );
    }
  }

  /**
   * Deletes an aggregate by its ID
   * @param {string} id - The aggregate ID
   * @returns {Promise<void>}
   * @throws {RepositoryError} If an error occurs during the operation
   */
  async function deleteById(id) {
    if (!id) {
      throw new RepositoryError("ID is required");
    }

    try {
      await adapter.delete(id);
    } catch (error) {
      throw new RepositoryError(
        `Failed to delete ${aggregate.name} with ID ${id}`,
        error,
        { id, aggregateType: aggregate.name },
      );
    }
  }

  // Return the repository interface
  return {
    // Core methods
    findById,
    findByIds,
    findAll,
    findOne,
    findBySpecification,
    save,
    saveAll,
    delete: deleteById,

    // Additional utility methods
    exists,
    count,
  };
}
