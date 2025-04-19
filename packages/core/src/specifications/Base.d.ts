/**
 * Configuration options for creating a specification
 */
export type SpecificationOptions = {
  /**
   * The name of the specification
   */
  name: string;
  
  /**
   * Function that tests if an object satisfies the specification
   */
  isSatisfiedBy: (candidate: unknown) => boolean;
  
  /**
   * Optional function to convert specification to a query object
   */
  toQuery?: () => Record<string, unknown>;
}

/**
 * A specification that encapsulates a business rule
 */
export type Specification<T> = {
  /**
   * The name of the specification
   */
  name: string;
  
  /**
   * Tests if an object satisfies the specification
   */
  isSatisfiedBy: (candidate: T) => boolean;
  
  /**
   * Returns a new specification that is the logical AND of this and another
   */
  and: (other: Specification<T>) => Specification<T>;
  
  /**
   * Returns a new specification that is the logical OR of this and another
   */
  or: (other: Specification<T>) => Specification<T>;
  
  /**
   * Returns a new specification that is the logical NOT of this one
   */
  not: () => Specification<T>;
  
  /**
   * Converts specification to a query object for repositories
   */
  toQuery?: () => Record<string, unknown>;
}

/**
 * Creates a specification that encapsulates a business rule
 */
export function specification<T>(
  /**
   * Specification configuration
   */
  options: SpecificationOptions
): Specification<T>;