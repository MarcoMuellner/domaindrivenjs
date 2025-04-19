import { z } from "zod";

/**
 * Creates a Zod schema for validating value objects
 */
export function valueObjectSchema<VOType>(options?: {
  /**
   * Name of the expected value object type
   */
  typeName?: string;
  
  /**
   * Custom function to validate the type
   */
  typeCheck?: (val: unknown) => boolean;
}): z.ZodType<VOType>;

/**
 * Creates a Zod schema for validating specific value object types
 */
export function specificValueObjectSchema<VOFactory>(
  /**
   * The value object factory
   */
  valueObjectFactory: VOFactory
): z.ZodType;