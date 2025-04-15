// packages/core/src/repositories/adapters/InMemory.js

/**
 * Creates an in-memory repository adapter
 *
 * @template T - Aggregate type
 * @param {object} options - Adapter configuration
 * @param {string} options.identity - Identity field of the aggregate
 * @param {T[]} [options.initialData=[]] - Initial data to populate the repository
 * @returns {import('../Base.js').RepositoryAdapter<T>} In-memory repository adapter
 */
export function createInMemoryAdapter({
                                          identity,
                                          initialData = []
                                      }) {
    if (!identity) {
        throw new Error('Identity field is required');
    }

    // The in-memory store - a Map keyed by the identity field value
    const store = new Map();

    // Initialize with any provided data
    if (initialData && initialData.length > 0) {
        for (const item of initialData) {
            const id = item[identity];
            if (id !== undefined) {
                // Make a deep copy to ensure isolation
                store.set(id, JSON.parse(JSON.stringify(item)));
            }
        }
    }

    /**
     * Find aggregate by ID
     * @param {string} id - Aggregate ID
     * @returns {Promise<T | null>} Aggregate or null if not found
     */
    async function findById(id) {
        const aggregate = store.get(id);
        if (!aggregate) {
            return null;
        }
        // Return a deep copy to prevent unintended modifications
        return JSON.parse(JSON.stringify(aggregate));
    }

    /**
     * Find multiple aggregates by their IDs
     * @param {string[]} ids - Array of aggregate IDs
     * @returns {Promise<Map<string, T>>} Map of IDs to aggregates
     */
    async function findByIds(ids) {
        const result = new Map();

        for (const id of ids) {
            const aggregate = store.get(id);
            if (aggregate) {
                // Return a deep copy to prevent unintended modifications
                result.set(id, JSON.parse(JSON.stringify(aggregate)));
            }
        }

        return result;
    }

    /**
     * Find all aggregates matching filter
     * @param {object} [filter] - Optional filter criteria
     * @returns {Promise<T[]>} Matching aggregates
     */
    async function findAll(filter = {}) {
        let result = Array.from(store.values());

        // Apply filtering if a filter is provided
        if (filter && Object.keys(filter).length > 0) {
            result = result.filter(aggregate => {
                for (const [key, value] of Object.entries(filter)) {
                    // Simple equality comparison
                    if (aggregate[key] !== value) {
                        return false;
                    }
                }
                return true;
            });
        }

        // Return deep copies to prevent unintended modifications
        return result.map(aggregate => JSON.parse(JSON.stringify(aggregate)));
    }

    /**
     * Find aggregates using a specification
     * @param {any} specification - The specification object or function
     * @returns {Promise<T[]>} Matching aggregates
     */
    async function findBySpecification(specification) {
        if (!specification) {
            throw new Error('Invalid specification: must have isSatisfiedBy method or be a function');
        }

        const allAggregates = Array.from(store.values());

        let result;
        if (typeof specification.isSatisfiedBy === 'function') {
            // Use specification object with isSatisfiedBy method
            result = allAggregates.filter(agg => specification.isSatisfiedBy(agg));
        } else if (typeof specification === 'function') {
            // Use specification as a predicate function
            result = allAggregates.filter(specification);
        } else {
            throw new Error('Invalid specification: must have isSatisfiedBy method or be a function');
        }

        // Return deep copies to prevent unintended modifications
        return result.map(aggregate => JSON.parse(JSON.stringify(aggregate)));
    }

    /**
     * Count aggregates matching filter
     * @param {object} [filter] - Optional filter criteria
     * @returns {Promise<number>} Count of matching aggregates
     */
    async function count(filter = {}) {
        // Leverage findAll but just return the count
        const results = await findAll(filter);
        return results.length;
    }

    /**
     * Save aggregate
     * @param {T} aggregate - Aggregate to save
     * @returns {Promise<void>}
     */
    async function save(aggregate) {
        if (!aggregate) {
            throw new Error('Aggregate is required');
        }

        const id = aggregate[identity];
        if (id === undefined) {
            throw new Error(`Aggregate missing identity field: ${identity}`);
        }

        // Store a deep copy to prevent unintended modifications
        store.set(id, JSON.parse(JSON.stringify(aggregate)));
    }

    /**
     * Save multiple aggregates
     * @param {T[]} aggregates - Aggregates to save
     * @returns {Promise<void>}
     */
    async function saveAll(aggregates) {
        if (!Array.isArray(aggregates)) {
            throw new Error('Aggregates must be an array');
        }

        for (const aggregate of aggregates) {
            await save(aggregate);
        }
    }

    /**
     * Delete aggregate by ID
     * @param {string} id - Aggregate ID
     * @returns {Promise<void>}
     */
    async function deleteById(id) {
        store.delete(id);
    }

    /**
     * Clears all data from the store
     * @returns {void}
     */
    function clear() {
        store.clear();
    }

    /**
     * Gets the count of aggregates in the store
     * @returns {number} Number of aggregates
     */
    function size() {
        return store.size;
    }

    // Return the adapter interface with additional testing methods
    return {
        findById,
        findByIds,
        findAll,
        findBySpecification,
        count,
        save,
        saveAll,
        delete: deleteById,
        // Additional methods for testing
        clear,
        size
    };
}
