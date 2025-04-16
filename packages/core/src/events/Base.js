// packages/core/src/events/Base.js
import { z } from "zod";
import { ValidationError } from "../errors/index.js";

/**
 * @template T
 * @typedef {T & {
 *   type: string,
 *   timestamp: Date,
 *   equals: (other: unknown) => boolean,
 *   toString: () => string,
 *   [key: string]: unknown
 * }} DomainEvent<T>
 */

/**
 * @template SchemaType
 * @template T
 * @typedef {Object} DomainEventFactory<SchemaType, T>
 * @property {string} type - The event type name
 * @property {(data: T) => DomainEvent<T>} create - Creates a new instance of the domain event
 * @property {SchemaType} schema - The Zod schema used for validation
 * @property {<NewSchemaType, NewT>(options: {
 *   name: string,
 *   schema?: (schema: SchemaType) => NewSchemaType,
 *   metadata?: Record<string, any>
 * }) => DomainEventFactory<NewSchemaType, NewT>} extend - Creates an extended version of this event
 */

/**
 * Creates a domain event factory
 *
 * Domain Events in Domain-Driven Design are:
 * 1. Something that happened in the domain that domain experts care about
 * 2. Immutable records of facts that occurred
 * 3. Named using past-tense verbs (e.g., OrderPlaced, PaymentReceived)
 * 4. Carriers of data relevant to the event
 *
 * @template SchemaType - The Zod schema type
 * @template T - The inferred type from the Zod schema
 * @param {object} options - Event configuration
 * @param {string} options.name - Name of the event (should be past tense)
 * @param {SchemaType} options.schema - Zod schema for validation
 * @param {Record<string, any>} [options.metadata={}] - Additional metadata about the event
 * @returns {DomainEventFactory<SchemaType, T>} A factory object to create domain events
 */
export function domainEvent({ name, schema, metadata = {} }) {
  if (!name) throw new Error("Event name is required");
  if (!schema) throw new Error("Event schema is required");

  // Ensure the event schema always has a timestamp
  const enhancedSchema =
    schema instanceof z.ZodObject
      ? schema.extend({
          timestamp: z.date().default(() => new Date()),
        })
      : schema;

  /**
   * Create a new domain event instance
   * @param {T} data - The event data
   * @returns {DomainEvent<T>} A new domain event instance
   * @throws {ValidationError} If validation fails
   */
  function create(data) {
    try {
      // Parse and validate the data using the schema
      const validatedData = enhancedSchema.parse(data);

      // Create the event instance
      const eventInstance = {
        ...validatedData,
        type: name,

        /**
         * Compares this event with another for equality
         * Events are equal when they have the same type and all properties are equal
         *
         * @param {unknown} other - The object to compare with
         * @returns {boolean} True if the events are equal
         */
        equals(other) {
          if (other === null || other === undefined) {
            return false;
          }

          if (this === other) {
            return true;
          }

          // Must be same event type
          if (!(typeof other === "object" && other.type === this.type)) {
            return false;
          }

          // Compare all properties
          for (const key in this) {
            if (key === "equals" || key === "toString") continue;

            if (this[key] instanceof Date && other[key] instanceof Date) {
              if (this[key].getTime() !== other[key].getTime()) {
                return false;
              }
            }
            // Regular comparison for other types
            else if (this[key] !== other[key]) {
              return false;
            }
          }

          return true;
        },

        /**
         * Returns a string representation of the event
         * @returns {string}
         */
        toString() {
          const { equals, toString, ...data } = this;
          return `${name}(${JSON.stringify(data)})`;
        },
      };

      // Freeze the event to make it immutable
      return Object.freeze(eventInstance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          `Invalid ${name} event: ${error.errors.map((e) => e.message).join(", ")}`,
          error,
          { eventType: name, input: data },
        );
      }
      throw error;
    }
  }

  /**
   * Extends this event with additional properties
   *
   * @template NewSchemaType - The new Zod schema type
   * @template NewT - The inferred type from the new Zod schema
   * @param {object} options - Extension options
   * @param {string} options.name - Name of the extended event
   * @param {(baseSchema: SchemaType) => NewSchemaType} [options.schema] - Function to transform the base schema
   * @param {Record<string, any>} [options.metadata] - Additional metadata for the extended event
   * @returns {DomainEventFactory<NewSchemaType, NewT>} A new factory for the extended event
   */
  function extend({
    name: extendedName,
    schema: schemaTransformer,
    metadata: extendedMetadata = {},
  }) {
    if (!extendedName) {
      throw new Error("Extended event name is required");
    }

    // Create the new schema by transforming the original
    const extendedSchema = schemaTransformer
      ? schemaTransformer(enhancedSchema)
      : enhancedSchema;

    // Merge metadata
    const mergedMetadata = {
      ...metadata,
      ...extendedMetadata,
      parentEvent: name,
    };

    // Create a new event factory
    return domainEvent({
      name: extendedName,
      schema: extendedSchema,
      metadata: mergedMetadata,
    });
  }

  // Add metadata to the factory
  create.type = name;
  create.schema = enhancedSchema;
  create.metadata = metadata;

  // Return the factory with create and extend methods
  return {
    type: name,
    create,
    schema: enhancedSchema,
    extend,
    metadata,
  };
}
