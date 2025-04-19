import { DomainError } from "./DomainError";

/**
 * Error thrown when domain service operations fail
 */
export class DomainServiceError extends DomainError {
  constructor(
    message: string,
    cause?: Error,
    context?: Record<string, unknown>
  );
  
  /**
   * Additional context about the domain service error
   */
  context: Record<string, unknown>;
}