import { z } from 'zod';
import { valueObject } from '../Base.js';

/**
 * StringValue represents a string with validation and common operations
 *
 * Use cases:
 * - General text values
 * - Text manipulation and formatting
 * - Basis for specialized string types via extension
 *
 * Features:
 * - Immutable string wrapper with validation
 * - Common string manipulation methods
 * - Extensible for specialized string types
 *
 * @example
 * const str = StringValue.create("Hello World");
 * const lower = str.toLower();
 * const truncated = str.truncate(5); // "Hello..."
 *
 * // Create a specialized string type via extension
 * const Email = StringValue.extend({
 *   name: 'Email',
 *   schema: (baseSchema) => baseSchema.email().toLowerCase()
 * });
 *
 * @typedef {import('../Base.js').ValueObject<string>} StringValueType
 */
export const String = valueObject({
    name: 'String',
    schema: z.string(),
    methods: {
        /**
         * Checks if string contains a substring
         * @param {string} substring - The substring to check for
         * @returns {boolean} True if substring is present
         */
        contains(substring) {
            return this.indexOf(substring) !== -1;
        },

        /**
         * Truncates the string if it exceeds max length
         * @param {number} maxLength - Maximum length before truncation
         * @param {string} [suffix='...'] - String to append after truncation
         * @returns {StringValueType} New truncated instance
         */
        truncate(maxLength, suffix = '...') {
            if (this.length <= maxLength) {
                return /** @type {StringValueType} */ (String.create(this.toString()));
            }
            return /** @type {StringValueType} */ (String.create(
                this.substring(0, maxLength - suffix.length) + suffix
            ));
        },

        /**
         * Converts string to lowercase
         * @returns {StringValueType} New lowercase instance
         */
        toLower() {
            return /** @type {StringValueType} */ (String.create(this.toLowerCase()));
        },

        /**
         * Converts string to uppercase
         * @returns {StringValueType} New uppercase instance
         */
        toUpper() {
            return /** @type {StringValueType} */ (String.create(this.toUpperCase()));
        },

        /**
         * Capitalizes the first letter of the string
         * @returns {StringValueType} New capitalized instance
         */
        capitalize() {
            return /** @type {StringValueType} */ (String.create(
                this.charAt(0).toUpperCase() + this.slice(1)
            ));
        },

        /**
         * Trims whitespace from both ends of the string
         * @returns {StringValueType} New trimmed instance
         */
        trim() {
            return /** @type {StringValueType} */ (String.create(this.toString().trim()));
        },

        /**
         * Replaces occurrences of a substring with a replacement
         * @param {string|RegExp} searchValue - String or pattern to replace
         * @param {string} replaceValue - Replacement string
         * @returns {StringValueType} New instance with replacements
         */
        replace(searchValue, replaceValue) {
            return /** @type {StringValueType} */ (String.create(
                this.toString().replace(searchValue, replaceValue)
            ));
        },

        /**
         * Splits the string by a separator
         * @param {string|RegExp} separator - String or pattern to split by
         * @returns {string[]} Array of substrings
         */
        split(separator) {
            return this.toString().split(separator);
        },

        /**
         * Checks if string starts with a substring
         * @param {string} substring - The substring to check
         * @returns {boolean} True if string starts with substring
         */
        startsWith(substring) {
            return this.toString().startsWith(substring);
        },

        /**
         * Checks if string ends with a substring
         * @param {string} substring - The substring to check
         * @returns {boolean} True if string ends with substring
         */
        endsWith(substring) {
            return this.toString().endsWith(substring);
        },

        /**
         * Pads the string to a target length
         * @param {number} length - Target length
         * @param {string} [padString=' '] - String to pad with
         * @returns {StringValueType} New padded instance
         */
        pad(length, padString = ' ') {
            const str = this.toString();
            if (str.length >= length) {
                return /** @type {StringValueType} */ (String.create(str));
            }

            const padLeft = Math.floor((length - str.length) / 2);
            const padRight = length - str.length - padLeft;

            return /** @type {StringValueType} */ (String.create(
                padString.repeat(padLeft) + str + padString.repeat(padRight)
            ));
        },

        /**
         * Pads the string from the start to a target length
         * @param {number} length - Target length
         * @param {string} [padString=' '] - String to pad with
         * @returns {StringValueType} New padded instance
         */
        padStart(length, padString = ' ') {
            return /** @type {StringValueType} */ (String.create(
                this.toString().padStart(length, padString)
            ));
        },

        /**
         * Pads the string from the end to a target length
         * @param {number} length - Target length
         * @param {string} [padString=' '] - String to pad with
         * @returns {StringValueType} New padded instance
         */
        padEnd(length, padString = ' ') {
            return /** @type {StringValueType} */ (String.create(
                this.toString().padEnd(length, padString)
            ));
        },

        /**
         * Checks if string matches a regular expression
         * @param {RegExp} pattern - Regular expression to match
         * @returns {boolean} True if string matches pattern
         */
        matches(pattern) {
            return pattern.test(this.toString());
        },

        /**
         * Checks if string is empty
         * @returns {boolean} True if string is empty
         */
        isEmpty() {
            return this.length === 0;
        },

        /**
         * Returns a substring of this string
         * @param {number} start - Start index
         * @param {number} [end] - End index (optional)
         * @returns {StringValueType} New substring instance
         */
        substring(start, end) {
            return /** @type {StringValueType} */ (String.create(
                this.toString().substring(start, end)
            ));
        }
    }
});
