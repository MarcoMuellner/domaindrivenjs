import { NumberValue } from "./Number.js";
import { z } from "zod";

/**
 * Creates an IntegerNumber value object that ensures values are integers
 * @returns {import('../Base.js').ValueObjectFactory<number>} Factory for integer numbers
 */
export const IntegerNumber = NumberValue.extend({
  name: "IntegerNumber",
  schema: (baseSchema) => /** @type {z.ZodNumber} */(baseSchema).int(),
  methodsFactory: (factory) => ({}),
});
