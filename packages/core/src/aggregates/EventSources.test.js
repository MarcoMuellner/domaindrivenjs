// packages/core/src/aggregates/EventSourced.test.js
import { describe, it, expect } from "vitest";
import { withEvents, updateWithEvents } from "./EventSourced.js";
import { z } from "zod";
import { domainEvent } from "../events/Base.js";

describe("Aggregate Events Integration", () => {
  // Helper function to create a test aggregate
  const createTestAggregate = () => {
    return {
      id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Test Aggregate",
      status: "ACTIVE",
    };
  };

  // Helper function to create a test event
  const createTestEvent = () => {
    return domainEvent({
      name: "TestEvent",
      schema: z.object({
        aggregateId: z.string(),
        property: z.string(),
        value: z.any(),
      }),
    });
  };

  describe("withEvents", () => {
    it("should add event capabilities to an aggregate", () => {
      // Arrange
      const aggregate = createTestAggregate();

      // Act
      const eventCapableAggregate = withEvents(aggregate);

      // Assert
      expect(eventCapableAggregate._domainEvents).toEqual([]);
      expect(typeof eventCapableAggregate.emitEvent).toBe("function");
      expect(typeof eventCapableAggregate.getDomainEvents).toBe("function");
      expect(typeof eventCapableAggregate.clearDomainEvents).toBe("function");
    });

    it("should preserve all properties from the original aggregate", () => {
      // Arrange
      const aggregate = createTestAggregate();

      // Act
      const eventCapableAggregate = withEvents(aggregate);

      // Assert
      expect(eventCapableAggregate.id).toBe(aggregate.id);
      expect(eventCapableAggregate.name).toBe(aggregate.name);
      expect(eventCapableAggregate.status).toBe(aggregate.status);
    });

    it("should not modify an aggregate that already has event capabilities", () => {
      // Arrange
      const aggregate = createTestAggregate();
      const eventCapableAggregate = withEvents(aggregate);

      // Add an event to the aggregate
      const TestEvent = createTestEvent();

      eventCapableAggregate.emitEvent(TestEvent, {
        aggregateId: aggregate.id,
        property: "status",
        value: "UPDATED",
      });

      // Act
      const doubleEnhanced = withEvents(eventCapableAggregate);

      // Assert
      expect(doubleEnhanced).toBe(eventCapableAggregate);
      expect(doubleEnhanced._domainEvents).toHaveLength(1);

      // Compare individual properties instead of the entire object
      const emittedEvent = doubleEnhanced._domainEvents[0];
      expect(emittedEvent.type).toBe("TestEvent");
      expect(emittedEvent.aggregateId).toBe(aggregate.id);
      expect(emittedEvent.property).toBe("status");
      expect(emittedEvent.value).toBe("UPDATED");
      expect(emittedEvent.timestamp).toBeInstanceOf(Date);
    });
  });

  describe("updateWithEvents", () => {
    it("should transfer events from original to updated aggregate", () => {
      // Arrange
      const aggregate = withEvents(createTestAggregate());
      const TestEvent = createTestEvent();

      // Add an event to the original aggregate
      aggregate.emitEvent(TestEvent, {
        aggregateId: aggregate.id,
        property: "status",
        value: "UPDATED",
      });

      // Create an updated aggregate without events
      const updatedAggregate = {
        ...aggregate,
        status: "UPDATED",
        _domainEvents: undefined,
        emitEvent: undefined,
        getDomainEvents: undefined,
        clearDomainEvents: undefined,
      };

      // Act
      const result = updateWithEvents(aggregate, updatedAggregate);

      // Assert
      expect(result.status).toBe("UPDATED");
      expect(result._domainEvents).toHaveLength(1);
      expect(result._domainEvents[0].type).toBe("TestEvent");
      expect(result._domainEvents[0].aggregateId).toBe(aggregate.id);
    });

    it("should add event capabilities if original aggregate had none", () => {
      // Arrange
      const originalAggregate = createTestAggregate();
      const updatedAggregate = {
        ...originalAggregate,
        status: "UPDATED",
      };

      // Act
      const result = updateWithEvents(originalAggregate, updatedAggregate);

      // Assert
      expect(result.status).toBe("UPDATED");
      expect(result._domainEvents).toEqual([]);
      expect(typeof result.emitEvent).toBe("function");
    });
  });

  describe("event capabilities", () => {
    it("should emit events with string type", () => {
      // Arrange
      const aggregate = withEvents(createTestAggregate());

      // Act
      const result = aggregate.emitEvent("StatusChanged", {
        aggregateId: aggregate.id,
        oldStatus: "ACTIVE",
        newStatus: "UPDATED",
      });

      // Assert
      expect(result).toBe(aggregate); // Should return itself for chaining
      expect(aggregate._domainEvents).toHaveLength(1);
      expect(aggregate._domainEvents[0].type).toBe("StatusChanged");
      expect(aggregate._domainEvents[0].aggregateId).toBe(aggregate.id);
      expect(aggregate._domainEvents[0].oldStatus).toBe("ACTIVE");
      expect(aggregate._domainEvents[0].newStatus).toBe("UPDATED");
      expect(aggregate._domainEvents[0].timestamp).toBeInstanceOf(Date);
    });

    it("should emit events with event factory", () => {
      // Arrange
      const aggregate = withEvents(createTestAggregate());
      const TestEvent = createTestEvent();

      // Act
      aggregate.emitEvent(TestEvent, {
        aggregateId: aggregate.id,
        property: "status",
        value: "UPDATED",
      });

      // Assert
      expect(aggregate._domainEvents).toHaveLength(1);
      expect(aggregate._domainEvents[0].type).toBe("TestEvent");
      expect(aggregate._domainEvents[0].aggregateId).toBe(aggregate.id);
    });

    it("should throw error for invalid event type", () => {
      // Arrange
      const aggregate = withEvents(createTestAggregate());

      // Act & Assert
      expect(() => aggregate.emitEvent(null, {})).toThrow(
        "Invalid event type or factory",
      );

      expect(() => aggregate.emitEvent({}, {})).toThrow(
        "Invalid event type or factory",
      );
    });

    it("should get all domain events", () => {
      // Arrange
      const aggregate = withEvents(createTestAggregate());
      const TestEvent = createTestEvent();

      // Add two events
      aggregate.emitEvent(TestEvent, {
        aggregateId: aggregate.id,
        property: "status",
        value: "PENDING",
      });

      aggregate.emitEvent(TestEvent, {
        aggregateId: aggregate.id,
        property: "status",
        value: "COMPLETED",
      });

      // Act
      const events = aggregate.getDomainEvents();

      // Assert
      expect(events).toHaveLength(2);
      expect(events[0].property).toBe("status");
      expect(events[0].value).toBe("PENDING");
      expect(events[1].property).toBe("status");
      expect(events[1].value).toBe("COMPLETED");

      // Verify we get a copy, not the original array
      events.pop();
      expect(aggregate._domainEvents).toHaveLength(2);
    });

    it("should clear all domain events", () => {
      // Arrange
      const aggregate = withEvents(createTestAggregate());
      const TestEvent = createTestEvent();

      // Add an event
      aggregate.emitEvent(TestEvent, {
        aggregateId: aggregate.id,
        property: "status",
        value: "UPDATED",
      });

      // Act
      const result = aggregate.clearDomainEvents();

      // Assert
      expect(result).toBe(aggregate); // Should return itself for chaining
      expect(aggregate._domainEvents).toEqual([]);
    });

    it("should support chaining of event operations", () => {
      // Arrange
      const aggregate = withEvents(createTestAggregate());
      const TestEvent = createTestEvent();

      // Act
      const result = aggregate
        .emitEvent(TestEvent, {
          aggregateId: aggregate.id,
          property: "status",
          value: "PENDING",
        })
        .emitEvent(TestEvent, {
          aggregateId: aggregate.id,
          property: "status",
          value: "PROCESSING",
        })
        .emitEvent(TestEvent, {
          aggregateId: aggregate.id,
          property: "status",
          value: "COMPLETED",
        });

      // Assert
      expect(result._domainEvents).toHaveLength(3);
      expect(result._domainEvents[0].value).toBe("PENDING");
      expect(result._domainEvents[1].value).toBe("PROCESSING");
      expect(result._domainEvents[2].value).toBe("COMPLETED");
    });
  });
});
