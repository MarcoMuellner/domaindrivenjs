import { DomainError } from "../errors/DomainError";

/**
 * Error thrown when event bus operations fail
 */
export class EventBusError extends DomainError {
  constructor(
    message: string,
    cause?: Error,
    context?: Record<string, unknown>
  );
  
  context: Record<string, unknown>;
}

/**
 * Event handler configuration
 */
export type EventHandler = {
  /**
   * The event handler function
   */
  handler: Function;
  
  /**
   * Whether the handler should only be called once
   */
  once: boolean;
}

/**
 * Subscription to an event
 */
export type EventSubscription = {
  /**
   * Function to call to unsubscribe
   */
  unsubscribe: () => void;
}

/**
 * Adapter for event bus operations
 */
export type EventBusAdapter = {
  /**
   * Function to publish an event
   */
  publish: (event: unknown) => Promise<void>;
  
  /**
   * Function to subscribe to an event
   */
  subscribe: (eventType: string, handler: Function) => Function;
}

/**
 * Creates an event bus for publishing and subscribing to domain events
 */
export function createEventBus(options?: {
  /**
   * Custom adapter for event bus operations
   */
  adapter?: EventBusAdapter;
}): {
  /**
   * Publishes an event to all subscribers
   */
  publish: (event: Record<string, unknown>) => Promise<void>;
  
  /**
   * Publishes multiple events in sequence
   */
  publishAll: (events: Array<Record<string, unknown>>) => Promise<void>;
  
  /**
   * Subscribes to an event type
   */
  on: (
    eventTypeOrFactory: string | { type: string },
    handler: Function,
    options?: { once?: boolean }
  ) => EventSubscription;
  
  /**
   * Subscribes to an event type for a single invocation
   */
  once: (
    eventTypeOrFactory: string | { type: string },
    handler: Function
  ) => EventSubscription;
  
  /**
   * Adds an event to the pending queue
   */
  addPendingEvent: (event: Record<string, unknown>) => void;
  
  /**
   * Clears the pending events queue
   */
  clearPendingEvents: () => Array<Record<string, unknown>>;
  
  /**
   * Publishes all pending events and clears the queue
   */
  publishPendingEvents: () => Promise<void>;
  
  /**
   * Replaces the default implementation with a custom one
   */
  setAdapter: (customAdapter: EventBusAdapter) => void;
  
  /**
   * Removes all event handlers
   */
  reset: () => void;
};

/**
 * Default event bus instance
 */
export const eventBus: ReturnType<typeof createEventBus>;