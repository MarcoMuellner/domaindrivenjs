import { NumberValue } from "./Number.js";
import { z } from "zod";

/**
 * Creates a NonNegativeNumber value object that ensures values are greater than or equal to zero
 * @returns {import('../Base.js').ValueObjectFactory<number>} Factory for non-negative numbers
 */
export const NonNegativeNumber = NumberValue.extend({
  name: "NonNegativeNumber",
  schema: (baseSchema) => /** @type {z.ZodNumber} */(baseSchema).nonnegative(),
  methods: {},
});
