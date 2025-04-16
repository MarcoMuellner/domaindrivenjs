import { z } from "zod";
import { ValidationError, DomainError } from "../errors/index.js";

/**
 * @template T
 * @typedef {T & {
 *   equals: (other: unknown) => boolean,
 *   toString: () => string,
 *   [key: string]: unknown
 * }} Entity<T>
 */

/**
 * Makes all properties in T optional
 * @template T
 * @typedef {object} PartialOf<T>
 */

/**
 * @template SchemaType
 * @template T
 * @typedef {Object} EntityFactory<SchemaType, T>
 * @property {(data: T) => Entity<T>} create - Creates a new instance of the entity
 * @property {(entity: Entity<T>, updates: PartialOf<T>) => Entity<T>} update - Updates an entity with new values
 * @property {SchemaType} schema - The Zod schema used for validation
 * @property {string} identity - The field used as identity
 * @property {<NewSchemaType, NewT>(options: {
 *   name: string,
 *   schema?: (schema: SchemaType) => NewSchemaType,
 *   methods?: Record<string, Function>,
 *   identity?: string,
 *   historize?: boolean
 * }) => EntityFactory<NewSchemaType, NewT>} extend - Creates an extended version of this entity
 */

/**
 * Creates an entity factory
 *
 * Entities in Domain-Driven Design are:
 * 1. Defined by their identity, not their attributes
 * 2. Mutable - their state can change over time
 * 3. Have a lifecycle - they can be created, updated, and deleted
 * 4. Encapsulate domain logic and business rules
 *
 * @template SchemaType - The Zod schema type
 * @template T - The inferred type from the Zod schema
 * @param {object} options - Entity configuration
 * @param {string} options.name - Name of the entity
 * @param {SchemaType} options.schema - Zod schema for validation
 * @param {string} options.identity - Field name that serves as the identity
 * @param {Record<string, Function>} [options.methods={}] - Methods to attach to the entity
 * @param {boolean} [options.historize=false] - Whether to track state changes
 * @returns {EntityFactory<SchemaType, T>} A factory object to create and manage entities
 */
