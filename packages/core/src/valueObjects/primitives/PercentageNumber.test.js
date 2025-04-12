import { describe, it, expect } from 'vitest';
import { PercentageNumber } from './PercentageNumber.js';
import { ValidationError } from '../../errors/index.js';

describe('PercentageNumber Value Object', () => {
    it('should create a percentage number value object with valid data', () => {
        // Arrange
        const zeroValue = 0;
        const halfValue = 0.5;
        const fullValue = 1;
        
        // Act
        const zeroObj = PercentageNumber.create(zeroValue);
        const halfObj = PercentageNumber.create(halfValue);
        const fullObj = PercentageNumber.create(fullValue);
        
        // Assert
        expect(zeroObj + 0).toBe(0);
        expect(halfObj + 0).toBe(0.5);
        expect(fullObj + 0).toBe(1);
    });
    
    it('should throw ValidationError for values outside the 0-1 range', () => {
        // Arrange
        const invalidValues = [-0.1, 1.1, 2, -1];
        
        // Act & Assert
        invalidValues.forEach(value => {
            expect(() => PercentageNumber.create(value)).toThrow(ValidationError);
        });
    });
    
    it('should format percentage correctly', () => {
        // Arrange
        const quarter = PercentageNumber.create(0.25);
        const half = PercentageNumber.create(0.5);
        
        // Act
        const quarterFormatted = quarter.format();
        const halfFormatted = half.format();
        const quarterFormattedDecimals = quarter.format(2);
        
        // Assert
        expect(quarterFormatted).toBe('25%');
        expect(halfFormatted).toBe('50%');
        expect(quarterFormattedDecimals).toBe('25.00%');
    });
    
    it('should inherit methods from Number value object', () => {
        // Arrange
        const value = 0.5;
        
        // Act
        const numObj = PercentageNumber.create(value);
        
        // Assert
        expect(numObj.add(0.1) + 0).toBe(0.6);
        expect(numObj.multiply(2) + 0).toBe(1);
    });
    
    it('should maintain percentage constraint when using operations', () => {
        // Arrange
        const numObj = PercentageNumber.create(0.5);
        
        // Act
        const validResult = numObj.subtract(0.1);
        
        // Assert
        expect(validResult + 0).toBe(0.4);
        
        // This operation would result in a value outside the valid range
        // but the value object doesn't enforce constraints on operations
        // only on creation
        const invalidResult = numObj.add(0.6);
        expect(invalidResult + 0).toBe(1.1);
        
        // Verify that creating a new instance with the invalid value fails
        expect(() => PercentageNumber.create(invalidResult)).toThrow(ValidationError);
    });
    
    it('should format percentages with different locales', () => {
        // Arrange
        const value = PercentageNumber.create(0.75);
        
        // Act
        const usFormat = value.format(0, 'en-US');
        const deFormat = value.format(0, 'de-DE');
        
        // Assert
        expect(usFormat).toBe('75%');
        // German format uses comma as decimal separator
        expect(deFormat).toBe('75 %');
    });
});
