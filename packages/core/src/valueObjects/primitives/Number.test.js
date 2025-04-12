import { describe, it, expect } from 'vitest';
import { Number } from './Number.js';
import { ValidationError } from '../../errors/index.js';

describe('Number Value Object', () => {
    // Basic creation and validation
    it('should create a number value object with valid data', () => {
        // Arrange
        const value = 42;
        
        // Act
        const numObj = Number.create(value);
        
        // Assert
        expect(numObj.toString()).toContain('42');
        // Should be usable as a number
        expect(numObj + 1).toBe(43);
    });
    
    it('should throw ValidationError for non-number values', () => {
        // Arrange
        const invalidValues = ['string', true, {}, [], null, undefined];
        
        // Act & Assert
        invalidValues.forEach(value => {
            expect(() => Number.create(value)).toThrow(ValidationError);
        });
    });
    
    // Test mathematical operations
    describe('mathematical operations', () => {
        it('should implement add correctly', () => {
            // Arrange
            const num = Number.create(5);
            
            // Act
            const result = num.add(3);
            
            // Assert
            expect(result).not.toBe(num); // Should be a new instance
            expect(result + 0).toBe(8); // Value should be 8
        });
        
        it('should implement subtract correctly', () => {
            // Arrange
            const num = Number.create(10);
            
            // Act
            const result = num.subtract(4);
            
            // Assert
            expect(result + 0).toBe(6);
        });
        
        it('should implement multiply correctly', () => {
            // Arrange
            const num = Number.create(6);
            
            // Act
            const result = num.multiply(3);
            
            // Assert
            expect(result + 0).toBe(18);
        });
        
        it('should implement divide correctly', () => {
            // Arrange
            const num = Number.create(20);
            
            // Act
            const result = num.divide(4);
            
            // Assert
            expect(result + 0).toBe(5);
        });
        
        it('should throw error when dividing by zero', () => {
            // Arrange
            const num = Number.create(10);
            
            // Act & Assert
            expect(() => num.divide(0)).toThrow('Cannot divide by zero');
        });
        
        it('should implement increment correctly', () => {
            // Arrange
            const num = Number.create(5);
            
            // Act
            const result1 = num.increment(); // Default increment by 1
            const result2 = num.increment(3); // Custom increment
            
            // Assert
            expect(result1 + 0).toBe(6);
            expect(result2 + 0).toBe(8);
        });
        
        it('should implement decrement correctly', () => {
            // Arrange
            const num = Number.create(10);
            
            // Act
            const result1 = num.decrement(); // Default decrement by 1
            const result2 = num.decrement(5); // Custom decrement
            
            // Assert
            expect(result1 + 0).toBe(9);
            expect(result2 + 0).toBe(5);
        });
    });
    
    // Test rounding operations
    describe('rounding operations', () => {
        it('should implement round correctly', () => {
            // Arrange
            const num = Number.create(3.14159);
            
            // Act
            const rounded0 = num.round(); // Default to 0 decimals
            const rounded2 = num.round(2);
            const rounded4 = num.round(4);
            
            // Assert
            expect(rounded0 + 0).toBe(3);
            expect(rounded2 + 0).toBe(3.14);
            expect(rounded4 + 0).toBe(3.1416);
        });
        
        it('should implement floor correctly', () => {
            // Arrange
            const num = Number.create(9.99);
            
            // Act
            const floored = num.floor();
            const floored1 = num.floor(1);
            
            // Assert
            expect(floored + 0).toBe(9);
            expect(floored1 + 0).toBe(9.9);
        });
        
        it('should implement ceil correctly', () => {
            // Arrange
            const num = Number.create(9.01);
            
            // Act
            const ceiled = num.ceil();
            const ceiled1 = num.ceil(1);
            
            // Assert
            expect(ceiled + 0).toBe(10);
            expect(ceiled1 + 0).toBe(9.1);
        });
    });
    
    // Test state checking methods
    describe('state checking methods', () => {
        it('should implement isZero correctly', () => {
            // Arrange
            const zero = Number.create(0);
            const nonZero = Number.create(5);
            
            // Act & Assert
            expect(zero.isZero()).toBe(true);
            expect(nonZero.isZero()).toBe(false);
        });
        
        it('should implement isPositive correctly', () => {
            // Arrange
            const positive = Number.create(5);
            const zero = Number.create(0);
            const negative = Number.create(-5);
            
            // Act & Assert
            expect(positive.isPositive()).toBe(true);
            expect(zero.isPositive()).toBe(false);
            expect(negative.isPositive()).toBe(false);
        });
        
        it('should implement isNegative correctly', () => {
            // Arrange
            const negative = Number.create(-5);
            const zero = Number.create(0);
            const positive = Number.create(5);
            
            // Act & Assert
            expect(negative.isNegative()).toBe(true);
            expect(zero.isNegative()).toBe(false);
            expect(positive.isNegative()).toBe(false);
        });
        
        it('should implement isInteger correctly', () => {
            // Arrange
            const integer = Number.create(5);
            const float = Number.create(5.5);
            
            // Act & Assert
            expect(integer.isInteger()).toBe(true);
            expect(float.isInteger()).toBe(false);
        });
    });
    
    // Test mathematical transformations
    describe('mathematical transformations', () => {
        it('should implement abs correctly', () => {
            // Arrange
            const negative = Number.create(-5);
            const positive = Number.create(5);
            
            // Act
            const absNegative = negative.abs();
            const absPositive = positive.abs();
            
            // Assert
            expect(absNegative + 0).toBe(5);
            expect(absPositive + 0).toBe(5);
        });
        
        it('should implement pow correctly', () => {
            // Arrange
            const base = Number.create(2);
            
            // Act
            const squared = base.pow(2);
            const cubed = base.pow(3);
            
            // Assert
            expect(squared + 0).toBe(4);
            expect(cubed + 0).toBe(8);
        });
        
        it('should implement sqrt correctly', () => {
            // Arrange
            const num = Number.create(16);
            
            // Act
            const sqrt = num.sqrt();
            
            // Assert
            expect(sqrt + 0).toBe(4);
        });
        
        it('should throw error when calculating sqrt of negative number', () => {
            // Arrange
            const negative = Number.create(-4);
            
            // Act & Assert
            expect(() => negative.sqrt()).toThrow('Cannot calculate square root of negative number');
        });
    });
    
    // Test formatting methods
    describe('formatting methods', () => {
        it('should implement format correctly', () => {
            // Arrange
            const num = Number.create(1234.56);
            
            // Act
            const formatted = num.format('en-US');
            const formattedDE = num.format('de-DE');
            
            // Assert
            expect(formatted).toBe('1,234.56');
            // German format uses comma as decimal separator and period as thousands separator
            expect(formattedDE).toBe('1.234,56');
        });
        
        it('should implement toPercentage correctly', () => {
            // Arrange
            const num = Number.create(0.1234);
            
            // Act
            const percent = num.toPercentage('en-US');
            const percentWithDecimals = num.toPercentage('en-US', 2);
            
            // Assert
            expect(percent).toBe('12%');
            expect(percentWithDecimals).toBe('12.34%');
        });
        
        it('should implement toCurrency correctly', () => {
            // Arrange
            const num = Number.create(49.99);
            
            // Act
            const usd = num.toCurrency('USD', 'en-US');
            const eur = num.toCurrency('EUR', 'de-DE');
            
            // Assert
            expect(usd).toBe('$49.99');
            expect(eur).toBe('49,99 €');
        });
    });
    
    // Test equality
    describe('equality', () => {
        it('should consider numbers with same value as equal', () => {
            // Arrange
            const num1 = Number.create(42);
            const num2 = Number.create(42);
            
            // Act & Assert
            expect(num1.equals(num2)).toBe(true);
        });
        
        it('should consider numbers with different values as not equal', () => {
            // Arrange
            const num1 = Number.create(42);
            const num2 = Number.create(43);
            
            // Act & Assert
            expect(num1.equals(num2)).toBe(false);
        });
        
        it('should handle equality with null and undefined', () => {
            // Arrange
            const num = Number.create(42);
            
            // Act & Assert
            expect(num.equals(null)).toBe(false);
            expect(num.equals(undefined)).toBe(false);
        });
    });
});
