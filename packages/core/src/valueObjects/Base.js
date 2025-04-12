import {z} from 'zod';
import {ValidationError} from '../errors/index.js';

/**
 * Creates a value object factory
 *
 * Value objects in Domain-Driven Design are:
 * 1. Defined by their attributes, not an identity
 * 2. Immutable - any modification creates a new instance
 * 3. Comparable by value - two instances with the same attributes are equal
 *
 * Use value objects when:
 * - The concept is defined by its attributes (measurements, descriptors)
 * - There's no continuity of identity through time
 * - The object doesn't have a meaningful lifecycle (tracking changes)
 * - Immutability is desirable to prevent side effects
 * - The object is subordinate to or describes an Entity
 *
 * Common examples: Money, Address, DateRange, Coordinates, Email, etc.
 *
 * @template T
 * @typedef {T & {
 *   equals: (other: any) => boolean,
 *   toString: () => string,
 *   [key: string]: any
 * }} ValueObject<T> - A value object with properties from T plus standard methods
 *
 * @template T
 * @typedef {Object} ValueObjectFactory
 * @property {(data: any) => ValueObject<T>} create - Creates a new instance of the value object
 * @property {z.ZodSchema} schema - The Zod schema used for validation
 * @property {(options: {name: string, schema?: function, methods?: object}) => ValueObjectFactory} extend - Creates an extended version of this value object
 *
 * @template {z.ZodType} SchemaType
 * @param {object} options - Value object configuration
 * @param {string} options.name - Name of the value object
 * @param {SchemaType} options.schema - Zod schema for validation
 * @param {Record<string, Function>} [options.methods={}] - Methods to attach to the value object
 * @returns {ValueObjectFactory<z.infer<SchemaType>>} A factory function that creates value objects
 *
 * @example
 * const Money = valueObject({
 *   name: 'Money',
 *   schema: z.object({
 *     amount: z.number().nonnegative(),
 *     currency: z.string().length(3)
 *   }),
 *   methods: {
 *     add(other) {
 *       if (this.currency !== other.currency) {
 *         throw new Error('Cannot add different currencies');
 *       }
 *       return Money.create({
 *         amount: this.amount + other.amount,
 *         currency: this.currency
 *       });
 *     }
 *   }
 * });
 *
 * // Usage
 * const price = Money.create({ amount: 10.99, currency: 'USD' });
 * const tax = Money.create({ amount: 0.55, currency: 'USD' });
 * const total = price.add(tax); // Returns a new Money instance
 */
export function valueObject({name, schema, methods = {}})
{
    if (!name) throw new Error('Value object name is required');
    if (!schema) throw new Error('Value object schema is required');

    /**
     * Factory function to create value objects
     * @param {any} data - The data to create the value object from
     * @returns {ValueObject<z.infer<typeof schema>>} A new value object instance
     * @throws {ValidationError} If validation fails
     */
    function create(data)
    {
        try
        {
            // Parse and validate the data using the schema
            const validatedData = schema.parse(data);

            // Create the frozen object with the validated data
            const instance = Object.freeze({
                ...validatedData,

                /**
                 * Compares this value object with another for equality
                 * Value objects are equal when all their properties are equal
                 *
                 * @param {any} other - The object to compare with
                 * @returns {boolean} True if the objects are equal
                 */
                equals(other)
                {
                    if (other === null || other === undefined)
                    {
                        return false
                    }

                    if (this === other)
                    {
                        return true
                    }

                    // Compare all properties
                    const thisProps = Object.getOwnPropertyNames(this);
                    const otherProps = Object.getOwnPropertyNames(other);

                    if (thisProps.length !== otherProps.length)
                    {
                        return false
                    }

                    for (const prop of thisProps)
                    {
                        // Skip the equals method and other functions
                        if (typeof this[prop] === 'function')
                        {
                            continue
                        }

                        if (!other.hasOwnProperty(prop) || this[prop] !== other[prop])
                        {
                            return false;
                        }
                    }

                    return true;
                },

                /**
                 * Returns a string representation of the value object
                 * @returns {string}
                 */
                toString()
                {
                    return `${name}(${JSON.stringify(validatedData)})`;
                },

                // Add custom methods to the instance
                ...Object.entries(methods).reduce((acc, [methodName, methodFn]) =>
                {
                    acc[methodName] = methodFn.bind(instance);
                    return acc;
                }, {})
            });

            return instance;
        } catch (error)
        {
            if (error instanceof z.ZodError)
            {
                throw new ValidationError(
                    `Invalid ${name}: ${error.errors.map(e => e.message).join(', ')}`,
                    error,
                    {objectType: name, input: data}
                );
            }
            throw error;
        }
    }

    /**
     * Extends this value object with additional validation and methods
     *
     * @param {object} options - Extension options
     * @param {string} options.name - Name of the extended value object
     * @param {function} [options.schema] - Function to transform the base schema
     * @param {object} [options.methods] - Additional methods for the extended object
     * @returns {ValueObjectFactory} A new factory for the extended value object
     *
     * @example
     * const Email = NonEmptyString.extend({
     *   name: 'Email',
     *   schema: (baseSchema) => baseSchema.email().toLowerCase(),
     *   methods: {
     *     getDomain() {
     *       return this.split('@')[1];
     *     }
     *   }
     * });
     */
    function extend({name: extendedName, schema: schemaTransformer, methods: extendedMethods = {}})
    {
        if (!extendedName)
        {
            throw new Error('Extended value object name is required');
        }

        // Create the new schema by transforming the original
        const extendedSchema = schemaTransformer ?
            schemaTransformer(schema) :
            schema;

        // Combine the methods
        const combinedMethods = {
            ...methods,
            ...extendedMethods
        };

        // Create a new value object factory
        return valueObject({
            name: extendedName,
            schema: extendedSchema,
            methods: combinedMethods
        });
    }

    // Add the schema and extend method to the factory
    create.schema = schema;

    // Return the factory with create, schema, and extend methods
    return {
        create,
        schema,
        extend
    };
}
