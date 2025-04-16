import { DomainError } from "./DomainError.js";

/**
 * Error thrown when an invariant is violated
 */
export class InvariantViolationError extends DomainError {
  /**
   * @param {string} message - Error message
   * @param {string} invariantName - Name of the violated invariant
   * @param {Object} context - Additional context
   */
  constructor(message, invariantName, context = {}) {
    super(message);
    this.invariantName = invariantName;
    this.context = context;
  }
}