export function entity({
  name,
  schema,
  identity,
  methods = {},
  historize = false,
}) {
  if (!name) throw new Error("Entity name is required");
  if (!schema) throw new Error("Entity schema is required");
  if (!identity) throw new Error("Entity identity field is required");

  /**
   * Create a new entity instance
   * @param {T} data - The data to create the entity from
   * @returns {Entity<T>} A new entity instance
   * @throws {ValidationError} If validation fails
   */
  function create(data) {
    try {
      // Parse and validate the data using the schema
      const validatedData = schema.parse(data);

      // Ensure the identity field exists
      if (validatedData[identity] === undefined) {
        throw new Error(`Identity field "${identity}" is required`);
      }

      // Create the base prototype with standard methods
      const prototype = {
        ...validatedData,

        /**
         * Compares this entity with another for equality
         * Entities are equal when they have the same identity
         *
         * @param {unknown} other - The object to compare with
         * @returns {boolean} True if the entities have the same identity
         */
        equals(other) {
          if (other === null || other === undefined) {
            return false;
          }

          if (this === other) {
            return true;
          }

          // Entities are equal if they have the same identity
          return this[identity] === other[identity];
        },

        /**
         * Returns a string representation of the entity
         * @returns {string}
         */
        toString() {
          return `${name}(${this[identity]})`;
        },
      };

      // Add all custom methods to the prototype (unbound)
      for (const [methodName, methodFn] of Object.entries(methods)) {
        prototype[methodName] = methodFn;
      }

      // Bind all methods to the complete prototype
      const boundMethods = {};
      for (const [methodName, methodFn] of Object.entries(methods)) {
        boundMethods[methodName] = methodFn.bind(prototype);
      }

      // Combine properties and methods, then freeze the object
      return Object.freeze({
        ...validatedData,
        equals: prototype.equals.bind(prototype),
        toString: prototype.toString.bind(prototype),
        ...boundMethods,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          `Invalid ${name}: ${error.errors.map((e) => e.message).join(", ")}`,
          error,
          { objectType: name, input: data },
        );
      }
      throw error;
    }
  }

  /**
   * Updates an entity with new values while preserving its identity
   * @param {Entity<T>} entity - The entity to update
   * @param {PartialOf<T>} updates - The updates to apply
   * @returns {Entity<T>} A new entity instance with updated values
   * @throws {DomainError} If the identity field is changed
   * @throws {ValidationError} If validation fails
   */
  function update(entity, updates) {
    // Ensure we're not changing the identity
    if (
      updates[identity] !== undefined &&
      updates[identity] !== entity[identity]
    ) {
      throw new DomainError(
        `Cannot change identity of ${name} from "${entity[identity]}" to "${updates[identity]}"`,
        null,
        { objectType: name, entity, updates },
      );
    }

    // Create a merged data object with the updates
    let updatedData = {
      ...entity,
      ...updates,
    };

    // Add history if enabled
    if (historize) {
      const now = new Date();
      const history = entity._history || [];
      const changes = [];

      // Calculate changes
      for (const [key, value] of Object.entries(updates)) {
        if (key !== "_history" && !deepEqual(entity[key], value)) {
          changes.push({
            field: key,
            from: entity[key],
            to: value,
            timestamp: now,
          });
        }
      }

      // Only update history if there are changes
      if (changes.length > 0) {
        updatedData._history = [
          ...history,
          {
            timestamp: now,
            changes,
          },
        ];
      } else {
        updatedData._history = history;
      }
    }

    // Create a new entity instance with the updated data
    return create(updatedData);
  }

  /**
   * Extends this entity with additional validation and methods
   *
   * @template NewSchemaType - The new Zod schema type
   * @template NewT - The inferred type from the new Zod schema
   * @param {object} options - Extension options
   * @param {string} options.name - Name of the extended entity
   * @param {(baseSchema: SchemaType) => NewSchemaType} [options.schema] - Function to transform the base schema
   * @param {Record<string, Function>} [options.methods] - Additional methods for the extended entity
   * @param {string} [options.identity] - Optional override for identity field
   * @param {boolean} [options.historize] - Optional override for historization
   * @returns {EntityFactory<NewSchemaType, NewT>} A new factory for the extended entity
   */
  function extend({
    name: extendedName,
    schema: schemaTransformer,
    methods: extendedMethods = {},
    identity: extendedIdentity,
    historize: extendedHistorize,
  }) {
    if (!extendedName) {
      throw new Error("Extended entity name is required");
    }

    // Use the extended identity or the original one
    const finalIdentity = extendedIdentity || identity;

    // Create the new schema by transforming the original
    const extendedSchema = schemaTransformer
      ? schemaTransformer(schema)
      : schema;

    // Create a new entity factory with combined methods
    return entity({
      name: extendedName,
      schema: extendedSchema,
      identity: finalIdentity,
      // Explicitly combine all parent methods with extended methods
      methods: {
        ...methods,
        ...extendedMethods,
      },
      historize:
        extendedHistorize !== undefined ? extendedHistorize : historize,
    });
  }

  // Add metadata to the factory
  create.schema = schema;
  create.identity = identity;

  // Return the factory with create, update, and extend methods
  return {
    create,
    update,
    schema,
    identity,
    extend,
  };
}

/**
 * Deep equality check for comparing entity values
 * @param {unknown} a - First value
 * @param {unknown} b - Second value
 * @returns {boolean} True if values are deeply equal
 * @private
 */
function deepEqual(a, b) {
  // Handle primitives
  if (a === b) return true;

  // Handle null or undefined
  if (a == null || b == null) return a === b;

  // Handle dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  // Handle objects
  if (typeof a === "object" && typeof b === "object") {
    // Check for value objects with equals method
    if (typeof a.equals === "function") {
      return a.equals(b);
    }

    // Handle regular objects
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(
      (key) => keysB.includes(key) && deepEqual(a[key], b[key]),
    );
  }

  return false;
}
