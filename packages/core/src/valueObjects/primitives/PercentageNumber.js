import {Number} from "./Number.js";

/**
 * Creates a PercentageNumber value object that ensures values are between 0 and 1
 * @returns {import('../Base.js').ValueObjectFactory<number>} Factory for percentage numbers
 */
export const PercentageNumber = Number.extend({
    name: 'PercentageNumber',
    schema: (baseSchema) => baseSchema.min(0).max(1),
    methods: {
        /**
         * Formats this percentage with a specified number of decimal places
         * @param {number} [decimals=0] - Number of decimal places
         * @param {string} [locale='en-US'] - Locale to use for formatting
         * @returns {string} Formatted percentage string
         */
        format(decimals = 0, locale = 'en-US') {
            return this.toPercentage(locale, decimals);
        }
    }
});
