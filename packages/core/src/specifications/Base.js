// packages/core/src/specifications/Base.js

/**
 * @typedef {Object} SpecificationOptions
 * @property {string} name - The name of the specification
 * @property {function(any): boolean} isSatisfiedBy - Function that tests if an object satisfies the specification
 * @property {function(): Object} [toQuery] - Optional function to convert specification to a query object
 */

/**
 * @template T
 * @typedef {Object} Specification
 * @property {string} name - The name of the specification
 * @property {function(T): boolean} isSatisfiedBy - Tests if an object satisfies the specification
 * @property {function(Specification<T>): Specification<T>} and - Returns a new specification that is the logical AND of this and another
 * @property {function(Specification<T>): Specification<T>} or - Returns a new specification that is the logical OR of this and another
 * @property {function(): Specification<T>} not - Returns a new specification that is the logical NOT of this one
 * @property {function(): Object} [toQuery] - Converts specification to a query object for repositories
 */

/**
 * Creates a specification that encapsulates a business rule
 *
 * @template T - The type of object this specification applies to
 * @param {SpecificationOptions} options - Specification configuration
 * @returns {Specification<T>} A new specification object
 */
export function specification(options) {
  if (!options) {
    throw new Error("Specification options are required");
  }

  if (!options.name) {
    throw new Error("Specification name is required");
  }

  if (typeof options.isSatisfiedBy !== "function") {
    throw new Error("Specification must have an isSatisfiedBy function");
  }

  /**
   * The base specification object
   * @type {Specification<T>}
   */
  const spec = {
    name: options.name,

    /**
     * Tests if an object satisfies this specification
     * @param {T} candidate - The object to test
     * @returns {boolean} True if the candidate satisfies the specification
     */
    isSatisfiedBy(candidate) {
      return options.isSatisfiedBy(candidate);
    },

    /**
     * Creates a new specification that is the logical AND of this and another specification
     * @param {Specification<T>} other - The other specification
     * @returns {Specification<T>} A new composite specification
     */
    and(other) {
      return andSpecification(spec, other);
    },

    /**
     * Creates a new specification that is the logical OR of this and another specification
     * @param {Specification<T>} other - The other specification
     * @returns {Specification<T>} A new composite specification
     */
    or(other) {
      return orSpecification(spec, other);
    },

    /**
     * Creates a new specification that is the logical NOT of this specification
     * @returns {Specification<T>} A new composite specification
     */
    not() {
      return notSpecification(spec);
    },
  };

  // Add the toQuery method if provided
  if (typeof options.toQuery === "function") {
    spec.toQuery = options.toQuery;
  }

  return spec;
}

/**
 * Creates a new specification that is the logical AND of two specifications
 *
 * @template T
 * @param {Specification<T>} left - The first specification
 * @param {Specification<T>} right - The second specification
 * @returns {Specification<T>} A new composite specification
 */
function andSpecification(left, right) {
  return specification({
    name: `${left.name} AND ${right.name}`,

    isSatisfiedBy(candidate) {
      return left.isSatisfiedBy(candidate) && right.isSatisfiedBy(candidate);
    },

    toQuery: combineToQuery(left, right, combineQueries.and),
  });
}

/**
 * Creates a new specification that is the logical OR of two specifications
 *
 * @template T
 * @param {Specification<T>} left - The first specification
 * @param {Specification<T>} right - The second specification
 * @returns {Specification<T>} A new composite specification
 */
function orSpecification(left, right) {
  return specification({
    name: `${left.name} OR ${right.name}`,

    isSatisfiedBy(candidate) {
      return left.isSatisfiedBy(candidate) || right.isSatisfiedBy(candidate);
    },

    toQuery: combineToQuery(left, right, combineQueries.or),
  });
}

/**
 * Creates a new specification that is the logical NOT of a specification
 *
 * @template T
 * @param {Specification<T>} spec - The specification to negate
 * @returns {Specification<T>} A new composite specification
 */
function notSpecification(spec) {
  return specification({
    name: `NOT ${spec.name}`,

    isSatisfiedBy(candidate) {
      return !spec.isSatisfiedBy(candidate);
    },

    toQuery: negateQuery(spec),
  });
}

/**
 * Combines two specification queries based on a combiner function
 *
 * @param {Specification} left - The first specification
 * @param {Specification} right - The second specification
 * @param {function(Object, Object): Object} queryCombiner - Function to combine queries
 * @returns {function(): Object|undefined} A function that returns the combined query or undefined
 */
function combineToQuery(left, right, queryCombiner) {
  // Only return a toQuery function if both specifications have one
  if (
    typeof left.toQuery !== "function" ||
    typeof right.toQuery !== "function"
  ) {
    return undefined;
  }

  return function () {
    return queryCombiner(left.toQuery(), right.toQuery());
  };
}

/**
 * Creates a negated query function for a specification
 *
 * @param {Specification} spec - The specification to negate
 * @returns {function(): Object|undefined} A function that returns the negated query or undefined
 */
function negateQuery(spec) {
  // Only return a toQuery function if the specification has one
  if (typeof spec.toQuery !== "function") {
    return undefined;
  }

  return function () {
    return { $not: spec.toQuery() };
  };
}

/**
 * Query combiners for different database adapters
 */
const combineQueries = {
  /**
   * Combines two queries with a logical AND
   * @param {Object} left - First query
   * @param {Object} right - Second query
   * @returns {Object} Combined query
   */
  and(left, right) {
    return { $and: [left, right] };
  },

  /**
   * Combines two queries with a logical OR
   * @param {Object} left - First query
   * @param {Object} right - Second query
   * @returns {Object} Combined query
   */
  or(left, right) {
    return { $or: [left, right] };
  },
};
