import { entity } from "../entities/Base.js";
import { InvariantViolationError } from "../errors/InvariantViolationError.js";
import { updateWithEvents, withEvents } from "./EventSourced.js";

/**
 * @typedef {Object} InvariantDefinition
 * @property {string} name - The name of the invariant
 * @property {Function} check - Function that returns true if the invariant is satisfied
 * @property {string} [message] - Optional custom error message
 */

/**
 * @template T
 * @typedef {T & {
 *   equals: (other: unknown) => boolean,
 *   toString: () => string,
 *   [key: string]: unknown
 * }} Aggregate<T>
 */

/**
 * @template SchemaType
 * @template T
 * @typedef {Object} AggregateFactory<SchemaType, T>
 * @property {(data: T) => Aggregate<T>} create - Creates a new instance of the aggregate
 * @property {(aggregate: Aggregate<T>, updates: Partial<T>) => Aggregate<T>} update - Updates an aggregate with new values
 * @property {SchemaType} schema - The Zod schema used for validation
 * @property {string} identity - The field used as identity
 * @property {InvariantDefinition[]} invariants - The invariants for this aggregate
 * @property {<NewSchemaType, NewT>(options: {
 *   name: string,
 *   schema?: (schema: SchemaType) => NewSchemaType,
 *   methodsFactory: Function,
 *   identity?: string,
 *   invariants?: InvariantDefinition[],
 *   historize?: boolean
 * }) => AggregateFactory<NewSchemaType, NewT>} extend - Creates an extended version of this aggregate
 */

/**
 * Creates an aggregate factory
 *
 * Aggregates in Domain-Driven Design are:
 * 1. Clusters of entities and value objects treated as a single unit
 * 2. Have a root entity that serves as the entry point
 * 3. Maintain invariants (business rules) across the cluster
 * 4. Define transactional boundaries
 *
 * @template SchemaType - The Zod schema type
 * @template T - The inferred type from the Zod schema
 * @param {object} options - Aggregate configuration
 * @param {string} options.name - Name of the aggregate
 * @param {SchemaType} options.schema - Zod schema for validation
 * @param {string} options.identity - Field name that serves as the identity
 * @param {function(AggregateFactory): Record<string, Function>} options.methodsFactory - Factory function that creates methods
 * @param {InvariantDefinition[]} [options.invariants=[]] - Business rules that must be satisfied
 * @param {boolean} [options.historize=false] - Whether to track state changes
 * @returns {AggregateFactory<SchemaType, T>} A factory object to create and manage aggregates
 */
