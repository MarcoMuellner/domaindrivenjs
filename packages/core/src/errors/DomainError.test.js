import { describe, it, expect } from 'vitest';
import { DomainError } from './DomainError.js';

describe('DomainError', () => {
    // Test basic error creation
    it('should create a basic error with message', () => {
        // Arrange
        const message = 'Test domain error';
        
        // Act
        const error = new DomainError(message);
        
        // Assert
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(DomainError);
        expect(error.message).toBe(message);
        expect(error.stack).toBeDefined();
        expect(error.cause).toBeUndefined();
    });
    
    // Test error with cause
    it('should create an error with cause', () => {
        // Arrange
        const message = 'Outer error';
        const cause = new Error('Inner error');
        
        // Act
        const error = new DomainError(message, cause);
        
        // Assert
        expect(error.message).toBe(message);
        expect(error.cause).toBe(cause);
    });
    
    // Test error inheritance
    it('should allow extending for specific error types', () => {
        // Arrange
        class SpecificError extends DomainError {
            constructor(message, cause) {
                super(message, cause);
                this.name = 'SpecificError';
            }
        }
        
        // Act
        const error = new SpecificError('Specific error');
        
        // Assert
        expect(error).toBeInstanceOf(DomainError);
        expect(error).toBeInstanceOf(SpecificError);
        expect(error.name).toBe('SpecificError');
    });
    
    // Test error serialization
    it('should be properly serializable', () => {
        // Arrange
        const message = 'Serializable error';
        const error = new DomainError(message);
        
        // Act
        const serialized = JSON.stringify(error);
        const parsed = JSON.parse(serialized);
        
        // Assert
        expect(parsed.message).toBe(message);
    });
});
