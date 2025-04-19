import { Specification } from "./Base";

/**
 * Creates a specification that checks if an object's property equals a specific value
 */
export function propertyEquals<T>(
  /**
   * The name of the property to check
   */
  propertyName: string,
  
  /**
   * The expected value of the property
   */
  expectedValue: unknown,
  
  /**
   * Optional custom name for the specification
   */
  specName?: string
): Specification<T>;

/**
 * Creates a specification that checks if an object's property contains a specific value
 */
export function propertyContains<T>(
  /**
   * The name of the property to check
   */
  propertyName: string,
  
  /**
   * The value to check for
   */
  value: unknown,
  
  /**
   * Optional custom name for the specification
   */
  specName?: string
): Specification<T>;

/**
 * Creates a specification that checks if an object's property matches a regular expression
 */
export function propertyMatches<T>(
  /**
   * The name of the property to check
   */
  propertyName: string,
  
  /**
   * The regular expression to match against
   */
  pattern: RegExp,
  
  /**
   * Optional custom name for the specification
   */
  specName?: string
): Specification<T>;

/**
 * Creates a specification that checks if an object's property is greater than a specific value
 */
export function propertyGreaterThan<T>(
  /**
   * The name of the property to check
   */
  propertyName: string,
  
  /**
   * The value to compare against
   */
  value: number,
  
  /**
   * Optional custom name for the specification
   */
  specName?: string
): Specification<T>;

/**
 * Creates a specification that checks if an object's property is less than a specific value
 */
export function propertyLessThan<T>(
  /**
   * The name of the property to check
   */
  propertyName: string,
  
  /**
   * The value to compare against
   */
  value: number,
  
  /**
   * Optional custom name for the specification
   */
  specName?: string
): Specification<T>;

/**
 * Creates a specification that checks if an object's property is between min and max values
 */
export function propertyBetween<T>(
  /**
   * The name of the property to check
   */
  propertyName: string,
  
  /**
   * The minimum value (inclusive)
   */
  min: number,
  
  /**
   * The maximum value (inclusive)
   */
  max: number,
  
  /**
   * Optional custom name for the specification
   */
  specName?: string
): Specification<T>;

/**
 * Creates a specification that checks if an object's property is in a set of values
 */
export function propertyIn<T>(
  /**
   * The name of the property to check
   */
  propertyName: string,
  
  /**
   * The array of possible values
   */
  values: unknown[],
  
  /**
   * Optional custom name for the specification
   */
  specName?: string
): Specification<T>;

/**
 * Creates a specification that checks if an object's property is null or undefined
 */
export function propertyIsNull<T>(
  /**
   * The name of the property to check
   */
  propertyName: string,
  
  /**
   * Optional custom name for the specification
   */
  specName?: string
): Specification<T>;

/**
 * Creates a specification that checks if an object's property is not null or undefined
 */
export function propertyIsNotNull<T>(
  /**
   * The name of the property to check
   */
  propertyName: string,
  
  /**
   * Optional custom name for the specification
   */
  specName?: string
): Specification<T>;

/**
 * Creates a specification that always returns true
 */
export function alwaysTrue<T>(): Specification<T>;

/**
 * Creates a specification that always returns false
 */
export function alwaysFalse<T>(): Specification<T>;

/**
 * Creates a parameterized specification for reuse with different values
 */
export function parameterizedSpecification<T, P>(options: {
  /**
   * Base name of the specification
   */
  name: string | ((params: P) => string);
  
  /**
   * Function that creates a predicate based on parameters
   */
  createPredicate: (params: P) => (candidate: T) => boolean;
  
  /**
   * Function that creates a query based on parameters
   */
  createQuery?: (params: P) => () => Record<string, unknown>;
}): (params: P) => Specification<T>;