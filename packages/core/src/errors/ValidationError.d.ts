import { DomainError } from "./DomainError";

/**
 * Error thrown when validation fails
 */
export class ValidationError extends DomainError {
  constructor(
    message: string,
    cause?: Error,
    context?: Record<string, unknown>
  );
  
  /**
   * Additional context about the validation error
   */
  context: Record<string, unknown>;
}