/**
 * Base error class for domain-specific errors
 */
export class DomainError extends Error {
  constructor(
    message: string,
    cause?: Error
  );
  
  /**
   * The cause of this error
   */
  cause?: Error;
}