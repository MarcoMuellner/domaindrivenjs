// packages/core/src/repositories/adapters/Prisma.js

/**
 * Creates a Prisma-based repository adapter
 *
 * @template T - Aggregate type
 * @template P - Prisma model type
 * @param {object} options - Adapter configuration
 * @param {any} options.prisma - Prisma client instance
 * @param {string} options.model - Prisma model name
 * @param {string} options.identity - Identity field of the aggregate
 * @param {(aggregate: T) => P} [options.serialize] - Function to convert aggregate to Prisma model
 * @param {(data: P) => T} [options.deserialize] - Function to convert Prisma model to aggregate
 * @returns {import('../Base.js').RepositoryAdapter<T>} Prisma repository adapter
 */
export function createPrismaAdapter({
  prisma,
  model,
  identity,
  serialize,
  deserialize,
}) {
  if (!prisma) {
    throw new Error("Prisma client is required");
  }

  if (!model) {
    throw new Error("Prisma model name is required");
  }

  if (!identity) {
    throw new Error("Identity field is required");
  }

  // Get the Prisma model
  const prismaModel = prisma[model];
  if (!prismaModel) {
    throw new Error(`Prisma model not found: ${model}`);
  }

  // Default serializer just passes through the aggregate
  const defaultSerializer = (aggregate) => {
    const { _domainEvents, ...data } = aggregate;
    return data;
  };

  // Default deserializer also passes through
  const defaultDeserializer = (data) => data;

  // Use provided functions or defaults
  const serializeAggregate = serialize || defaultSerializer;
  const deserializeData = deserialize || defaultDeserializer;

  /**
   * Find aggregate by ID
   * @param {string} id - Aggregate ID
   * @returns {Promise<T | null>} Aggregate or null if not found
   */
  async function findById(id) {
    const where = { [identity]: id };

    try {
      const result = await prismaModel.findUnique({ where });

      if (!result) {
        return null;
      }

      return deserializeData(result);
    } catch (error) {
      throw new Error(`Failed to find aggregate by ID: ${error.message}`);
    }
  }

  /**
   * Find multiple aggregates by their IDs
   * @param {string[]} ids - Array of aggregate IDs
   * @returns {Promise<Map<string, T>>} Map of IDs to aggregates
   */
  async function findByIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return new Map();
    }

    try {
      const results = await prismaModel.findMany({
        where: { [identity]: { in: ids } },
      });

      const resultMap = new Map();
      for (const result of results) {
        const aggregate = deserializeData(result);
        resultMap.set(result[identity], aggregate);
      }

      return resultMap;
    } catch (error) {
      throw new Error(`Failed to find aggregates by IDs: ${error.message}`);
    }
  }

  /**
   * Find all aggregates matching filter
   * @param {object} [filter] - Optional filter criteria
   * @returns {Promise<T[]>} Matching aggregates
   */
  async function findAll(filter = {}) {
    try {
      const results = await prismaModel.findMany({ where: filter });
      return results.map((result) => deserializeData(result));
    } catch (error) {
      throw new Error(`Failed to find aggregates: ${error.message}`);
    }
  }

  /**
   * Find aggregates using a specification
   * @param {any} specification - The specification object
   * @returns {Promise<T[]>} Matching aggregates
   */
  async function findBySpecification(specification) {
    try {
      // Check if specification has a toQuery method for Prisma
      if (specification && typeof specification.toQuery === "function") {
        const query = specification.toQuery();
        const results = await prismaModel.findMany({ where: query });
        return results.map((result) => deserializeData(result));
      }

      // Fallback to in-memory filtering
      const allAggregates = await findAll();

      if (typeof specification.isSatisfiedBy === "function") {
        return allAggregates.filter((agg) => specification.isSatisfiedBy(agg));
      } else if (typeof specification === "function") {
        return allAggregates.filter(specification);
      }

      throw new Error(
        "Invalid specification: must have isSatisfiedBy method or be a function",
      );
    } catch (error) {
      throw new Error(
        `Failed to find aggregates by specification: ${error.message}`,
      );
    }
  }

  /**
   * Count aggregates matching filter
   * @param {object} [filter] - Optional filter criteria
   * @returns {Promise<number>} Count of matching aggregates
   */
  async function count(filter = {}) {
    try {
      return await prismaModel.count({ where: filter });
    } catch (error) {
      throw new Error(`Failed to count aggregates: ${error.message}`);
    }
  }

  /**
   * Save aggregate
   * @param {T} aggregate - Aggregate to save
   * @returns {Promise<void>}
   */
  async function save(aggregate) {
    if (!aggregate) {
      throw new Error("Aggregate is required");
    }

    const id = aggregate[identity];
    if (id === undefined) {
      throw new Error(`Aggregate missing identity field: ${identity}`);
    }

    const data = serializeAggregate(aggregate);

    try {
      // Check if aggregate exists
      const exists = await prismaModel.findUnique({
        where: { [identity]: id },
        select: { [identity]: true },
      });

      if (exists) {
        // Update existing aggregate
        await prismaModel.update({
          where: { [identity]: id },
          data,
        });
      } else {
        // Create new aggregate
        await prismaModel.create({ data });
      }
    } catch (error) {
      throw new Error(`Failed to save aggregate: ${error.message}`);
    }
  }

  /**
   * Save multiple aggregates
   * @param {T[]} aggregates - Aggregates to save
   * @returns {Promise<void>}
   */
  async function saveAll(aggregates) {
    if (!Array.isArray(aggregates) || aggregates.length === 0) {
      return;
    }

    try {
      // Use Prisma transaction for atomic operation
      await prisma.$transaction(async (tx) => {
        for (const aggregate of aggregates) {
          const id = aggregate[identity];
          if (id === undefined) {
            throw new Error(`Aggregate missing identity field: ${identity}`);
          }

          const data = serializeAggregate(aggregate);

          // Check if aggregate exists
          const exists = await tx[model].findUnique({
            where: { [identity]: id },
            select: { [identity]: true },
          });

          if (exists) {
            // Update existing aggregate
            await tx[model].update({
              where: { [identity]: id },
              data,
            });
          } else {
            // Create new aggregate
            await tx[model].create({ data });
          }
        }
      });
    } catch (error) {
      throw new Error(`Failed to save multiple aggregates: ${error.message}`);
    }
  }

  /**
   * Delete aggregate by ID
   * @param {string} id - Aggregate ID
   * @returns {Promise<void>}
   */
  async function deleteById(id) {
    try {
      await prismaModel.delete({
        where: { [identity]: id },
      });
    } catch (error) {
      // If the aggregate doesn't exist, that's ok
      if (error.code === "P2025") {
        return;
      }
      throw new Error(`Failed to delete aggregate: ${error.message}`);
    }
  }

  // Return the adapter interface
  return {
    findById,
    findByIds,
    findAll,
    findBySpecification,
    count,
    save,
    saveAll,
    delete: deleteById,
  };
}
