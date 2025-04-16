// packages/core/src/specifications/Common.js
import { specification } from "./Base.js";

/**
 * Creates a specification that checks if an object's property equals a specific value
 *
 * @template T
 * @param {string} propertyName - The name of the property to check
 * @param {any} expectedValue - The expected value of the property
 * @param {string} [specName] - Optional custom name for the specification
 * @returns {import('./Base.js').Specification<T>} A property equals specification
 */
export function propertyEquals(propertyName, expectedValue, specName) {
  return specification({
    name: specName || `Property ${propertyName} Equals ${expectedValue}`,

    isSatisfiedBy(obj) {
      if (obj === null || obj === undefined) return false;

      return obj && obj[propertyName] === expectedValue;
    },

    toQuery() {
      return { [propertyName]: expectedValue };
    },
  });
}

/**
 * Creates a specification that checks if an object's property contains a specific value
 *
 * @template T
 * @param {string} propertyName - The name of the property to check
 * @param {any} value - The value to check for
 * @param {string} [specName] - Optional custom name for the specification
 * @returns {import('./Base.js').Specification<T>} A property contains specification
 */
export function propertyContains(propertyName, value, specName) {
  return specification({
    name: specName || `Property ${propertyName} Contains ${value}`,

    isSatisfiedBy(obj) {
      if (!obj || !obj[propertyName]) return false;

      const prop = obj[propertyName];

      // Handle arrays
      if (Array.isArray(prop)) {
        return prop.includes(value);
      }

      // Handle strings
      if (typeof prop === "string") {
        return prop.includes(value);
      }

      return false;
    },

    toQuery() {
      return { [propertyName]: { $regex: value, $options: "i" } };
    },
  });
}

/**
 * Creates a specification that checks if an object's property matches a regular expression
 *
 * @template T
 * @param {string} propertyName - The name of the property to check
 * @param {RegExp} pattern - The regular expression to match against
 * @param {string} [specName] - Optional custom name for the specification
 * @returns {import('./Base.js').Specification<T>} A property matches regex specification
 */
export function propertyMatches(propertyName, pattern, specName) {
  return specification({
    name: specName || `Property ${propertyName} Matches ${pattern}`,

    isSatisfiedBy(obj) {
      if (!obj || !obj[propertyName] || typeof obj[propertyName] !== "string")
        return false;

      return pattern.test(obj[propertyName]);
    },

    toQuery() {
      // Extract the pattern and flags
      const patternStr = pattern.toString();
      const patternMatch = patternStr.match(/\/(.*)\/([gimuy]*)$/);

      if (patternMatch) {
        const [, regexBody, flags] = patternMatch;
        return { [propertyName]: { $regex: regexBody, $options: flags } };
      }

      // Fallback - may not be accurate for all databases
      return { [propertyName]: { $regex: pattern } };
    },
  });
}

/**
 * Creates a specification that checks if an object's property is greater than a specific value
 *
 * @template T
 * @param {string} propertyName - The name of the property to check
 * @param {number} value - The value to compare against
 * @param {string} [specName] - Optional custom name for the specification
 * @returns {import('./Base.js').Specification<T>} A property greater than specification
 */
export function propertyGreaterThan(propertyName, value, specName) {
  return specification({
    name: specName || `Property ${propertyName} > ${value}`,

    isSatisfiedBy(obj) {
      if (!obj || obj[propertyName] === undefined) return false;

      return obj[propertyName] > value;
    },

    toQuery() {
      return { [propertyName]: { $gt: value } };
    },
  });
}

/**
 * Creates a specification that checks if an object's property is less than a specific value
 *
 * @template T
 * @param {string} propertyName - The name of the property to check
 * @param {number} value - The value to compare against
 * @param {string} [specName] - Optional custom name for the specification
 * @returns {import('./Base.js').Specification<T>} A property less than specification
 */
export function propertyLessThan(propertyName, value, specName) {
  return specification({
    name: specName || `Property ${propertyName} < ${value}`,

    isSatisfiedBy(obj) {
      if (!obj || obj[propertyName] === undefined) return false;

      return obj[propertyName] < value;
    },

    toQuery() {
      return { [propertyName]: { $lt: value } };
    },
  });
}

/**
 * Creates a specification that checks if an object's property is between min and max values
 *
 * @template T
 * @param {string} propertyName - The name of the property to check
 * @param {number} min - The minimum value (inclusive)
 * @param {number} max - The maximum value (inclusive)
 * @param {string} [specName] - Optional custom name for the specification
 * @returns {import('./Base.js').Specification<T>} A property between specification
 */
