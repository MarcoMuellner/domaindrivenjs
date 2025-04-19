/**
 * Aggregate with event sourcing capabilities
 */
export type AggregateWithEvents = {
  /**
   * The domain events emitted by this aggregate
   */
  _domainEvents: Array<Record<string, unknown>>;
  
  /**
   * Emits a new domain event
   */
  emitEvent: (eventTypeOrFactory: string | { create: Function }, eventData: Record<string, unknown>) => AggregateWithEvents;
  
  /**
   * Gets all domain events
   */
  getDomainEvents: () => Array<Record<string, unknown>>;
  
  /**
   * Clears all domain events
   */
  clearDomainEvents: () => AggregateWithEvents;
}

/**
 * Enhances an aggregate instance with event sourcing capabilities
 */
export function withEvents<T>(
  /**
   * The aggregate instance to enhance
   */
  aggregate: T
): T & AggregateWithEvents;

/**
 * Updates an aggregate with event sourcing capabilities, preserving any existing events
 */
export function updateWithEvents<T>(
  /**
   * The original aggregate with events
   */
  originalAggregate: T & AggregateWithEvents,
  
  /**
   * The updated aggregate instance
   */
  updatedAggregate: T
): T & AggregateWithEvents;