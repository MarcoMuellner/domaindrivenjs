import { z } from "zod";
import { valueObject } from "../Base.js";
import { randomUUID } from "crypto";

/**
 * Identifier represents a unique identifier value object
 *
 * Use cases:
 * - Entity identifiers
 * - Reference keys
 * - Database primary keys
 * - External system IDs
 *
 * Features:
 * - Validates that the identifier is not empty
 * - Provides utility methods for ID comparison and formatting
 * - Factory methods for common ID types (UUID, numeric, etc.)
 * - Support for validation against specific patterns
 *
 * @example
 * // Basic usage
 * const id = Identifier.create("user-123");
 *
 * // Using UUID factory
 * const UUIDType = Identifier.uuid();
 * const uuid = UUIDType.create("123e4567-e89b-12d3-a456-426614174000");
 *
 * // Generate a new UUID
 * const newId = Identifier.generateUUID();
 *
 * @typedef {import('../Base.js').ValueObject<string>} IdentifierType
 */
export const Identifier = valueObject({
  name: "Identifier",
  schema: z
    .string()
    .min(1)
    .trim()
    .refine((val) => val.length > 0, {
      message: "Identifier cannot be empty",
    }),
  methodsFactory: (factory) => ({
    /**
     * Checks if this identifier matches a specific pattern
     * @param {RegExp} pattern - Regular expression to match against
     * @returns {boolean} True if the identifier matches the pattern
     */
    matches(pattern) {
      return pattern.test(this.toString());
    },

    /**
     * Formats the identifier according to a pattern
     * @param {string} format - Format string where {id} will be replaced with the identifier
     * @returns {string} Formatted identifier
     *
     * @example
     * id.format("user_{id}") // returns "user_123"
     */
    format(format) {
      return format.replace("{id}", this.toString());
    },

    /**
     * Returns a prefixed version of this identifier
     * @param {string} prefix - Prefix to add
     * @returns {IdentifierType} New identifier with prefix
     */
    withPrefix(prefix) {
      return /** @type {IdentifierType} */ (
        factory.create(`${prefix}${this}`)
      );
    },

    /**
     * Returns a suffixed version of this identifier
     * @param {string} suffix - Suffix to add
     * @returns {IdentifierType} New identifier with suffix
     */
    withSuffix(suffix) {
      return /** @type {IdentifierType} */ (
        factory.create(`${this}${suffix}`)
      );
    },

    /**
     * Converts this identifier to a string -> overrides default toString
     * @returns {string} String representation of the identifier
     */
  }),
  overrideIsPrimitive: true,
});

/**
 * Creates a UUID-specific identifier value object
 * @returns {import('../Base.js').ValueObjectFactory<string>} A factory for UUID identifiers
 *
 * @typedef {import('../Base.js').ValueObject<string>} UUIDIdentifierType
 */
Identifier.uuid = function () {
  return valueObject({
    name: "UUIDIdentifier",
    schema: z.string().uuid(),
    methodsFactory: (factory) => ({
      /**
       * Gets the version of this UUID
       * @returns {number} The UUID version number
       */
      getVersion() {
        // Extract version from the UUID
        return parseInt(this.toString().charAt(14), 16);
      },

      /**
       * Converts UUID to a hyphen-free format
       * @returns {string} UUID without hyphens
       */
      toCompact() {
        return this.toString().replace(/-/g, "");
      },

      /**
       * Gets specific segments of the UUID
       * @param {number} index - Segment index (0-4)
       * @returns {string} The requested segment
       * @throws {Error} If index is out of range
       */
      getSegment(index) {
        const segments = this.toString().split("-");
        if (index < 0 || index >= segments.length) {
          throw new Error(
            `Segment index out of range (0-${segments.length - 1}): ${index}`,
          );
        }
        return segments[index];
      },
    }),
  });
};

/**
 * Creates a numeric identifier value object
 * @param {object} [options] - Options for the numeric identifier
 * @param {number} [options.min=1] - Minimum allowed value
 * @returns {import('../Base.js').ValueObjectFactory<number>} A factory for numeric identifiers
 *
 * @typedef {import('../Base.js').ValueObject<number>} NumericIdentifierType
 */
Identifier.numeric = function (options = {}) {
  const { min = 1 } = options;
  return valueObject({
    name: "NumericIdentifier",
    schema: z.number().int().min(min),
    methodsFactory: (factory) => ({
      /**
       * Returns the next sequential identifier
       * @returns {NumericIdentifierType} A new identifier with value incremented by 1
       */
      next() {
        // Use the factory to create the next value
        return factory.create(this.valueOf() + 1);
      },

      /**
       * Converts to string with optional padding
       * @param {number} [padLength] - Length to pad to with leading zeros
       * @returns {string} String representation, optionally padded
       */
      toString(padLength) {
        const value = this.valueOf();
        const str = String(value);
        if (padLength && str.length < padLength) {
          return "0".repeat(padLength - str.length) + str;
        }

        return str;
      },
    }),
  });
};

/**
 * Creates an identifier that must match a specific pattern
 * @param {RegExp} pattern - Regular expression pattern to validate against
 * @param {string} [name='PatternIdentifier'] - Name for this identifier type
 * @returns {import('../Base.js').ValueObjectFactory<string>} A factory for pattern-matching identifiers
 */
Identifier.pattern = function (pattern, name = "PatternIdentifier") {
  return valueObject({
    name,
    schema: z.string().regex(pattern),
    methodsFactory: (factory) => ({
      /**
       * Extracts parts of the identifier using capturing groups from the pattern
       * @param {RegExp} extractPattern - Pattern with capturing groups
       * @returns {string[]} Array of matched parts
       */
      extract(extractPattern) {
        const match = this.toString().match(extractPattern);
        return match ? match.slice(1) : [];
      },
    }),
  });
};

/**
 * Generates a new UUID v4 identifier
 * @returns {string} A new UUID string
 */
Identifier.generateUUID = function () {
  return randomUUID();
};
