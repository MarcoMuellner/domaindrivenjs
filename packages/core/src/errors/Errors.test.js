// packages/core/src/errors/errors.test.js
import { describe, it, expect } from 'vitest';
import { DomainError, ValidationError } from './index.js';

describe('DomainError', () => {
    it('should create an error with the given message', () => {
        // Arrange
        const message = 'Test error message';

        // Act
        const error = new DomainError(message);

        // Assert
        expect(error.message).toBe(message);
        expect(error.name).toBe('DomainError');
    });

    it('should set the cause if provided', () => {
        // Arrange
        const cause = new Error('Original error');

        // Act
        const error = new DomainError('Wrapper error', cause);

        // Assert
        expect(error.cause).toBe(cause);
    });

    it('should be instanceof Error and DomainError', () => {
        // Arrange & Act
        const error = new DomainError('Test error');

        // Assert
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(DomainError);
    });
});

describe('ValidationError', () => {
    it('should create an error with the given message', () => {
        // Arrange
        const message = 'Validation failed';

        // Act
        const error = new ValidationError(message);

        // Assert
        expect(error.message).toBe(message);
        expect(error.name).toBe('ValidationError');
    });

    it('should set the cause if provided', () => {
        // Arrange
        const cause = new Error('Original validation error');

        // Act
        const error = new ValidationError('Validation failed', cause);

        // Assert
        expect(error.cause).toBe(cause);
    });

    it('should store context information', () => {
        // Arrange
        const context = { objectType: 'Person', field: 'email', value: 'invalid' };

        // Act
        const error = new ValidationError('Invalid email', null, context);

        // Assert
        expect(error.context).toEqual(context);
    });

    it('should be instanceof DomainError and ValidationError', () => {
        // Arrange & Act
        const error = new ValidationError('Test validation error');

        // Assert
        expect(error).toBeInstanceOf(DomainError);
        expect(error).toBeInstanceOf(ValidationError);
    });
});
