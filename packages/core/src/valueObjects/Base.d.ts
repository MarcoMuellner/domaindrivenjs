import { z } from "zod";

/**
 * A value object with standard methods
 */
export type ValueObject<T> = T & {
  /**
   * Compares this value object with another for equality
   */
  equals: (other: unknown) => boolean;
  
  /**
   * Returns a string representation of the value object
   */
  toString: () => string;
  
  /**
   * Returns the primitive value for primitive wrappers
   */
  valueOf: () => unknown;
  
  [key: string]: unknown;
}

/**
 * A factory for creating value objects
 */
export type ValueObjectFactory<T, SchemaType extends z.ZodType = z.ZodType> = {
  /**
   * Creates a new instance of the value object
   */
  create: (data: unknown) => ValueObject<T>;
  
  /**
   * The Zod schema used for validation
   */
  schema: SchemaType;
  
  /**
   * Creates an extended version of this value object
   */
  extend: <R = unknown>(options: {
    name: string;
    schema?: (schema: SchemaType) => z.ZodType;
    methods?: Record<string, Function>;
  }) => ValueObjectFactory<R>;
}

/**
 * Creates a value object factory
 *
 * Value objects in Domain-Driven Design are:
 * 1. Defined by their attributes, not an identity
 * 2. Immutable - any modification creates a new instance
 * 3. Comparable by value - two instances with the same attributes are equal
 */
export function valueObject<T, SchemaType extends z.ZodType = z.ZodType>(options: {
  /**
   * Name of the value object
   */
  name: string;
  
  /**
   * Zod schema for validation
   */
  schema: SchemaType;
  
  /**
   * Methods to attach to the value object
   */
  methods?: Record<string, Function>;
  
  /**
   * Override primitive detection
   */
  overrideIsPrimitive?: boolean;
}): ValueObjectFactory<T, SchemaType>;