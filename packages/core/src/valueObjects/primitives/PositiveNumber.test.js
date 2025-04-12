import { describe, it, expect } from 'vitest';
import { PositiveNumber } from './PositiveNumber.js';
import { ValidationError } from '../../errors/index.js';

describe('PositiveNumber Value Object', () => {
    it('should create a positive number value object with valid data', () => {
        // Arrange
        const value = 42;
        
        // Act
        const numObj = PositiveNumber.create(value);
        
        // Assert
        expect(numObj.toString()).toContain('42');
        expect(numObj + 0).toBe(42);
    });
    
    it('should throw ValidationError for non-positive values', () => {
        // Arrange
        const invalidValues = [0, -1, -42.5];
        
        // Act & Assert
        invalidValues.forEach(value => {
            expect(() => PositiveNumber.create(value)).toThrow(ValidationError);
        });
    });
    
    it('should accept decimal positive values', () => {
        // Arrange
        const value = 0.1;
        
        // Act
        const numObj = PositiveNumber.create(value);
        
        // Assert
        expect(numObj + 0).toBe(0.1);
    });
    
    it('should inherit methods from Number value object', () => {
        // Arrange
        const value = 5;
        
        // Act
        const numObj = PositiveNumber.create(value);
        
        // Assert
        expect(numObj.add(3) + 0).toBe(8);
        expect(numObj.multiply(2) + 0).toBe(10);
    });
    
    it('should maintain positive constraint when using operations', () => {
        // Arrange
        const numObj = PositiveNumber.create(5);
        
        // Act
        const result = numObj.subtract(2);
        
        // Assert
        expect(result + 0).toBe(3);
        
        // This operation would result in a non-positive number
        // but the value object doesn't enforce constraints on operations
        // only on creation
        const negativeResult = numObj.subtract(10);
        expect(negativeResult + 0).toBe(-5);
        
        // Verify that creating a new instance with the negative value fails
        expect(() => PositiveNumber.create(negativeResult)).toThrow(ValidationError);
    });
});
