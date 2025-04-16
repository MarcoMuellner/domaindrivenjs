import { DomainError } from "./DomainError.js";

/**
 * Error thrown when domain service operations fail
 * @extends DomainError
 */
export class DomainServiceError extends DomainError {
  /**
   * @param {string} message - Error message
   * @param {Error} [cause] - The underlying cause
   * @param {Record<string, any>} [context] - Additional context
   */
  constructor(message, cause, context = {}) {
    super(message, cause);
    this.context = context;
  }
}
