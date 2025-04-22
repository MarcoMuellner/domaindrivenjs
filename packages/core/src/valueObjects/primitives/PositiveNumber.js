import { NumberValue } from "./Number.js";
import { z } from "zod";

/**
 * Creates a PositiveNumber value object that ensures values are greater than zero
 * @returns {import('../Base.js').ValueObjectFactory<number>} Factory for positive numbers
 */
export const PositiveNumber = NumberValue.extend({
  name: "PositiveNumber",
  schema: (baseSchema) => /** @type {z.ZodNumber} */(baseSchema).positive(),
  methodsFactory: (factory) => ({}),
});
