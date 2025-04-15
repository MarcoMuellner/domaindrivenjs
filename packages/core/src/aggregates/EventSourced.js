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

    /**
     * Emits a domain event from this aggregate
     *
     * @param {string|Object} eventTypeOrFactory - The event type string or event factory
     * @param {Object} eventData - The event data
     * @returns {T & AggregateWithEvents} The aggregate instance for chaining
     */
    function emitEvent(eventTypeOrFactory, eventData) {
        let event;

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
            event = eventTypeOrFactory.create(eventData);
        } else {
            throw new Error('Invalid event type or factory');
        }

        // Add the event to the list
        eventEmittingAggregate._domainEvents.push(event);

        return eventEmittingAggregate;
    }

    /**
     * Gets all domain events emitted by this aggregate
     *
     * @returns {Array<Object>} The domain events
     */
    function getDomainEvents() {
        return [...eventEmittingAggregate._domainEvents];
    }

    /**
     * Clears all domain events from this aggregate
     *
     * @returns {T & AggregateWithEvents} The aggregate instance for chaining
     */
    function clearDomainEvents() {
        eventEmittingAggregate._domainEvents = [];
        return eventEmittingAggregate;
    }

    // Create a new object with the event-emitting capabilities
    const eventEmittingAggregate = Object.freeze({
        ...aggregate,
        _domainEvents: [],
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

    // Transfer events from the original to the updated aggregate
    const updatedWithEvents = withEvents(updatedAggregate);

    // Copy over the events from the original
    originalAggregate._domainEvents.forEach(event => {
        updatedWithEvents._domainEvents.push(event);
    });

    return updatedWithEvents;
}
