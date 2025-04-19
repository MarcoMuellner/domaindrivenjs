import { DomainError } from "./DomainError";

/**
 * Error thrown when repository operations fail
 */
export class RepositoryError extends DomainError {
  constructor(
    message: string,
    cause?: Error,
    context?: Record<string, unknown>
  );
  
  /**
   * Additional context about the repository error
   */
  context: Record<string, unknown>;
}