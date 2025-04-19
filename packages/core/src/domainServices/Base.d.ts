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
   * Operations this service provides
   */
  operations: O;
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
     * Additional operations
     */
    operations?: Partial<NewO>;
  }) => ReturnType<typeof domainService<D & NewD, O & NewO>>;
};