import {String} from "./String.js";

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
    name: 'NonEmptyString',
    schema: (baseSchema) => baseSchema.trim().min(1),
    methods: {}
});