export function propertyBetween(propertyName, min, max, specName) {
  return specification({
    name: specName || `Property ${propertyName} Between ${min} and ${max}`,

    isSatisfiedBy(obj) {
      if (!obj || obj[propertyName] === undefined) return false;

      const value = obj[propertyName];
      return value >= min && value <= max;
    },

    toQuery() {
      return {
        [propertyName]: {
          $gte: min,
          $lte: max,
        },
      };
    },
  });
}

/**
 * Creates a specification that checks if an object's property is in a set of values
 *
 * @template T
 * @param {string} propertyName - The name of the property to check
 * @param {any[]} values - The array of possible values
 * @param {string} [specName] - Optional custom name for the specification
 * @returns {import('./Base.js').Specification<T>} A property in specification
 */
export function propertyIn(propertyName, values, specName) {
  return specification({
    name: specName || `Property ${propertyName} In [${values.join(", ")}]`,

    isSatisfiedBy(obj) {
      if (!obj || obj[propertyName] === undefined) return false;

      return values.includes(obj[propertyName]);
    },

    toQuery() {
      return { [propertyName]: { $in: values } };
    },
  });
}

/**
 * Creates a specification that checks if an object's property is null or undefined
 *
 * @template T
 * @param {string} propertyName - The name of the property to check
 * @param {string} [specName] - Optional custom name for the specification
 * @returns {import('./Base.js').Specification<T>} A property is null specification
 */
export function propertyIsNull(propertyName, specName) {
  return specification({
    name: specName || `Property ${propertyName} Is Null`,

    isSatisfiedBy(obj) {
      if (!obj) return false;

      return obj[propertyName] === null || obj[propertyName] === undefined;
    },

    toQuery() {
      return {
        $or: [{ [propertyName]: null }, { [propertyName]: { $exists: false } }],
      };
    },
  });
}

/**
 * Creates a specification that checks if an object's property is not null or undefined
 *
 * @template T
 * @param {string} propertyName - The name of the property to check
 * @param {string} [specName] - Optional custom name for the specification
 * @returns {import('./Base.js').Specification<T>} A property is not null specification
 */
export function propertyIsNotNull(propertyName, specName) {
  return specification({
    name: specName || `Property ${propertyName} Is Not Null`,

    isSatisfiedBy(obj) {
      if (!obj) return false;

      return obj[propertyName] !== null && obj[propertyName] !== undefined;
    },

    toQuery() {
      return {
        [propertyName]: { $exists: true, $ne: null },
      };
    },
  });
}

/**
 * Creates a specification that always returns true
 * Useful as a default or placeholder
 *
 * @template T
 * @returns {import('./Base.js').Specification<T>} An always true specification
 */
export function alwaysTrue() {
  return specification({
    name: "Always True",

    isSatisfiedBy() {
      return true;
    },

    toQuery() {
      return {};
    },
  });
}

/**
 * Creates a specification that always returns false
 * Useful for testing or as a safety mechanism
 *
 * @template T
 * @returns {import('./Base.js').Specification<T>} An always false specification
 */
export function alwaysFalse() {
  return specification({
    name: "Always False",

    isSatisfiedBy() {
      return false;
    },

    toQuery() {
      return { $where: "false" };
    },
  });
}

/**
 * Creates a parameterized specification for reuse with different values
 *
 * @template T, P
 * @param {Object} options - Options for the parameterized specification
 * @param {string} options.name - Base name of the specification
 * @param {function(P): function(T): boolean} options.createPredicate - Function that creates a predicate based on parameters
 * @param {function(P): function(): Object} [options.createQuery] - Function that creates a query based on parameters
 * @returns {function(P): import('./Base.js').Specification<T>} A function that creates specifications with parameters
 */
export function parameterizedSpecification(options) {
  if (!options || !options.name || !options.createPredicate) {
    throw new Error(
      "Parameterized specification requires name and createPredicate function",
    );
  }

  return function (params) {
    const finalName =
      typeof options.name === "function" ? options.name(params) : options.name;

    const predicate = options.createPredicate(params);

    const specOptions = {
      name: finalName,
      isSatisfiedBy: predicate,
    };

    // Add toQuery if provided
    if (options.createQuery) {
      specOptions.toQuery = options.createQuery(params);
    }

    return specification(specOptions);
  };
}