export function aggregate({
                            name,
                            schema,
                            identity,
                            methodsFactory,
                            invariants = [],
                            historize = false,
                          }) {
  if (!name) throw new Error("Aggregate name is required");
  if (!schema) throw new Error("Aggregate schema is required");
  if (!identity) throw new Error("Aggregate identity field is required");
  if (typeof methodsFactory !== 'function') throw new Error("Method factory is required");

  // Create an entity factory to handle the basic entity behavior
  const entityFactory = entity({
    name,
    schema,
    identity,
    methodsFactory: () => ({}), // No methods on the entity level
    historize,
  });

  /**
   * Validates all invariants on the aggregate
   * @param {T} data - The aggregate data to validate
   * @throws {InvariantViolationError} If any invariant is violated
   */
  function validateInvariants(data) {
    for (const invariant of invariants) {
      if (!invariant.check(data)) {
        const message =
            invariant.message ||
            `Invariant '${invariant.name}' violated in ${name}`;

        throw new InvariantViolationError(message, invariant.name, {
          aggregate: name,
          data,
        });
      }
    }
  }

  /**
   * Create a new aggregate instance
   * @param {T} data - The data to create the aggregate from
   * @returns {Aggregate<T>} A new aggregate instance
   * @throws {ValidationError} If validation fails
   * @throws {InvariantViolationError} If any invariant is violated
   */
  function create(data) {
    // Create the entity, which will validate the schema
    const entityInstance = entityFactory.create(data);

    // Validate the invariants
    validateInvariants(entityInstance);

    // Create a temporary factory for use in methodsFactory
    const tempFactory = {
      create,
      update,
      schema,
      identity,
      invariants,
      extend
    };

    // Generate methods using the factory
    const methods = methodsFactory(tempFactory);

    // Add all custom methods to the prototype
    const customMethods = {};
    for (const [methodName, methodFn] of Object.entries(methods)) {
      customMethods[methodName] = methodFn;
    }

    // Combine entity instance with custom methods
    // This maintains immutability as we're binding methods to a frozen object
    const boundCustomMethods = {};
    for (const [methodName, methodFn] of Object.entries(customMethods)) {
      boundCustomMethods[methodName] = methodFn.bind(entityInstance);
    }

    // Create the basic aggregate instance
    const aggregateInstance = Object.freeze({
      ...entityInstance,
      ...boundCustomMethods,
    });

    // Enhance with event capabilities
    return withEvents(aggregateInstance);
  }

  /**
   * Updates an aggregate with new values while preserving its identity
   * @param {Aggregate<T>} aggregate - The aggregate to update
   * @param {Partial<T>} updates - The updates to apply
   * @returns {Aggregate<T>} A new aggregate instance with updated values
   * @throws {DomainError} If the identity field is changed
   * @throws {ValidationError} If validation fails
   * @throws {InvariantViolationError} If any invariant is violated
   */
  function update(aggregate, updates) {
    // Use the entity factory to perform the basic update
    const updatedEntity = entityFactory.update(aggregate, updates);

    // Validate the invariants on the updated aggregate
    validateInvariants(updatedEntity);

    // Create a new aggregate instance with the updated entity
    const updatedAggregate = create(updatedEntity);

    // Transfer any domain events
    return aggregate._domainEvents
        ? updateWithEvents(aggregate, updatedAggregate)
        : updatedAggregate;
  }

  /**
   * Extends this aggregate with additional validation, methods, and invariants
   *
   * @template NewSchemaType - The new Zod schema type
   * @template NewT - The inferred type from the new Zod schema
   * @param {object} options - Extension options
   * @param {string} options.name - Name of the extended aggregate
   * @param {(baseSchema: SchemaType) => NewSchemaType} [options.schema] - Function to transform the base schema
   * @param {function(AggregateFactory): Record<string, Function>} options.methodsFactory - Factory function for creating methods
   * @param {string} [options.identity] - Optional override for identity field
   * @param {InvariantDefinition[]} [options.invariants] - Additional invariants
   * @param {boolean} [options.historize] - Optional override for historization
   * @returns {AggregateFactory<NewSchemaType, NewT>} A new factory for the extended aggregate
   */
  function extend({
                    name: extendedName,
                    schema: schemaTransformer,
                    methodsFactory: extendedMethodsFactory,
                    identity: extendedIdentity,
                    invariants: extendedInvariants = [],
                    historize: extendedHistorize,
                  }) {
    if (!extendedName) {
      throw new Error("Extended aggregate name is required");
    }

    if (typeof extendedMethodsFactory !== 'function') {
      throw new Error("Method factory is required for extension");
    }

    // Use the extended identity or the original one
    const finalIdentity = extendedIdentity || identity;

    // Create the new schema by transforming the original
    const newSchema = schemaTransformer ? schemaTransformer(schema) : schema;

    // Combine parent and extended invariants
    const combinedInvariants = [...invariants, ...extendedInvariants];

    // Create a new aggregate factory with combined methods and invariants
    return aggregate({
      name: extendedName,
      schema: newSchema,
      identity: finalIdentity,
      methodsFactory: extendedMethodsFactory,
      invariants: combinedInvariants,
      historize:
          extendedHistorize !== undefined ? extendedHistorize : historize,
    });
  }

  // Return the factory with create, update, and extend methods
  return {
    create,
    update,
    schema,
    identity,
    invariants,
    extend,
  };
}
