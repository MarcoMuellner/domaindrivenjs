// packages/core/src/events/EventBus.js
import { DomainError } from '../errors/index.js';

/**
 * Error thrown when event bus operations fail
 */
export class EventBusError extends DomainError {
    /**
     * @param {string} message - Error message
     * @param {Error} [cause] - The underlying cause
     * @param {Record<string, any>} [context] - Additional context
     */
    constructor(message, cause, context = {}) {
        super(message, cause);
        this.context = context;
    }
}

/**
 * @typedef {Object} EventHandler
 * @property {Function} handler - The event handler function
 * @property {boolean} once - Whether the handler should only be called once
 */

/**
 * @typedef {Object} EventSubscription
 * @property {Function} unsubscribe - Function to call to unsubscribe
 */

/**
 * @typedef {Object} EventBusAdapter
 * @property {(event: any) => Promise<void>} publish - Function to publish an event
 * @property {(eventType: string, handler: Function) => Function} subscribe - Function to subscribe to an event
 */

/**
 * Creates an event bus for publishing and subscribing to domain events
 *
 * @param {Object} [options] - Event bus options
 * @param {EventBusAdapter} [options.adapter] - Custom adapter for event bus operations
 * @returns {Object} An event bus instance
 */
export function createEventBus(options = {}) {
    const { adapter } = options;

    // In-memory event handlers map: eventType => array of handlers
    const handlers = new Map();

    // Track pending events for eventual consistency
    const pendingEvents = [];

    /**
     * Publishes an event to all subscribers
     *
     * @param {Object} event - The event to publish
     * @returns {Promise<void>}
     */
    async function publish(event) {
        if (!event || typeof event !== 'object') {
            throw new EventBusError('Invalid event object', null, { event });
        }

        const eventType = event.type;
        if (!eventType) {
            throw new EventBusError('Event type is required', null, { event });
        }

        // If using a custom adapter, delegate to it
        if (adapter && typeof adapter.publish === 'function') {
            try {
                await adapter.publish(event);
                return;
            } catch (error) {
                throw new EventBusError(
                    `Failed to publish event "${eventType}" using adapter`,
                    error,
                    { event }
                );
            }
        }

        // Default in-memory implementation
        const eventHandlers = handlers.get(eventType) || [];

        // Execute handlers
        const promises = [];
        const removeHandlers = [];

        for (let i = 0; i < eventHandlers.length; i++) {
            const { handler, once } = eventHandlers[i];

            // Queue up promise for the handler execution
            promises.push(Promise.resolve().then(() => handler(event)));

            // Mark one-time handlers for removal
            if (once) {
                removeHandlers.push(i);
            }
        }

        // Remove one-time handlers (in reverse to avoid index issues)
        for (let i = removeHandlers.length - 1; i >= 0; i--) {
            eventHandlers.splice(removeHandlers[i], 1);
        }

        // Update handlers if any remain
        if (eventHandlers.length > 0) {
            handlers.set(eventType, eventHandlers);
        } else {
            handlers.delete(eventType);
        }

        // Wait for all handlers to complete
        await Promise.all(promises);
    }

    /**
     * Publishes multiple events in sequence
     *
     * @param {Array<Object>} events - The events to publish
     * @returns {Promise<void>}
     */
    async function publishAll(events) {
        if (!Array.isArray(events)) {
            throw new EventBusError('Events must be an array', null, { events });
        }

        for (const event of events) {
            await publish(event);
        }
    }

    /**
     * Subscribes to an event type
     *
     * @param {string|Object} eventTypeOrFactory - Event type string or event factory
     * @param {Function} handler - Function to call when event is published
     * @param {Object} [options] - Subscription options
     * @param {boolean} [options.once=false] - If true, handler will be removed after first invocation
     * @returns {EventSubscription} Subscription with unsubscribe method
     */
    function on(eventTypeOrFactory, handler, options = {}) {
        const { once = false } = options;

        if (typeof handler !== 'function') {
            throw new EventBusError('Event handler must be a function', null, { handler });
        }

        // Extract event type from string or factory
        const eventType = typeof eventTypeOrFactory === 'string'
            ? eventTypeOrFactory
            : (eventTypeOrFactory.type || null);

        if (!eventType) {
            throw new EventBusError(
                'Invalid event type or factory',
                null,
                { eventTypeOrFactory }
            );
        }

        // If using a custom adapter, delegate to it
        if (adapter && typeof adapter.subscribe === 'function') {
            try {
                const unsubscribe = adapter.subscribe(eventType, handler);
                return { unsubscribe };
            } catch (error) {
                throw new EventBusError(
                    `Failed to subscribe to event "${eventType}" using adapter`,
                    error,
                    { eventType, handler }
                );
            }
        }

        // Default in-memory implementation
        if (!handlers.has(eventType)) {
            handlers.set(eventType, []);
        }

        const eventHandlers = handlers.get(eventType);
        const handlerEntry = { handler, once };
        eventHandlers.push(handlerEntry);

        // Return subscription object with unsubscribe function
        return {
            unsubscribe: () => {
                const currentHandlers = handlers.get(eventType) || [];
                const index = currentHandlers.findIndex(h => h === handlerEntry);

                if (index !== -1) {
                    currentHandlers.splice(index, 1);

                    if (currentHandlers.length === 0) {
                        handlers.delete(eventType);
                    } else {
                        handlers.set(eventType, currentHandlers);
                    }
                }
            }
        };
    }

    /**
     * Subscribes to an event type for a single invocation
     *
     * @param {string|Object} eventTypeOrFactory - Event type string or event factory
     * @param {Function} handler - Function to call when event is published
     * @returns {EventSubscription} Subscription with unsubscribe method
     */
    function once(eventTypeOrFactory, handler) {
        return on(eventTypeOrFactory, handler, { once: true });
    }

    /**
     * Adds an event to the pending queue
     *
     * @param {Object} event - The event to queue
     */
    function addPendingEvent(event) {
        if (!event || typeof event !== 'object') {
            throw new EventBusError('Invalid event object', null, { event });
        }

        pendingEvents.push(event);
    }

    /**
     * Clears the pending events queue
     *
     * @returns {Array<Object>} The events that were in the queue
     */
    function clearPendingEvents() {
        const events = [...pendingEvents];
        pendingEvents.length = 0;
        return events;
    }

    /**
     * Publishes all pending events and clears the queue
     *
     * @returns {Promise<void>}
     */
    async function publishPendingEvents() {
        const events = clearPendingEvents();
        await publishAll(events);
    }

    /**
     * Replaces the default implementation with a custom one
     *
     * @param {EventBusAdapter} customAdapter - The custom adapter to use
     */
    function setAdapter(customAdapter) {
        if (!customAdapter || typeof customAdapter !== 'object') {
            throw new EventBusError('Invalid adapter', null, { adapter: customAdapter });
        }

        if (typeof customAdapter.publish !== 'function' ||
            typeof customAdapter.subscribe !== 'function') {
            throw new EventBusError(
                'Adapter must have publish and subscribe methods',
                null,
                { adapter: customAdapter }
            );
        }

        // Replace the adapter
        options.adapter = customAdapter;
    }

    /**
     * Removes all event handlers
     */
    function reset() {
        handlers.clear();
        pendingEvents.length = 0;
    }

    // Return the event bus interface
    return {
        publish,
        publishAll,
        on,
        once,
        addPendingEvent,
        clearPendingEvents,
        publishPendingEvents,
        setAdapter,
        reset
    };
}

// Create a default event bus instance
export const eventBus = createEventBus();
