// packages/core/src/valueObjects/primitives/String.test.js
import { describe, it, expect } from 'vitest';
import { String } from './String.js';
import { ValidationError } from '../../errors/index.js';

describe('String Value Object', () => {
    it('should create a string value object with valid data', () => {
        // Arrange
        const value = 'test string';

        // Act
        const strObj = String.create(value);

        // Assert
        expect(strObj.toString()).toBe(value);
    });

    it('should handle empty strings', () => {
        // Arrange
        const value = '';

        // Act
        const strObj = String.create(value);

        // Assert
        expect(strObj.toString()).toBe(value);
        expect(strObj.isEmpty()).toBe(true);
    });

    it('should throw ValidationError for non-string values', () => {
        // Arrange
        const invalidValues = [123, true, {}, [], null, undefined];

        // Act & Assert
        invalidValues.forEach(value => {
            expect(() => String.create(value)).toThrow(ValidationError);
        });
    });

    describe('methods', () => {
        it('should implement contains correctly', () => {
            // Arrange
            const str = String.create('Hello World');

            // Act & Assert
            expect(str.contains('World')).toBe(true);
            expect(str.contains('Goodbye')).toBe(false);
        });

        it('should implement truncate correctly', () => {
            // Arrange
            const str = String.create('This is a long string');

            // Act
            const truncated = str.truncate(7);

            // Assert
            expect(truncated.toString()).toBe('This...');

            // Test with custom suffix
            const customSuffix = str.truncate(7, '!');
            expect(customSuffix.toString()).toBe('This is!');

            // No truncation needed
            const short = String.create('Short');
            expect(short.truncate(10).toString()).toBe('Short');
        });

        it('should implement toLower correctly', () => {
            // Arrange
            const str = String.create('HELLO World');

            // Act
            const lower = str.toLower();

            // Assert
            expect(lower.toString()).toBe('hello world');
            // Original should be unchanged
            expect(str.toString()).toBe('HELLO World');
        });

        it('should implement toUpper correctly', () => {
            // Arrange
            const str = String.create('hello World');

            // Act
            const upper = str.toUpper();

            // Assert
            expect(upper.toString()).toBe('HELLO WORLD');
            // Original should be unchanged
            expect(str.toString()).toBe('hello World');
        });

        it('should implement capitalize correctly', () => {
            // Arrange
            const str1 = String.create('hello');
            const str2 = String.create('WORLD');
            const str3 = String.create('');

            // Act
            const cap1 = str1.capitalize();
            const cap2 = str2.capitalize();
            const cap3 = str3.capitalize();

            // Assert
            expect(cap1.toString()).toBe('Hello');
            expect(cap2.toString()).toBe('WORLD');
            expect(cap3.toString()).toBe('');
        });

        it('should implement trim correctly', () => {
            // Arrange
            const str = String.create('  hello world  ');

            // Act
            const trimmed = str.trim();

            // Assert
            expect(trimmed.toString()).toBe('hello world');
            // Original should be unchanged
            expect(str.toString()).toBe('  hello world  ');
        });

        it('should implement replace correctly', () => {
            // Arrange
            const str = String.create('hello world');

            // Act
            const replaced = str.replace('world', 'universe');

            // Assert
            expect(replaced.toString()).toBe('hello universe');

            // Test with regex
            const regexReplaced = str.replace(/o/g, '0');
            expect(regexReplaced.toString()).toBe('hell0 w0rld');
        });

        it('should implement split correctly', () => {
            // Arrange
            const str = String.create('hello,world,test');

            // Act
            const parts = str.split(',');

            // Assert
            expect(parts).toEqual(['hello', 'world', 'test']);

            // Test with regex
            const regexParts = str.split(/,/);
            expect(regexParts).toEqual(['hello', 'world', 'test']);
        });

        it('should implement startsWith correctly', () => {
            // Arrange
            const str = String.create('hello world');

            // Act & Assert
            expect(str.startsWith('hello')).toBe(true);
            expect(str.startsWith('world')).toBe(false);
        });

        it('should implement endsWith correctly', () => {
            // Arrange
            const str = String.create('hello world');

            // Act & Assert
            expect(str.endsWith('world')).toBe(true);
            expect(str.endsWith('hello')).toBe(false);
        });

        it('should implement pad correctly', () => {
            // Arrange
            const str = String.create('test');

            // Act
            const padded = str.pad(8);

            // Assert
            expect(padded.toString()).toBe('  test  ');

            // Custom pad character
            const paddedCustom = str.pad(8, '-');
            expect(paddedCustom.toString()).toBe('--test--');

            // Already at target length
            const noPad = str.pad(4);
            expect(noPad.toString()).toBe('test');

            // Longer than target length
            const longer = String.create('testing');
            const noChange = longer.pad(5);
            expect(noChange.toString()).toBe('testing');
        });

        it('should implement padStart correctly', () => {
            // Arrange
            const str = String.create('test');

            // Act
            const padded = str.padStart(8);

            // Assert
            expect(padded.toString()).toBe('    test');

            // Custom pad character
            const paddedCustom = str.padStart(8, '-');
            expect(paddedCustom.toString()).toBe('----test');
        });

        it('should implement padEnd correctly', () => {
            // Arrange
            const str = String.create('test');

            // Act
            const padded = str.padEnd(8);

            // Assert
            expect(padded.toString()).toBe('test    ');

            // Custom pad character
            const paddedCustom = str.padEnd(8, '-');
            expect(paddedCustom.toString()).toBe('test----');
        });

        it('should implement matches correctly', () => {
            // Arrange
            const str = String.create('hello123world');

            // Act & Assert
            expect(str.matches(/^hello\d+world$/)).toBe(true);
            expect(str.matches(/^\d+$/)).toBe(false);
        });

        it('should implement isEmpty correctly', () => {
            // Arrange
            const empty = String.create('');
            const notEmpty = String.create('test');

            // Act & Assert
            expect(empty.isEmpty()).toBe(true);
            expect(notEmpty.isEmpty()).toBe(false);
        });

        it('should implement substring correctly', () => {
            // Arrange
            const str = String.create('hello world');

            // Act
            const sub1 = str.substring(0, 5);
            const sub2 = str.substring(6);

            // Assert
            expect(sub1.toString()).toBe('hello');
            expect(sub2.toString()).toBe('world');
        });
    });

    describe('equality', () => {
        it('should consider strings with same value as equal', () => {
            // Arrange
            const str1 = String.create('test');
            const str2 = String.create('test');

            // Act & Assert
            expect(str1.equals(str2)).toBe(true);
        });

        it('should consider strings with different values as not equal', () => {
            // Arrange
            const str1 = String.create('test');
            const str2 = String.create('other');

            // Act & Assert
            expect(str1.equals(str2)).toBe(false);
        });
    });
});
