// packages/core/src/events/Base.test.js
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { domainEvent } from './Base.js';
import { ValidationError } from '../errors/index.js';

describe('domainEvent', () => {
    // Helper function to create a test event
    const createTestEvent = () => {
        return domainEvent({
            name: 'TestEvent',
            schema: z.object({
                entityId: z.string().uuid(),
                value: z.number().positive(),
                metadata: z.record(z.string()).optional()
            })
        });
    };

    // Basic validation tests
    describe('basic validation', () => {
        it('should throw error if name is missing', () => {
            expect(() => domainEvent({
                schema: z.object({ id: z.string() })
            })).toThrow('Event name is required');
        });

        it('should throw error if schema is missing', () => {
            expect(() => domainEvent({
                name: 'TestEvent'
            })).toThrow('Event schema is required');
        });
    });

    // Event creation tests
    describe('event creation', () => {
        it('should create an event with valid data', () => {
            // Arrange
            const TestEvent = createTestEvent();
            const id = '123e4567-e89b-12d3-a456-426614174000';
            const data = {
                entityId: id,
                value: 5
            };

            // Act
            const event = TestEvent.create(data);

            // Assert
            expect(event.entityId).toBe(id);
            expect(event.value).toBe(5);
            expect(event.type).toBe('TestEvent');
            expect(event.timestamp).toBeInstanceOf(Date);
        });

        it('should throw ValidationError for invalid data', () => {
            // Arrange
            const TestEvent = createTestEvent();
            const invalidData = {
                entityId: '123e4567-e89b-12d3-a456-426614174000',
                value: -5  // Invalid (negative) value
            };

            // Act & Assert
            expect(() => TestEvent.create(invalidData)).toThrow(ValidationError);
        });

        it('should create immutable objects', () => {
            // Arrange
            const TestEvent = createTestEvent();
            const id = '123e4567-e89b-12d3-a456-426614174000';
            const event = TestEvent.create({
                entityId: id,
                value: 5
            });

            // Act & Assert
            expect(() => { event.entityId = 'new-id'; }).toThrow();
            expect(() => { event.value = 10; }).toThrow();
            expect(() => { event.type = 'OtherEvent'; }).toThrow();
            expect(() => { event.newProperty = 'value'; }).toThrow();
        });

        it('should implement equals method comparing all properties', () => {
            // Arrange
            const TestEvent = createTestEvent();
            const id = '123e4567-e89b-12d3-a456-426614174000';

            // Use the same timestamp for both events for deterministic comparison
            const timestamp = new Date();

            const event1 = TestEvent.create({
                entityId: id,
                value: 5,
                timestamp
            });

            const event2 = TestEvent.create({
                entityId: id,
                value: 5,
                timestamp
            });

            const event3 = TestEvent.create({
                entityId: id,
                value: 10, // Different value
                timestamp
            });

            // Act & Assert
            expect(event1.equals(event2)).toBe(true);
            expect(event1.equals(event3)).toBe(false);
            expect(event1.equals(null)).toBe(false);
            expect(event1.equals(undefined)).toBe(false);
        });

        it('should implement toString method', () => {
            // Arrange
            const TestEvent = createTestEvent();
            const id = '123e4567-e89b-12d3-a456-426614174000';
            const timestamp = new Date('2023-01-01T00:00:00Z');

            const event = TestEvent.create({
                entityId: id,
                value: 5,
                timestamp
            });

            // Act
            const stringRepresentation = event.toString();

            // Assert
            expect(stringRepresentation).toContain('TestEvent');
            expect(stringRepresentation).toContain(id);
            expect(stringRepresentation).toContain('5');
            expect(stringRepresentation).toContain(timestamp.toISOString());
        });
    });

    // Extension tests
    describe('extend', () => {
        it('should allow extending an event with additional validation', () => {
            // Arrange
            const TestEvent = createTestEvent();

            // Act
            const ExtendedEvent = TestEvent.extend({
                name: 'ExtendedEvent',
                schema: (baseSchema) => baseSchema.extend({
                    extra: z.boolean().default(false)
                })
            });

            // Assert
            expect(typeof ExtendedEvent.create).toBe('function');

            // Create instance with extra property
            const id = '123e4567-e89b-12d3-a456-426614174000';
            const event = ExtendedEvent.create({
                entityId: id,
                value: 5,
                extra: true
            });

            expect(event.entityId).toBe(id);
            expect(event.value).toBe(5);
            expect(event.extra).toBe(true);
            expect(event.type).toBe('ExtendedEvent');

            // Default value should be applied
            const eventWithDefault = ExtendedEvent.create({
                entityId: id,
                value: 5
            });

            expect(eventWithDefault.extra).toBe(false);
        });

        it('should track parent event in metadata', () => {
            // Arrange
            const TestEvent = createTestEvent();

            // Act
            const ExtendedEvent = TestEvent.extend({
                name: 'ExtendedEvent',
                schema: (baseSchema) => baseSchema
            });

            // Assert
            expect(ExtendedEvent.metadata.parentEvent).toBe('TestEvent');
        });

        it('should throw error if extended event name is missing', () => {
            // Arrange
            const TestEvent = createTestEvent();

            // Act & Assert
            expect(() => TestEvent.extend({
                schema: (baseSchema) => baseSchema
            })).toThrow('Extended event name is required');
        });
    });
});
