import { DomainError } from "./DomainError";

/**
 * Error thrown when an aggregate invariant is violated
 */
export class InvariantViolationError extends DomainError {
  constructor(
    message: string,
    invariantName: string,
    context?: Record<string, unknown>
  );
  
  /**
   * Name of the violated invariant
   */
  invariantName: string;
  
  /**
   * Additional context about the violation
   */
  context: Record<string, unknown>;
}