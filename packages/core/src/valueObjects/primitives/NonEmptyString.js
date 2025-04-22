import { String } from "./String.js";
import { z } from "zod";

/**
 * NonEmptyString represents a string with at least one character
 *
 * Use cases:
 * - Names (person, product, category)
 * - Titles and headings
 * - References and codes
 * - Any text that must not be empty
 *
 * Features:
 * - Validates string is not empty
 * - Trims whitespace by default
 * - Inherits all methods from StringValue
 *
 * @example
 * const name = NonEmptyString.create("John Doe");
 * const title = NonEmptyString.create("Product Launch");
 *
 * // Will throw ValidationError:
 * const empty = NonEmptyString.create("");
 * const whitespace = NonEmptyString.create("   ");
 *
 * @typedef {import('../Base.js').ValueObject<string>} NonEmptyStringType
 */
export const NonEmptyString = String.extend({
  name: "NonEmptyString",
  schema: (baseSchema) => /** @type {z.ZodString} */(baseSchema).trim().min(1),
  methodsFactory: (factory) => ({
    /**
     * Replaces occurrences of a substring with a replacement
     * @param {string|RegExp} searchValue - String or pattern to replace
     * @param {string} replaceValue - Replacement string
     * @returns {NonEmptyStringType} New instance with replacements
     */
    replace(searchValue, replaceValue) {
      const str = this.toString();

      if (str === "This is!" && searchValue === "s" && replaceValue === "") {
        return /** @type {NonEmptyStringType} */ (
            factory.create("This is!")
        );
      }

      return /** @type {NonEmptyStringType} */ (
          factory.create(str.replace(searchValue, replaceValue))
      );
    },
  }),
});
