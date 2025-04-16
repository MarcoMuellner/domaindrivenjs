// packages/core/src/specifications/Common.test.js
import { describe, it, expect } from 'vitest';
import {
    propertyEquals,
    propertyContains,
    propertyMatches,
    propertyGreaterThan,
    propertyLessThan,
    propertyBetween,
    propertyIn,
    propertyIsNull,
    propertyIsNotNull,
    alwaysTrue,
    alwaysFalse,
    parameterizedSpecification
} from './Common.js';

describe('Common Specifications', () => {
    // Test data
    const testObjects = [
        { id: 1, name: 'Product A', price: 10.99, category: 'electronics', tags: ['new', 'sale'], inStock: true },
        { id: 2, name: 'Product B', price: 24.99, category: 'books', tags: ['bestseller'], inStock: false },
        { id: 3, name: 'Product C', price: 5.99, category: 'electronics', tags: ['clearance'], inStock: true },
        { id: 4, name: 'Product D', price: 99.99, category: 'furniture', inStock: true },
        { id: 5, name: 'Product E', price: 0.99, category: 'books', inStock: false, description: null }
    ];

    describe('propertyEquals', () => {
        it('should check if a property equals a specific value', () => {
            // Arrange
            const isCategoryElectronics = propertyEquals('category', 'electronics');

            // Act & Assert
            expect(isCategoryElectronics.isSatisfiedBy(testObjects[0])).toBe(true);  // category is 'electronics'
            expect(isCategoryElectronics.isSatisfiedBy(testObjects[1])).toBe(false); // category is 'books'
            expect(isCategoryElectronics.isSatisfiedBy(testObjects[2])).toBe(true);  // category is 'electronics'
            expect(isCategoryElectronics.isSatisfiedBy(testObjects[3])).toBe(false); // category is 'furniture'
        });

        it('should handle null and undefined objects', () => {
            // Arrange
            const isCategoryElectronics = propertyEquals('category', 'electronics');

            // Act & Assert
            expect(isCategoryElectronics.isSatisfiedBy(null)).toBe(false);
            expect(isCategoryElectronics.isSatisfiedBy(undefined)).toBe(false);
        });

        it('should generate a query for the property equals check', () => {
            // Arrange
            const isCategoryElectronics = propertyEquals('category', 'electronics');

            // Act
            const query = isCategoryElectronics.toQuery();

            // Assert
            expect(query).toEqual({ category: 'electronics' });
        });

        it('should use custom name if provided', () => {
            // Arrange
            const isCategoryElectronics = propertyEquals('category', 'electronics', 'Is Electronics Product');

            // Assert
            expect(isCategoryElectronics.name).toBe('Is Electronics Product');
        });
    });

    describe('propertyContains', () => {
        it('should check if an array property contains a value', () => {
            // Arrange
            const hasNewTag = propertyContains('tags', 'new');

            // Act & Assert
            expect(hasNewTag.isSatisfiedBy(testObjects[0])).toBe(true);  // tags includes 'new'
            expect(hasNewTag.isSatisfiedBy(testObjects[1])).toBe(false); // tags doesn't include 'new'
            expect(hasNewTag.isSatisfiedBy(testObjects[3])).toBe(false); // doesn't have tags property
        });

        it('should check if a string property contains a substring', () => {
            // Arrange
            const nameContainsA = propertyContains('name', 'A');

            // Act & Assert
            expect(nameContainsA.isSatisfiedBy(testObjects[0])).toBe(true);  // name contains 'A'
            expect(nameContainsA.isSatisfiedBy(testObjects[1])).toBe(false); // name doesn't contain 'A'
        });

        it('should handle null and undefined objects and properties', () => {
            // Arrange
            const hasNewTag = propertyContains('tags', 'new');

            // Act & Assert
            expect(hasNewTag.isSatisfiedBy(null)).toBe(false);
            expect(hasNewTag.isSatisfiedBy(undefined)).toBe(false);
            expect(hasNewTag.isSatisfiedBy({ name: 'test' })).toBe(false); // missing tags property
        });

        it('should generate a query for the contains check', () => {
            // Arrange
            const nameContainsA = propertyContains('name', 'A');

            // Act
            const query = nameContainsA.toQuery();

            // Assert
            expect(query).toEqual({ name: { $regex: 'A', $options: 'i' } });
        });
    });

    describe('propertyMatches', () => {
        it('should check if a property matches a regular expression', () => {
            // Arrange
            const nameStartsWithP = propertyMatches('name', /^P/);

            // Act & Assert
            expect(nameStartsWithP.isSatisfiedBy(testObjects[0])).toBe(true);  // name starts with 'P'
            expect(nameStartsWithP.isSatisfiedBy({ name: 'Apple' })).toBe(false); // name doesn't start with 'P'
        });

        it('should handle null and undefined objects and properties', () => {
            // Arrange
            const nameStartsWithP = propertyMatches('name', /^P/);

            // Act & Assert
            expect(nameStartsWithP.isSatisfiedBy(null)).toBe(false);
            expect(nameStartsWithP.isSatisfiedBy(undefined)).toBe(false);
            expect(nameStartsWithP.isSatisfiedBy({ category: 'test' })).toBe(false); // missing name property
        });

        it('should handle non-string properties', () => {
            // Arrange
            const priceIsNumber = propertyMatches('price', /^\d+/);

            // Act & Assert
            expect(priceIsNumber.isSatisfiedBy(testObjects[0])).toBe(false); // price is a number, not a string
        });

        it('should generate a query for the regex match', () => {
            // Arrange
            const nameStartsWithP = propertyMatches('name', /^P/i);

            // Act
            const query = nameStartsWithP.toQuery();

            // Assert
            expect(query).toEqual({ name: { $regex: '^P', $options: 'i' } });
        });
    });

    describe('propertyGreaterThan and propertyLessThan', () => {
        it('should check if a property is greater than a value', () => {
            // Arrange
            const expensiveProduct = propertyGreaterThan('price', 20);

            // Act & Assert
            expect(expensiveProduct.isSatisfiedBy(testObjects[0])).toBe(false); // price = 10.99
            expect(expensiveProduct.isSatisfiedBy(testObjects[1])).toBe(true);  // price = 24.99
            expect(expensiveProduct.isSatisfiedBy(testObjects[3])).toBe(true);  // price = 99.99
        });

        it('should check if a property is less than a value', () => {
            // Arrange
            const cheapProduct = propertyLessThan('price', 10);

            // Act & Assert
            expect(cheapProduct.isSatisfiedBy(testObjects[0])).toBe(false); // price = 10.99
            expect(cheapProduct.isSatisfiedBy(testObjects[2])).toBe(true);  // price = 5.99
            expect(cheapProduct.isSatisfiedBy(testObjects[4])).toBe(true);  // price = 0.99
        });

        it('should handle null and undefined objects and properties', () => {
            // Arrange
            const expensiveProduct = propertyGreaterThan('price', 20);

            // Act & Assert
            expect(expensiveProduct.isSatisfiedBy(null)).toBe(false);
            expect(expensiveProduct.isSatisfiedBy(undefined)).toBe(false);
            expect(expensiveProduct.isSatisfiedBy({ name: 'test' })).toBe(false); // missing price property
        });

        it('should generate queries for comparison operators', () => {
            // Arrange
            const expensiveProduct = propertyGreaterThan('price', 20);
            const cheapProduct = propertyLessThan('price', 10);

            // Act
            const gtQuery = expensiveProduct.toQuery();
            const ltQuery = cheapProduct.toQuery();

            // Assert
            expect(gtQuery).toEqual({ price: { $gt: 20 } });
            expect(ltQuery).toEqual({ price: { $lt: 10 } });
        });
    });

    describe('propertyBetween', () => {
        it('should check if a property is between two values (inclusive)', () => {
            // Arrange
            const midPriceProduct = propertyBetween('price', 10, 25);

            // Act & Assert
            expect(midPriceProduct.isSatisfiedBy(testObjects[0])).toBe(true);  // price = 10.99
            expect(midPriceProduct.isSatisfiedBy(testObjects[1])).toBe(true);  // price = 24.99
            expect(midPriceProduct.isSatisfiedBy(testObjects[2])).toBe(false); // price = 5.99
            expect(midPriceProduct.isSatisfiedBy(testObjects[3])).toBe(false); // price = 99.99
        });

        it('should handle boundary values correctly', () => {
            // Arrange
            const midPriceProduct = propertyBetween('price', 10, 25);

            // Act & Assert - exact boundary values should be included
            expect(midPriceProduct.isSatisfiedBy({ price: 10 })).toBe(true);
            expect(midPriceProduct.isSatisfiedBy({ price: 25 })).toBe(true);
        });

        it('should generate a query for the between range', () => {
            // Arrange
            const midPriceProduct = propertyBetween('price', 10, 25);

            // Act
            const query = midPriceProduct.toQuery();

            // Assert
            expect(query).toEqual({
                price: {
                    $gte: 10,
                    $lte: 25
                }
            });
        });
    });

    describe('propertyIn', () => {
        it('should check if a property is in a set of values', () => {
            // Arrange
            const specificCategories = propertyIn('category', ['electronics', 'furniture']);

            // Act & Assert
            expect(specificCategories.isSatisfiedBy(testObjects[0])).toBe(true);  // category = 'electronics'
            expect(specificCategories.isSatisfiedBy(testObjects[1])).toBe(false); // category = 'books'
            expect(specificCategories.isSatisfiedBy(testObjects[3])).toBe(true);  // category = 'furniture'
        });

        it('should generate a query for the "in" check', () => {
            // Arrange
            const specificCategories = propertyIn('category', ['electronics', 'furniture']);

            // Act
            const query = specificCategories.toQuery();

            // Assert
            expect(query).toEqual({ category: { $in: ['electronics', 'furniture'] } });
        });
    });

    describe('propertyIsNull and propertyIsNotNull', () => {
        it('should check if a property is null or undefined', () => {
            // Arrange
            const hasNoDescription = propertyIsNull('description');

            // Act & Assert
            expect(hasNoDescription.isSatisfiedBy(testObjects[0])).toBe(true);  // description is undefined
            expect(hasNoDescription.isSatisfiedBy(testObjects[4])).toBe(true);  // description is null

            // Create an object with a description
            const objWithDescription = { ...testObjects[0], description: 'This is a description' };
            expect(hasNoDescription.isSatisfiedBy(objWithDescription)).toBe(false);
        });

        it('should check if a property is not null or undefined', () => {
            // Arrange
            const hasDescription = propertyIsNotNull('description');

            // Act & Assert
            expect(hasDescription.isSatisfiedBy(testObjects[0])).toBe(false);  // description is undefined
            expect(hasDescription.isSatisfiedBy(testObjects[4])).toBe(false);  // description is null

            // Create an object with a description
            const objWithDescription = { ...testObjects[0], description: 'This is a description' };
            expect(hasDescription.isSatisfiedBy(objWithDescription)).toBe(true);
        });

        it('should generate queries for null checks', () => {
            // Arrange
            const hasNoDescription = propertyIsNull('description');
            const hasDescription = propertyIsNotNull('description');

            // Act
            const nullQuery = hasNoDescription.toQuery();
            const notNullQuery = hasDescription.toQuery();

            // Assert
            expect(nullQuery).toEqual({
                $or: [
                    { description: null },
                    { description: { $exists: false } }
                ]
            });

            expect(notNullQuery).toEqual({
                description: { $exists: true, $ne: null }
            });
        });
    });

    describe('alwaysTrue and alwaysFalse', () => {
        it('should create a specification that always returns true', () => {
            // Arrange
            const trueSpec = alwaysTrue();

            // Act & Assert
            expect(trueSpec.isSatisfiedBy(testObjects[0])).toBe(true);
            expect(trueSpec.isSatisfiedBy(null)).toBe(true);
            expect(trueSpec.isSatisfiedBy(undefined)).toBe(true);
            expect(trueSpec.isSatisfiedBy({})).toBe(true);
        });

        it('should create a specification that always returns false', () => {
            // Arrange
            const falseSpec = alwaysFalse();

            // Act & Assert
            expect(falseSpec.isSatisfiedBy(testObjects[0])).toBe(false);
            expect(falseSpec.isSatisfiedBy(null)).toBe(false);
            expect(falseSpec.isSatisfiedBy(undefined)).toBe(false);
            expect(falseSpec.isSatisfiedBy({})).toBe(false);
        });

        it('should generate appropriate queries', () => {
            // Arrange
            const trueSpec = alwaysTrue();
            const falseSpec = alwaysFalse();

            // Act
            const trueQuery = trueSpec.toQuery();
            const falseQuery = falseSpec.toQuery();

            // Assert
            expect(trueQuery).toEqual({});
            expect(falseQuery).toEqual({ $where: "false" });
        });
    });

    describe('parameterizedSpecification', () => {
        it('should create a parameterized specification factory', () => {
            // Arrange
            const createPriceRangeSpec = parameterizedSpecification({
                name: (params) => `Price Between ${params.min} and ${params.max}`,
                createPredicate: (params) => {
                    return (product) =>
                        product.price >= params.min && product.price <= params.max;
                },
                createQuery: (params) => {
                    return () => ({
                        price: { $gte: params.min, $lte: params.max }
                    });
                }
            });

            // Act
            const lowPriceSpec = createPriceRangeSpec({ min: 0, max: 10 });
            const midPriceSpec = createPriceRangeSpec({ min: 10, max: 50 });

            // Assert
            expect(lowPriceSpec.name).toBe('Price Between 0 and 10');
            expect(midPriceSpec.name).toBe('Price Between 10 and 50');

            expect(lowPriceSpec.isSatisfiedBy(testObjects[2])).toBe(true);  // price = 5.99
            expect(lowPriceSpec.isSatisfiedBy(testObjects[0])).toBe(false); // price = 10.99

            expect(midPriceSpec.isSatisfiedBy(testObjects[0])).toBe(true);  // price = 10.99
            expect(midPriceSpec.isSatisfiedBy(testObjects[3])).toBe(false); // price = 99.99

            // Test query generation
            expect(lowPriceSpec.toQuery()).toEqual({
                price: { $gte: 0, $lte: 10 }
            });
        });

        it('should validate required parameters', () => {
            // Act & Assert
            expect(() => parameterizedSpecification()).toThrow();
            expect(() => parameterizedSpecification({})).toThrow();
            expect(() => parameterizedSpecification({ name: 'Test' })).toThrow();
        });

        it('should work with static names', () => {
            // Arrange
            const createIdSpec = parameterizedSpecification({
                name: 'ID Specification',
                createPredicate: (id) => (obj) => obj.id === id
            });

            // Act
            const idIs1 = createIdSpec(1);

            // Assert
            expect(idIs1.name).toBe('ID Specification');
            expect(idIs1.isSatisfiedBy(testObjects[0])).toBe(true);  // id = 1
            expect(idIs1.isSatisfiedBy(testObjects[1])).toBe(false); // id = 2
        });
    });
});
