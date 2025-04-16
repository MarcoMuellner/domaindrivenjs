// packages/core/src/specifications/Base.test.js
import { describe, it, expect } from 'vitest';
import { specification } from './Base.js';

describe('specification', () => {
    // Basic specifications for testing
    const isPositive = specification({
        name: 'IsPositive',
        isSatisfiedBy: (num) => num > 0,
        toQuery: () => ({ value: { $gt: 0 } })
    });

    const isEven = specification({
        name: 'IsEven',
        isSatisfiedBy: (num) => num % 2 === 0,
        toQuery: () => ({ value: { $mod: [2, 0] } })
    });

    const isLessThan10 = specification({
        name: 'IsLessThan10',
        isSatisfiedBy: (num) => num < 10,
        toQuery: () => ({ value: { $lt: 10 } })
    });

    // Specification without toQuery method
    const customSpec = specification({
        name: 'CustomSpec',
        isSatisfiedBy: (obj) => obj.custom === true
    });

    describe('basic validation', () => {
        it('should throw error if options are missing', () => {
            expect(() => specification()).toThrow('Specification options are required');
        });

        it('should throw error if name is missing', () => {
            expect(() => specification({ isSatisfiedBy: () => true })).toThrow('Specification name is required');
        });

        it('should throw error if isSatisfiedBy is missing', () => {
            expect(() => specification({ name: 'Test' })).toThrow('Specification must have an isSatisfiedBy function');
        });

        it('should throw error if isSatisfiedBy is not a function', () => {
            expect(() => specification({ name: 'Test', isSatisfiedBy: 'not a function' })).toThrow('Specification must have an isSatisfiedBy function');
        });
    });

    describe('isSatisfiedBy', () => {
        it('should return true for values that satisfy the specification', () => {
            expect(isPositive.isSatisfiedBy(5)).toBe(true);
            expect(isEven.isSatisfiedBy(6)).toBe(true);
            expect(isLessThan10.isSatisfiedBy(8)).toBe(true);
        });

        it('should return false for values that do not satisfy the specification', () => {
            expect(isPositive.isSatisfiedBy(-3)).toBe(false);
            expect(isEven.isSatisfiedBy(7)).toBe(false);
            expect(isLessThan10.isSatisfiedBy(15)).toBe(false);
        });
    });

    describe('logical operations', () => {
        describe('and', () => {
            it('should create a specification that is the logical AND of two specifications', () => {
                // Positive AND Even
                const positiveAndEven = isPositive.and(isEven);

                // Test name
                expect(positiveAndEven.name).toBe('IsPositive AND IsEven');

                // Test isSatisfiedBy
                expect(positiveAndEven.isSatisfiedBy(6)).toBe(true);  // Both positive and even
                expect(positiveAndEven.isSatisfiedBy(5)).toBe(false); // Positive but not even
                expect(positiveAndEven.isSatisfiedBy(-2)).toBe(false); // Even but not positive
                expect(positiveAndEven.isSatisfiedBy(-3)).toBe(false); // Neither positive nor even

                // Test toQuery
                expect(positiveAndEven.toQuery()).toEqual({
                    $and: [
                        { value: { $gt: 0 } },
                        { value: { $mod: [2, 0] } }
                    ]
                });
            });

            it('should handle more than two specifications in a chain', () => {
                // Positive AND Even AND Less than 10
                const complexSpec = isPositive.and(isEven).and(isLessThan10);

                // Test name (shows how the chain is constructed)
                expect(complexSpec.name).toBe('IsPositive AND IsEven AND IsLessThan10');

                // Test isSatisfiedBy
                expect(complexSpec.isSatisfiedBy(8)).toBe(true);   // Meets all criteria
                expect(complexSpec.isSatisfiedBy(12)).toBe(false); // Positive and even but not less than 10
                expect(complexSpec.isSatisfiedBy(5)).toBe(false);  // Positive and less than 10 but not even
                expect(complexSpec.isSatisfiedBy(-4)).toBe(false); // Even and less than 10 but not positive
            });
        });

        describe('or', () => {
            it('should create a specification that is the logical OR of two specifications', () => {
                // Positive OR Even
                const positiveOrEven = isPositive.or(isEven);

                // Test name
                expect(positiveOrEven.name).toBe('IsPositive OR IsEven');

                // Test isSatisfiedBy
                expect(positiveOrEven.isSatisfiedBy(6)).toBe(true);  // Both positive and even
                expect(positiveOrEven.isSatisfiedBy(5)).toBe(true);  // Positive but not even
                expect(positiveOrEven.isSatisfiedBy(-2)).toBe(true); // Even but not positive
                expect(positiveOrEven.isSatisfiedBy(-3)).toBe(false); // Neither positive nor even

                // Test toQuery
                expect(positiveOrEven.toQuery()).toEqual({
                    $or: [
                        { value: { $gt: 0 } },
                        { value: { $mod: [2, 0] } }
                    ]
                });
            });

            it('should handle more than two specifications in a chain', () => {
                // Positive OR Even OR Less than 10
                const complexSpec = isPositive.or(isEven).or(isLessThan10);

                // Test name (shows how the chain is constructed)
                expect(complexSpec.name).toBe('IsPositive OR IsEven OR IsLessThan10');

                // Test isSatisfiedBy
                expect(complexSpec.isSatisfiedBy(8)).toBe(true);   // Meets all criteria
                expect(complexSpec.isSatisfiedBy(12)).toBe(true);  // Positive and even but not less than 10
                expect(complexSpec.isSatisfiedBy(5)).toBe(true);   // Positive and less than 10 but not even
                expect(complexSpec.isSatisfiedBy(-4)).toBe(true);  // Even and less than 10 but not positive
            });
        });

        describe('not', () => {
            it('should create a specification that is the logical NOT of a specification', () => {
                // NOT Positive
                const notPositive = isPositive.not();

                // Test name
                expect(notPositive.name).toBe('NOT IsPositive');

                // Test isSatisfiedBy
                expect(notPositive.isSatisfiedBy(5)).toBe(false);  // Positive
                expect(notPositive.isSatisfiedBy(0)).toBe(true);   // Not positive
                expect(notPositive.isSatisfiedBy(-3)).toBe(true);  // Not positive

                // Test toQuery
                expect(notPositive.toQuery()).toEqual({
                    $not: { value: { $gt: 0 } }
                });
            });

            it('should handle double negation', () => {
                // NOT (NOT Positive)
                const notNotPositive = isPositive.not().not();

                // Test name
                expect(notNotPositive.name).toBe('NOT NOT IsPositive');

                // Test isSatisfiedBy (should be equivalent to the original)
                expect(notNotPositive.isSatisfiedBy(5)).toBe(true);   // Positive
                expect(notNotPositive.isSatisfiedBy(0)).toBe(false);  // Not positive
                expect(notNotPositive.isSatisfiedBy(-3)).toBe(false); // Not positive
            });
        });

        describe('complex operations', () => {
            it('should handle complex combinations of AND, OR, and NOT', () => {
                // (Positive AND Even) OR (NOT LessThan10)
                const complexSpec = isPositive.and(isEven).or(isLessThan10.not());

                // Test name
                expect(complexSpec.name).toBe('IsPositive AND IsEven OR NOT IsLessThan10');

                // Test isSatisfiedBy
                expect(complexSpec.isSatisfiedBy(6)).toBe(true);   // Positive and even
                expect(complexSpec.isSatisfiedBy(5)).toBe(false);  // Positive but not even, and less than 10
                expect(complexSpec.isSatisfiedBy(12)).toBe(true);  // Either: (positive and even) OR (not less than 10)
                expect(complexSpec.isSatisfiedBy(-3)).toBe(false); // Not positive, not even, and less than 10
                expect(complexSpec.isSatisfiedBy(-12)).toBe(false); // Not less than 10 (second condition)
            });
        });
    });

    describe('toQuery', () => {
        it('should not have toQuery if not provided in the options', () => {
            expect(customSpec.toQuery).toBeUndefined();
        });

        it('should not provide toQuery for composite specs if one component lacks it', () => {
            const compositeSpec = isPositive.and(customSpec);
            expect(compositeSpec.toQuery).toBeUndefined();
        });
    });
});
