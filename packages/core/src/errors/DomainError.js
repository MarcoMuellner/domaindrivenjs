/**
 * Base error class for all domain-specific errors
 * @extends Error
 */
export class DomainError extends Error {
    /** @type {string} The error message */
    message;

    /** @type {string} The error stack trace */
    stack;

    /** @type {Error|undefined} The underlying cause of this error */
    cause;

    /**
     * @param {string} message - Error message
     * @param {Error} [cause] - The underlying cause of this error
     */
    constructor(message, cause) {
        super(message);
        this.message = message;
        this.name = this.constructor.name;
        this.cause = cause;

        Error.captureStackTrace(this, this.constructor);
    }
}
