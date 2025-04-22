import { NumberValue } from "./Number.js";
import { z } from "zod";

/**
 * Creates a PercentageNumber value object that ensures values are between 0 and 1
 * @returns {import('../Base.js').ValueObjectFactory<number>} Factory for percentage numbers
 */
export const PercentageNumber = NumberValue.extend({
  name: "PercentageNumber",
  schema: (baseSchema) => /** @type {z.ZodNumber} */(baseSchema).min(0).max(1),
  methodsFactory: (factory) => ({
    /**
     * Formats this percentage with a specified number of decimal places
     * @param {number} [decimals=0] - Number of decimal places
     * @param {string} [locale='en-US'] - Locale to use for formatting
     * @returns {string} Formatted percentage string
     */
    format(decimals = 0, locale = "en-US") {
      const value = Number(this.valueOf());
      return new Intl.NumberFormat(locale, {
        style: "percent",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
    },
  }),
});