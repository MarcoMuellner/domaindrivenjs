import { z } from "zod";
import { Entity, PartialOf } from "../entities/Base";

/**
 * Defines a business rule invariant for an aggregate
 */
export type InvariantDefinition = {
  /**
   * The name of the invariant
   */
  name: string;
  
  /**
   * Function that returns true if the invariant is satisfied
   */
  check: (data: unknown) => boolean;
  
  /**
   * Optional custom error message
   */
  message?: string;
}

/**
 * An aggregate with standard methods
 */
export type Aggregate<T> = Entity<T> & {
  [key: string]: unknown;
}

/**
 * A factory for creating and managing aggregates
 */
export type AggregateFactory<SchemaType extends z.ZodType, T> = {
  /**
   * Creates a new instance of the aggregate
   */
  create: (data: T) => Aggregate<T>;
  
  /**
   * Updates an aggregate with new values while preserving its identity
   */
  update: (aggregate: Aggregate<T>, updates: PartialOf<T>) => Aggregate<T>;
  
  /**
   * The schema used for validation
   */
  schema: SchemaType;
  
  /**
   * The field used as identity
   */
  identity: string;
  
  /**
   * The invariants for this aggregate
   */
  invariants: InvariantDefinition[];
  
  /**
   * Creates an extended version of this aggregate with additional functionality
   */
  extend: <NewSchemaType extends z.ZodType = SchemaType, NewT = T>(options: {
    name: string;
    schema?: (schema: SchemaType) => NewSchemaType;
    methods?: Record<string, Function>;
    identity?: string;
    invariants?: InvariantDefinition[];
    historize?: boolean;
  }) => AggregateFactory<NewSchemaType, NewT>;
}

/**
 * Creates an aggregate factory
 *
 * Aggregates in Domain-Driven Design are:
 * 1. Clusters of entities and value objects treated as a single unit
 * 2. Have a root entity that serves as the entry point
 * 3. Maintain invariants (business rules) across the cluster
 * 4. Define transactional boundaries
 */
export function aggregate<SchemaType extends z.ZodType, T = z.infer<SchemaType>>(options: {
  /**
   * Name of the aggregate
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
   * Methods to attach to the aggregate
   */
  methods?: Record<string, Function>;
  
  /**
   * Business rules that must be satisfied
   */
  invariants?: InvariantDefinition[];
  
  /**
   * Whether to track state changes
   */
  historize?: boolean;
}): AggregateFactory<SchemaType, T>;