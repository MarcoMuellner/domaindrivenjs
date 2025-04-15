// packages/core/src/aggregates/EventSourced.js
import { eventBus } from '../events/EventBus.js';

/**
 * @typedef {Object} AggregateWithEvents
 * @property {Array<Object>} _domainEvents - The domain events emitted by this aggregate
 * @property {function(string|Object, Object): AggregateWithEvents} emitEvent - Emits a new domain event
 * @property {function(): Array<Object>} getDomainEvents - Gets all domain events
 * @property {function(): AggregateWithEvents} clearDomainEvents - Clears all domain events
 */

/**
 * Enhances an aggregate instance with event sourcing capabilities
 *
 * @template T - The aggregate type
 * @param {T} aggregate - The aggregate instance to enhance
 * @returns {T & AggregateWithEvents} The aggregate with event sourcing capabilities
 */
export function withEvents(aggregate) {
    // Don't modify if already has events capability
    if (aggregate._domainEvents) {
        return aggregate;
    }

    // Store events in a mutable array outside the frozen object
    const domainEvents = [];

    /**
     * Emits a domain event from this aggregate
     *
     * @param {string|Object} eventTypeOrFactory - The event type string or event factory
     * @param {Object} eventData - The event data
     * @returns {T & AggregateWithEvents} The aggregate instance for chaining
     */
    function emitEvent(eventTypeOrFactory, eventData) {
        let event;

        // First check for null/undefined
        if (eventTypeOrFactory === null || eventTypeOrFactory === undefined) {
            throw new Error('Invalid event type or factory');
        }

        // Handle different types of event references
        if (typeof eventTypeOrFactory === 'string') {
            // Simple event with just a type
            event = {
                type: eventTypeOrFactory,
                ...eventData,
                timestamp: new Date()
            };
        } else if (typeof eventTypeOrFactory === 'object' && typeof eventTypeOrFactory.create === 'function') {
            // Event factory
            try {
                event = eventTypeOrFactory.create(eventData);
            } catch (error) {
                throw new Error('Invalid event type or factory');
            }
        } else {
            throw new Error('Invalid event type or factory');
        }

        // Add the event to the list
        domainEvents.push(event);

        return eventEmittingAggregate;
    }

    /**
     * Gets all domain events emitted by this aggregate
     *
     * @returns {Array<Object>} The domain events
     */
    function getDomainEvents() {
        return [...domainEvents];
    }

    /**
     * Clears all domain events from this aggregate
     *
     * @returns {T & AggregateWithEvents} The aggregate instance for chaining
     */
    function clearDomainEvents() {
        // Clear the array without reassigning it
        domainEvents.length = 0;
        return eventEmittingAggregate;
    }

    // Create a new object with the event-emitting capabilities
    const eventEmittingAggregate = Object.freeze({
        ...aggregate,
        // Create a getter for _domainEvents that returns a copy of the events
        get _domainEvents() {
            return [...domainEvents];
        },
        emitEvent,
        getDomainEvents,
        clearDomainEvents
    });

    return eventEmittingAggregate;
}

/**
 * Updates an aggregate with event sourcing capabilities, preserving any existing events
 *
 * @template T - The aggregate type
 * @param {T & AggregateWithEvents} originalAggregate - The original aggregate with events
 * @param {T} updatedAggregate - The updated aggregate instance
 * @returns {T & AggregateWithEvents} The updated aggregate with events from the original
 */
export function updateWithEvents(originalAggregate, updatedAggregate) {
    // If the original didn't have events, just add event capability to the new one
    if (!originalAggregate._domainEvents) {
        return withEvents(updatedAggregate);
    }

    // Create a new aggregate with event capability
    const updatedWithEvents = withEvents(updatedAggregate);

    // Copy events from original aggregate by emitting them on the new one
    originalAggregate._domainEvents.forEach(event => {
        // We need to recreate events with the same type and data
        // but without relying on direct array manipulation
        if (typeof event.type === 'string') {
            // Extract data without the type and timestamp
            const { type, timestamp, ...eventData } = event;

            // Create a new object for the event data with the original timestamp
            const newEventData = {
                ...eventData,
                timestamp: timestamp
            };

            // Emit the event with the same type and data
            updatedWithEvents.emitEvent(type, newEventData);
        }
    });

    return updatedWithEvents;
}
