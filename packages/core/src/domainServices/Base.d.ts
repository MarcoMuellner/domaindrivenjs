import { DomainError } from "../errors/DomainError";

/**
 * Error thrown when domain service operations fail
 */
export class DomainServiceError extends DomainError {
  constructor(
      message: string,
      cause?: Error,
      context?: Record<string, unknown>
  );

  context: Record<string, unknown>;
}

/**
 * Defines the structure of operations that will be bound to a domain service instance
 */
export type DomainServiceOperations<D> = Record<string, (this: { serviceName: string, dependencies: D }, ...args: any[]) => any>;

/**
 * Creates a domain service for encapsulating domain logic that doesn't belong to entities or value objects
 */
export function domainService<D = Record<string, unknown>, O = Record<string, Function>>(options: {
  /**
   * Name of the service
   */
  name: string;

  /**
   * Dependencies required by this service
   */
  dependencies?: D;

  /**
   * Method factory function that creates operations
   * @deprecated Use operationsFactory instead
   */
  methodsFactory?: (factory: any) => Record<string, Function>;

  /**
   * Factory function that creates operations that will be bound to the service instance
   * The `this` context inside these operations will be the service instance
   */
  operationsFactory: (factory: any) => DomainServiceOperations<D>;
}): {
  /**
   * Creates a new domain service instance with the provided dependencies
   */
  create: (injectedDependencies?: D) => {
    /**
     * Name of the service
     */
    serviceName: string;

    /**
     * Dependencies injected into the service
     */
    dependencies: D;
  } & O;

  /**
   * Name of the service
   */
  name: string;

  /**
   * Dependencies required by this service
   */
  dependencies: D;

  /**
   * Extends this domain service with additional operations
   */
  extend: <NewD = D, NewO = O>(options: {
    /**
     * The name of the extended service
     */
    name: string;

    /**
     * Additional dependencies
     */
    dependencies?: Partial<NewD>;

    /**
     * Method factory function that creates operations
     * @deprecated Use operationsFactory instead
     */
    methodsFactory?: (factory: any) => Record<string, Function>;

    /**
     * Factory function that creates operations that will be bound to the service instance
     * The `this` context inside these operations will be the service instance
     */
    operationsFactory: (factory: any) => DomainServiceOperations<D & NewD>;
  }) => ReturnType<typeof domainService<D & NewD, O & NewO>>;
};
