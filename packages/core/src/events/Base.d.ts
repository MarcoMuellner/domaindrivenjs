import { z } from "zod";

/**
 * A domain event with standard methods
 */
export type DomainEvent<T> = T & {
  /**
   * The type of the event
   */
  type: string;

  /**
   * The timestamp when the event occurred
   */
  timestamp: Date;

  /**
   * Compares this event with another for equality
   */
  equals: (other: unknown) => boolean;

  /**
   * Returns a string representation of the event
   */
  toString: () => string;

  [key: string]: unknown;
}

/**
 * A factory for creating and managing domain events
 */
export type DomainEventFactory<SchemaType extends z.ZodType, T> = {
  /**
   * The event type name
   */
  type: string;

  /**
   * Creates a new instance of the domain event
   */
  create: (data: T) => DomainEvent<T>;

  /**
   * The schema used for validation
   */
  schema: SchemaType;

  /**
   * Metadata about the event
   */
  metadata: Record<string, any>;

  /**
   * Creates an extended version of this event with additional functionality
   */
  extend: <NewSchemaType extends z.ZodType = SchemaType, NewT = T>(options: {
    name: string;
    schema?: (schema: SchemaType) => NewSchemaType;
    methodsFactory?: (factory: DomainEventFactory<SchemaType, T>) => Record<string, Function>;
    metadata?: Record<string, any>;
  }) => DomainEventFactory<NewSchemaType, NewT>;
}

/**
 * Defines the structure of methods that will be bound to a domain event instance
 */
export type DomainEventMethods<T> = Record<string, (this: T, ...args: any[]) => any>;

/**
 * Creates a domain event factory
 *
 * Domain Events in Domain-Driven Design are:
 * 1. Something that happened in the domain that domain experts care about
 * 2. Immutable records of facts that occurred
 * 3. Named using past-tense verbs (e.g., OrderPlaced, PaymentReceived)
 * 4. Carriers of data relevant to the event
 */
export function domainEvent<SchemaType extends z.ZodType, T = z.infer<SchemaType>>(options: {
  /**
   * Name of the event (should be past tense)
   */
  name: string;

  /**
   * Zod schema for validation
   */
  schema: SchemaType;

  /**
   * Factory function that creates methods that will be bound to the event instance
   * The `this` context inside these methods will be the event instance
   */
  methodsFactory?: (factory: DomainEventFactory<SchemaType, T>) => DomainEventMethods<T & DomainEvent<T>>;

  /**
   * Additional metadata about the event
   */
  metadata?: Record<string, any>;
}): DomainEventFactory<SchemaType, T>;
