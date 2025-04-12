// packages/core/src/valueObjects/primitives/NonEmptyString.test.js
import { describe, it, expect } from 'vitest';
import { NonEmptyString } from './NonEmptyString.js';
import { ValidationError } from '../../errors/index.js';

describe('NonEmptyString Value Object', () => {
    it('should create a non-empty string value object with valid data', () => {
        // Arrange
        const value = 'test string';

        // Act
        const strObj = NonEmptyString.create(value);

        // Assert
        expect(strObj.toString()).toBe(value);
    });

    it('should throw ValidationError for empty strings', () => {
        // Arrange
        const emptyValue = '';

        // Act & Assert
        expect(() => NonEmptyString.create(emptyValue)).toThrow(ValidationError);
    });

    it('should throw ValidationError for whitespace-only strings', () => {
        // Arrange
        const whitespaceValues = [' ', '   ', '\t', '\n'];

        // Act & Assert
        whitespaceValues.forEach(value => {
            expect(() => NonEmptyString.create(value)).toThrow(ValidationError);
        });
    });

    it('should trim whitespace from input strings', () => {
        // Arrange
        const paddedValue = '  test  ';

        // Act
        const strObj = NonEmptyString.create(paddedValue);

        // Assert
        expect(strObj.toString()).toBe('test');
    });

    it('should inherit methods from String value object', () => {
        // Arrange
        const value = 'Hello World';

        // Act
        const strObj = NonEmptyString.create(value);

        // Assert
        expect(strObj.toLower().toString()).toBe('hello world');
        expect(strObj.toUpper().toString()).toBe('HELLO WORLD');
        expect(strObj.contains('World')).toBe(true);
    });

    it('should maintain non-empty constraint when using string operations', () => {
        // Arrange
        const strObj = NonEmptyString.create('test');

        // Act & Assert
        // Replace that would result in empty string should throw
        expect(() => {
            const empty = strObj.replace('test', '');
            // We need to access the value to trigger validation if it were deferred
            empty.toString();
        }).toThrow(ValidationError);
    });

    describe('equality', () => {
        it('should consider non-empty strings with same value as equal', () => {
            // Arrange
            const str1 = NonEmptyString.create('test');
            const str2 = NonEmptyString.create('test');

            // Act & Assert
            expect(str1.equals(str2)).toBe(true);
        });

        it('should consider non-empty strings with different values as not equal', () => {
            // Arrange
            const str1 = NonEmptyString.create('test');
            const str2 = NonEmptyString.create('other');

            // Act & Assert
            expect(str1.equals(str2)).toBe(false);
        });
    });
});
