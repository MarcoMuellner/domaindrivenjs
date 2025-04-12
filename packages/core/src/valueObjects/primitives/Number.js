import { z } from 'zod';
import { valueObject } from '../Base.js';

/**
 * Number value object represents a numeric value with validation and operations
 *
 * Use cases:
 * - General numeric values
 * - Measurements and quantities
 * - Calculations and transformations
 * - Basis for specialized number types via extension
 *
 * Features:
 * - Immutable numeric wrapper with validation
 * - Mathematical operations that return new instances
 * - Formatting and conversion utilities
 * - Extensible for specialized number types
 *
 * @example
 * const num = NumberValue.create(42);
 * const doubled = num.multiply(2);
 * const rounded = NumberValue.create(3.14159).round(2); // 3.14
 *
 * // Create a positive number type via extension
 * const PositiveNumber = NumberValue.extend({
 *   name: 'PositiveNumber',
 *   schema: (baseSchema) => baseSchema.positive()
 * });
 *
 * @typedef {import('../Base.js').ValueObject<number>} NumberValueType
 */
export const Number = valueObject({
    name: 'Number',
    schema: z.number(),
    methods: {
        /**
         * Adds a value to this number
         * @param {number} value - Value to add
         * @returns {NumberValueType} New instance with result
         */
        add(value) {
            return /** @type {NumberValueType} */ (Number.create(this + value));
        },

        /**
         * Subtracts a value from this number
         * @param {number} value - Value to subtract
         * @returns {NumberValueType} New instance with result
         */
        subtract(value) {
            return /** @type {NumberValueType} */ (Number.create(this - value));
        },

        /**
         * Multiplies this number by a factor
         * @param {number} factor - Multiplication factor
         * @returns {NumberValueType} New instance with result
         */
        multiply(factor) {
            return /** @type {NumberValueType} */ (Number.create(this * factor));
        },

        /**
         * Divides this number by a divisor
         * @param {number} divisor - Value to divide by
         * @returns {NumberValueType} New instance with result
         * @throws {Error} If divisor is zero
         */
        divide(divisor) {
            if (divisor === 0) {
                throw new Error('Cannot divide by zero');
            }
            return /** @type {NumberValueType} */ (Number.create(this / divisor));
        },

        /**
         * Increments the value by the specified amount (defaults to 1)
         * @param {number} [amount=1] - Amount to increment by
         * @returns {NumberValueType} New instance with incremented value
         */
        increment(amount = 1) {
            return /** @type {NumberValueType} */ (Number.create(this + amount));
        },

        /**
         * Decrements the value by the specified amount (defaults to 1)
         * @param {number} [amount=1] - Amount to decrement by
         * @returns {NumberValueType} New instance with decremented value
         */
        decrement(amount = 1) {
            return /** @type {NumberValueType} */ (Number.create(this - amount));
        },

        /**
         * Rounds this value to specified decimal places
         * @param {number} [decimals=0] - Number of decimal places
         * @returns {NumberValueType} New instance with rounded value
         */
        round(decimals = 0) {
            const factor = Math.pow(10, decimals);
            return /** @type {NumberValueType} */ (Number.create(
                Math.round(this * factor) / factor
            ));
        },

        /**
         * Floors this value to the nearest integer or specified decimal place
         * @param {number} [decimals=0] - Number of decimal places
         * @returns {NumberValueType} New instance with floored value
         */
        floor(decimals = 0) {
            const factor = Math.pow(10, decimals);
            return /** @type {NumberValueType} */ (Number.create(
                Math.floor(this * factor) / factor
            ));
        },

        /**
         * Ceils this value to the nearest integer or specified decimal place
         * @param {number} [decimals=0] - Number of decimal places
         * @returns {NumberValueType} New instance with ceiled value
         */
        ceil(decimals = 0) {
            const factor = Math.pow(10, decimals);
            return /** @type {NumberValueType} */ (Number.create(
                Math.ceil(this * factor) / factor
            ));
        },

        /**
         * Checks if this number is zero
         * @returns {boolean} True if value is zero
         */
        isZero() {
            return this === 0;
        },

        /**
         * Checks if this number is positive (greater than zero)
         * @returns {boolean} True if value is positive
         */
        isPositive() {
            return this > 0;
        },

        /**
         * Checks if this number is negative (less than zero)
         * @returns {boolean} True if value is negative
         */
        isNegative() {
            return this < 0;
        },

        /**
         * Checks if this number is an integer
         * @returns {boolean} True if value is an integer
         */
        isInteger() {
            return Number.isInteger(this);
        },

        /**
         * Returns the absolute value of this number
         * @returns {NumberValueType} New instance with absolute value
         */
        abs() {
            return /** @type {NumberValueType} */ (Number.create(Math.abs(this)));
        },

        /**
         * Calculates the power of this number
         * @param {number} exponent - Power to raise to
         * @returns {NumberValueType} New instance with result
         */
        pow(exponent) {
            return /** @type {NumberValueType} */ (Number.create(Math.pow(this, exponent)));
        },

        /**
         * Calculates the square root of this number
         * @returns {NumberValueType} New instance with result
         * @throws {Error} If this number is negative
         */
        sqrt() {
            if (this < 0) {
                throw new Error('Cannot calculate square root of negative number');
            }
            return /** @type {NumberValueType} */ (Number.create(Math.sqrt(this)));
        },

        /**
         * Converts the number to a formatted string
         * @param {string} [locale='en-US'] - Locale to use for formatting
         * @param {Intl.NumberFormatOptions} [options] - Number formatting options
         * @returns {string} Formatted number string
         */
        format(locale = 'en-US', options = {}) {
            return new Intl.NumberFormat(locale, options).format(this);
        },

        /**
         * Formats the number as a percentage
         * @param {string} [locale='en-US'] - Locale to use for formatting
         * @param {number} [decimals=0] - Number of decimal places
         * @returns {string} Formatted percentage string
         */
        toPercentage(locale = 'en-US', decimals = 0) {
            return new Intl.NumberFormat(locale, {
                style: 'percent',
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }).format(this);
        },

        /**
         * Formats the number as currency
         * @param {string} currency - Currency code (e.g. 'USD', 'EUR')
         * @param {string} [locale='en-US'] - Locale to use for formatting
         * @returns {string} Formatted currency string
         */
        toCurrency(currency, locale = 'en-US') {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency
            }).format(this);
        }
    }
});
