import { DomainError } from "./DomainError.js";

/**
 * Error thrown when domain object validation fails
 * @extends DomainError
 */
export class ValidationError extends DomainError {
  /**
   * @param {string} message - Error message
   * @param {Error} [cause] - The underlying validation error (e.g., ZodError)
   * @param {Object} [context] - Additional context about the validation failure
   */
  constructor(message, cause, context = {}) {
    super(message, cause);
    this.context = context;
  }
}
