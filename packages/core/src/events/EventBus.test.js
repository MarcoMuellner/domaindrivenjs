// packages/core/src/events/EventBus.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEventBus, EventBusError } from './EventBus.js';
import { z } from 'zod';
import { domainEvent } from './Base.js';

describe('EventBus', () => {
    let eventBus;

    beforeEach(() => {
        eventBus = createEventBus();
    });

    // Helper function to create a test event
    const createTestEvent = () => {
        return domainEvent({
            name: 'TestEvent',
            schema: z.object({
                entityId: z.string(),
                value: z.number()
            })
        });
    };

    describe('publishing events', () => {
        it('should publish an event to subscribers', async () => {
            // Arrange
            const TestEvent = createTestEvent();
            const handler = vi.fn();

            eventBus.on(TestEvent.type, handler);

            const event = TestEvent.create({
                entityId: 'entity-1',
                value: 42
            });

            // Act
            await eventBus.publish(event);

            // Assert
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(event);
        });

        it('should handle events with string type identifiers', async () => {
            // Arrange
            const handler = vi.fn();

            eventBus.on('SimpleEvent', handler);

            const event = {
                type: 'SimpleEvent',
                data: 'test',
                timestamp: new Date()
            };

            // Act
            await eventBus.publish(event);

            // Assert
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(event);
        });

        it('should throw error when publishing an invalid event', async () => {
            // Arrange & Act & Assert
            await expect(eventBus.publish(null))
                .rejects.toThrow(EventBusError);

            await expect(eventBus.publish({}))
                .rejects.toThrow(EventBusError);

            await expect(eventBus.publish({ data: 'test' }))
                .rejects.toThrow(EventBusError);
        });

        it('should publish multiple events in sequence', async () => {
            // Arrange
            const TestEvent = createTestEvent();
            const handler = vi.fn();

            eventBus.on(TestEvent.type, handler);

            const event1 = TestEvent.create({
                entityId: 'entity-1',
                value: 1
            });

            const event2 = TestEvent.create({
                entityId: 'entity-2',
                value: 2
            });

            // Act
            await eventBus.publishAll([event1, event2]);

            // Assert
            expect(handler).toHaveBeenCalledTimes(2);
            expect(handler).toHaveBeenNthCalledWith(1, event1);
            expect(handler).toHaveBeenNthCalledWith(2, event2);
        });
    });

    describe('subscribing to events', () => {
        it('should subscribe using event factory', async () => {
            // Arrange
            const TestEvent = createTestEvent();
            const handler = vi.fn();

            eventBus.on(TestEvent, handler);

            const event = TestEvent.create({
                entityId: 'entity-1',
                value: 42
            });

            // Act
            await eventBus.publish(event);

            // Assert
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple subscribers for the same event', async () => {
            // Arrange
            const TestEvent = createTestEvent();
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            eventBus.on(TestEvent.type, handler1);
            eventBus.on(TestEvent.type, handler2);

            const event = TestEvent.create({
                entityId: 'entity-1',
                value: 42
            });

            // Act
            await eventBus.publish(event);

            // Assert
            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledTimes(1);
        });

        it('should throw error when subscribing with invalid handler', () => {
            // Arrange & Act & Assert
            expect(() => eventBus.on('TestEvent', null))
                .toThrow(EventBusError);

            expect(() => eventBus.on('TestEvent', 'not-a-function'))
                .toThrow(EventBusError);
        });

        it('should throw error when subscribing with invalid event type', () => {
            // Arrange
            const handler = vi.fn();

            // Act & Assert
            expect(() => eventBus.on(null, handler))
                .toThrow(EventBusError);

            expect(() => eventBus.on({}, handler))
                .toThrow(EventBusError);

            expect(() => eventBus.on({ name: 'InvalidEvent' }, handler))
                .toThrow(EventBusError);
        });

        it('should allow unsubscribing from events', async () => {
            // Arrange
            const TestEvent = createTestEvent();
            const handler = vi.fn();

            const subscription = eventBus.on(TestEvent.type, handler);

            const event = TestEvent.create({
                entityId: 'entity-1',
                value: 42
            });

            // First, confirm the handler is called
            await eventBus.publish(event);
            expect(handler).toHaveBeenCalledTimes(1);

            // Act - unsubscribe
            subscription.unsubscribe();

            // Publish again
            await eventBus.publish(event);

            // Assert - handler should not be called again
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('should support one-time subscriptions', async () => {
            // Arrange
            const TestEvent = createTestEvent();
            const handler = vi.fn();

            eventBus.once(TestEvent.type, handler);

            const event = TestEvent.create({
                entityId: 'entity-1',
                value: 42
            });

            // Act - publish twice
            await eventBus.publish(event);
            await eventBus.publish(event);

            // Assert - handler should only be called once
            expect(handler).toHaveBeenCalledTimes(1);
        });
    });

    describe('pending events', () => {
        it('should add and publish pending events', async () => {
            // Arrange
            const TestEvent = createTestEvent();
            const handler = vi.fn();

            eventBus.on(TestEvent.type, handler);

            const event1 = TestEvent.create({
                entityId: 'entity-1',
                value: 1
            });

            const event2 = TestEvent.create({
                entityId: 'entity-2',
                value: 2
            });

            // Act
            eventBus.addPendingEvent(event1);
            eventBus.addPendingEvent(event2);

            // Verify pending events are not published yet
            expect(handler).not.toHaveBeenCalled();

            // Publish pending events
            await eventBus.publishPendingEvents();

            // Assert
            expect(handler).toHaveBeenCalledTimes(2);
            expect(handler).toHaveBeenNthCalledWith(1, event1);
            expect(handler).toHaveBeenNthCalledWith(2, event2);
        });

        it('should clear pending events', async () => {
            // Arrange
            const TestEvent = createTestEvent();
            const handler = vi.fn();

            eventBus.on(TestEvent.type, handler);

            const event = TestEvent.create({
                entityId: 'entity-1',
                value: 42
            });

            // Act
            eventBus.addPendingEvent(event);

            // Clear pending events
            const clearedEvents = eventBus.clearPendingEvents();

            // Try to publish pending events (should be empty now)
            await eventBus.publishPendingEvents();

            // Assert
            expect(clearedEvents).toHaveLength(1);
            expect(clearedEvents[0]).toBe(event);
            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('custom adapters', () => {
        it('should use custom adapter for publishing', async () => {
            // Arrange
            const customPublish = vi.fn().mockResolvedValue(undefined);
            const customSubscribe = vi.fn().mockReturnValue(() => {});

            const customAdapter = {
                publish: customPublish,
                subscribe: customSubscribe
            };

            const customEventBus = createEventBus({ adapter: customAdapter });

            const event = {
                type: 'TestEvent',
                data: 'test'
            };

            // Act
            await customEventBus.publish(event);

            // Assert
            expect(customPublish).toHaveBeenCalledTimes(1);
            expect(customPublish).toHaveBeenCalledWith(event);
        });

        it('should use custom adapter for subscribing', () => {
            // Arrange
            const customPublish = vi.fn().mockResolvedValue(undefined);
            const unsubscribeFn = vi.fn();
            const customSubscribe = vi.fn().mockReturnValue(unsubscribeFn);

            const customAdapter = {
                publish: customPublish,
                subscribe: customSubscribe
            };

            const customEventBus = createEventBus({ adapter: customAdapter });

            const handler = vi.fn();

            // Act
            const subscription = customEventBus.on('TestEvent', handler);
            subscription.unsubscribe();

            // Assert
            expect(customSubscribe).toHaveBeenCalledTimes(1);
            expect(customSubscribe).toHaveBeenCalledWith('TestEvent', handler);
            expect(unsubscribeFn).toHaveBeenCalledTimes(1);
        });

        it('should set a custom adapter', async () => {
            // Arrange
            const originalPublish = vi.fn().mockResolvedValue(undefined);
            const originalSubscribe = vi.fn().mockReturnValue(() => {});

            const originalAdapter = {
                publish: originalPublish,
                subscribe: originalSubscribe
            };

            const newPublish = vi.fn().mockResolvedValue(undefined);
            const newSubscribe = vi.fn().mockReturnValue(() => {});

            const newAdapter = {
                publish: newPublish,
                subscribe: newSubscribe
            };

            const customEventBus = createEventBus({ adapter: originalAdapter });

            const event = {
                type: 'TestEvent',
                data: 'test'
            };

            // Act - First publish with original adapter
            await customEventBus.publish(event);

            // Set new adapter
            customEventBus.setAdapter(newAdapter);

            // Publish again with new adapter
            await customEventBus.publish(event);

            // Assert
            expect(originalPublish).toHaveBeenCalledTimes(1);
            expect(newPublish).toHaveBeenCalledTimes(1);
        });

        it('should validate custom adapter', () => {
            // Arrange & Act & Assert
            expect(() => eventBus.setAdapter(null))
                .toThrow(EventBusError);

            expect(() => eventBus.setAdapter({}))
                .toThrow(EventBusError);

            expect(() => eventBus.setAdapter({ publish: () => {} }))
                .toThrow(EventBusError);

            expect(() => eventBus.setAdapter({ subscribe: () => {} }))
                .toThrow(EventBusError);
        });
    });

    describe('reset', () => {
        it('should clear all handlers and pending events', async () => {
            // Arrange
            const TestEvent = createTestEvent();
            const handler = vi.fn();

            eventBus.on(TestEvent.type, handler);

            const event = TestEvent.create({
                entityId: 'entity-1',
                value: 42
            });

            eventBus.addPendingEvent(event);

            // Act
            eventBus.reset();

            // Try to publish to see if handlers are cleared
            await eventBus.publish(event);

            // Try to publish pending events to see if they are cleared
            await eventBus.publishPendingEvents();

            // Assert
            expect(handler).not.toHaveBeenCalled();
        });
    });
});
