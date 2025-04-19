import { z } from "zod";

/**
 * An entity with standard methods
 */
export type Entity<T> = T & {
  /**
   * Compares this entity with another for equality
   */
  equals: (other: unknown) => boolean;
  
  /**
   * Returns a string representation of the entity
   */
  toString: () => string;
  
  [key: string]: unknown;
}

/**
 * Represents all properties in T as optional
 */
export type PartialOf<T> = {
  [P in keyof T]?: T[P];
};

/**
 * A factory for creating and managing entities
 */
export type EntityFactory<SchemaType extends z.ZodType, T> = {
  /**
   * Creates a new instance of the entity
   */
  create: (data: T) => Entity<T>;
  
  /**
   * Updates an entity with new values while preserving its identity
   */
  update: (entity: Entity<T>, updates: PartialOf<T>) => Entity<T>;
  
  /**
   * The schema used for validation
   */
  schema: SchemaType;
  
  /**
   * The field used as identity
   */
  identity: string;
  
  /**
   * Creates an extended version of this entity with additional functionality
   */
  extend: <NewSchemaType extends z.ZodType = SchemaType, NewT = T>(options: {
    name: string;
    schema?: (schema: SchemaType) => NewSchemaType;
    methods?: Record<string, Function>;
    identity?: string;
    historize?: boolean;
  }) => EntityFactory<NewSchemaType, NewT>;
}

/**
 * Creates an entity factory
 *
 * Entities in Domain-Driven Design are:
 * 1. Defined by their identity, not their attributes
 * 2. Mutable - their state can change over time
 * 3. Have a lifecycle - they can be created, updated, and deleted
 * 4. Encapsulate domain logic and business rules
 */
export function entity<SchemaType extends z.ZodType, T = z.infer<SchemaType>>(options: {
  /**
   * Name of the entity
   */
  name: string;
  
  /**
   * Zod schema for validation
   */
  schema: SchemaType;
  
  /**
   * Field name that serves as the identity
   */
  identity: string;
  
  /**
   * Methods to attach to the entity
   */
  methods?: Record<string, Function>;
  
  /**
   * Whether to track state changes
   */
  historize?: boolean;
}): EntityFactory<SchemaType, T>;