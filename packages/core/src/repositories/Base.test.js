// packages/core/src/repositories/Base.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { aggregate } from "../aggregates/Base.js";
import { repository, RepositoryError } from "./Base.js";
import { createInMemoryAdapter } from "./adapters/InMemory.js";
import { eventBus } from "../events/EventBus.js";

// Mock the event bus
vi.mock("../events/EventBus.js", () => ({
  eventBus: {
    publishAll: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("repository", () => {
  // Set up a test aggregate
  const TestAggregate = aggregate({
    name: "TestAggregate",
    schema: z.object({
      id: z.string(),
      name: z.string(),
      value: z.number().optional(),
      category: z.string().optional(),
    }),
    identity: "id",
    methods: {
      updateName(name) {
        return TestAggregate.update(this, { name });
      },
      emitTestEvent() {
        // Use factory update method to get a fresh aggregate with event capabilities
        return TestAggregate.update(this, {}).emitEvent("TestEvent", {
          aggregateId: this.id,
          name: this.name,
        });
      },
    },
  });

  // Specification example for testing
  const HighValueSpecification = {
    isSatisfiedBy: (aggregate) => aggregate.value > 100,
    toQuery: () => ({ value: { gt: 100 } }),
  };

  // Set up a test repository with the in-memory adapter
  let testAdapter;
  let testRepository;

  beforeEach(() => {
    // Create test data as proper aggregates first
    const testData = [
      TestAggregate.create({
        id: "test-1",
        name: "Test 1",
        value: 100,
        category: "A",
      }),
      TestAggregate.create({
        id: "test-2",
        name: "Test 2",
        value: 200,
        category: "B",
      }),
      TestAggregate.create({
        id: "test-3",
        name: "Test 3",
        value: 50,
        category: "A",
      }),
      TestAggregate.create({
        id: "test-4",
        name: "Test 4",
        value: 150,
        category: "B",
      }),
    ];

    // Extract plain objects for the adapter
    const initialData = testData.map((agg) => ({
      id: agg.id,
      name: agg.name,
      value: agg.value,
      category: agg.category,
    }));

    testAdapter = createInMemoryAdapter({
      identity: "id",
      initialData,
    });

    testRepository = repository({
      aggregate: TestAggregate,
      adapter: testAdapter,
      events: {
        publishOnSave: true,
        clearAfterPublish: true,
      },
    });

    // Reset mock
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should throw error if aggregate factory is missing", () => {
    expect(() =>
      repository({
        adapter: testAdapter,
      }),
    ).toThrow("Repository requires an aggregate factory");
  });

  it("should throw error if adapter is missing", () => {
    expect(() =>
      repository({
        aggregate: TestAggregate,
      }),
    ).toThrow("Repository requires an adapter");
  });

  it("should throw error if adapter is missing required methods", () => {
    // Create an incomplete adapter missing required methods
    const incompleteAdapter = {
      findById: vi.fn(),
      findAll: vi.fn(),
      // Missing save and delete methods
    };

    expect(() =>
      repository({
        aggregate: TestAggregate,
        adapter: incompleteAdapter,
      }),
    ).toThrow("Adapter is missing required method");
  });

  describe("findById", () => {
    it("should find an aggregate by ID", async () => {
      // Act
      const result = await testRepository.findById("test-1");

      // Assert
      expect(result).not.toBeNull();
      expect(result.id).toBe("test-1");
      expect(result.name).toBe("Test 1");
      expect(result.value).toBe(100);
    });

    it("should return null if aggregate is not found", async () => {
      // Act
      const result = await testRepository.findById("non-existent");

      // Assert
      expect(result).toBeNull();
    });

    it("should throw RepositoryError if ID is missing", async () => {
      // Act & Assert
      await expect(testRepository.findById()).rejects.toThrow(RepositoryError);
      await expect(testRepository.findById("")).rejects.toThrow(
        RepositoryError,
      );
      await expect(testRepository.findById(null)).rejects.toThrow(
        RepositoryError,
      );
    });

    it("should wrap adapter errors in RepositoryError", async () => {
      // Arrange
      const mockAdapter = {
        findById: vi.fn().mockRejectedValue(new Error("Adapter error")),
        findAll: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
      };

      const errorRepository = repository({
        aggregate: TestAggregate,
        adapter: mockAdapter,
      });

      // Act & Assert
      await expect(errorRepository.findById("test-1")).rejects.toThrow(
        RepositoryError,
      );
      expect(mockAdapter.findById).toHaveBeenCalledWith("test-1");
    });
  });

  describe("findByIds", () => {
    it("should find multiple aggregates by IDs", async () => {
      // Act
      const resultMap = await testRepository.findByIds([
        "test-1",
        "test-2",
        "non-existent",
      ]);

      // Assert
      expect(resultMap).toBeInstanceOf(Map);
      expect(resultMap.size).toBe(2);
      expect(resultMap.has("test-1")).toBe(true);
      expect(resultMap.has("test-2")).toBe(true);
      expect(resultMap.has("non-existent")).toBe(false);

      const agg1 = resultMap.get("test-1");
      expect(agg1.name).toBe("Test 1");
    });

    it("should return empty map for empty ID array", async () => {
      // Act
      const resultMap = await testRepository.findByIds([]);

      // Assert
      expect(resultMap).toBeInstanceOf(Map);
      expect(resultMap.size).toBe(0);
    });

    it("should throw RepositoryError if IDs parameter is not an array", async () => {
      // Act & Assert
      await expect(testRepository.findByIds("test-1")).rejects.toThrow(
        RepositoryError,
      );
      await expect(testRepository.findByIds(null)).rejects.toThrow(
        RepositoryError,
      );
      await expect(testRepository.findByIds({})).rejects.toThrow(
        RepositoryError,
      );
    });
  });

  describe("exists", () => {
    it("should return true if aggregate exists", async () => {
      // Act
      const result = await testRepository.exists("test-1");

      // Assert
      expect(result).toBe(true);
    });

    it("should return false if aggregate does not exist", async () => {
      // Act
      const result = await testRepository.exists("non-existent");

      // Assert
      expect(result).toBe(false);
    });

    it("should throw RepositoryError if ID is missing", async () => {
      // Act & Assert
      await expect(testRepository.exists()).rejects.toThrow(RepositoryError);
      await expect(testRepository.exists("")).rejects.toThrow(RepositoryError);
      await expect(testRepository.exists(null)).rejects.toThrow(
        RepositoryError,
      );
    });
  });

  describe("findAll", () => {
    it("should find all aggregates when no filter is provided", async () => {
      // Act
      const results = await testRepository.findAll();

      // Assert
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(4);
      expect(results[0].id).toBe("test-1");
      expect(results[1].id).toBe("test-2");
    });

    it("should apply filter criteria", async () => {
      // Act
      const results = await testRepository.findAll({ category: "A" });

      // Assert
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(2);
      expect(results[0].id).toBe("test-1");
      expect(results[1].id).toBe("test-3");
    });

    it("should return empty array if no aggregates match filter", async () => {
      // Act
      const results = await testRepository.findAll({
        category: "Non-existent",
      });

      // Assert
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(0);
    });
  });

  describe("findOne", () => {
    it("should find the first aggregate matching filter", async () => {
      // Act
      const result = await testRepository.findOne({ category: "A" });

      // Assert
      expect(result).not.toBeNull();
      expect(result.id).toBe("test-1");
      expect(result.category).toBe("A");
    });

    it("should return null if no aggregates match filter", async () => {
      // Act
      const result = await testRepository.findOne({ category: "Non-existent" });

      // Assert
      expect(result).toBeNull();
    });

    it("should throw RepositoryError if filter is missing", async () => {
      // Act & Assert
      await expect(testRepository.findOne()).rejects.toThrow(RepositoryError);
      await expect(testRepository.findOne({})).rejects.toThrow(RepositoryError);
      await expect(testRepository.findOne(null)).rejects.toThrow(
        RepositoryError,
      );
    });
  });

  describe("findBySpecification", () => {
    it("should find aggregates using specification object", async () => {
      // Act
      const results = await testRepository.findBySpecification(
        HighValueSpecification,
      );

      // Assert
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(2);
      expect(results[0].id).toBe("test-2");
      expect(results[1].id).toBe("test-4");
      expect(results[0].value).toBe(200);
      expect(results[1].value).toBe(150);
    });

    it("should find aggregates using function predicate", async () => {
      // Act
      const results = await testRepository.findBySpecification(
        (agg) => agg.name.includes("Test") && agg.value < 100,
      );

      // Assert
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("test-3");
      expect(results[0].value).toBe(50);
    });

    it("should throw RepositoryError if specification is missing", async () => {
      // Act & Assert
      await expect(testRepository.findBySpecification()).rejects.toThrow(
        "Specification is required",
      );
      await expect(testRepository.findBySpecification(null)).rejects.toThrow(
        "Specification is required",
      );
    });

    it("should throw error if specification is invalid", async () => {
      // Act & Assert
      await expect(testRepository.findBySpecification({})).rejects.toThrow(
        "Invalid specification",
      );
    });
  });

  describe("count", () => {
    it("should count all aggregates when no filter is provided", async () => {
      // Act
      const count = await testRepository.count();

      // Assert
      expect(count).toBe(4);
    });

    it("should count aggregates matching filter", async () => {
      // Act
      const count = await testRepository.count({ category: "A" });

      // Assert
      expect(count).toBe(2);
    });

    it("should return 0 if no aggregates match filter", async () => {
      // Act
      const count = await testRepository.count({ category: "Non-existent" });

      // Assert
      expect(count).toBe(0);
    });
  });

  describe("save", () => {
    it("should save an aggregate", async () => {
      // Arrange
      const aggregate = TestAggregate.create({
        id: "test-new",
        name: "New Test",
        value: 500,
        category: "C",
      });

      // Act
      await testRepository.save(aggregate);

      // Assert - should be able to find it now
      const saved = await testRepository.findById("test-new");
      expect(saved).not.toBeNull();
      expect(saved.id).toBe("test-new");
      expect(saved.name).toBe("New Test");
      expect(saved.value).toBe(500);
      expect(saved.category).toBe("C");
    });

    it("should update an existing aggregate", async () => {
      // Arrange
      const aggregate = await testRepository.findById("test-1");
      const updated = aggregate.updateName("Updated Test 1");

      // Act
      await testRepository.save(updated);

      // Assert
      const saved = await testRepository.findById("test-1");
      expect(saved.name).toBe("Updated Test 1");
    });

    it("should throw RepositoryError if aggregate is missing", async () => {
      // Act & Assert
      await expect(testRepository.save()).rejects.toThrow(RepositoryError);
      await expect(testRepository.save(null)).rejects.toThrow(RepositoryError);
    });

    it("should publish domain events when saving", async () => {
      // Arrange
      const aggregate = await testRepository.findById("test-1");
      const withEvent = aggregate.emitTestEvent();

      // Act
      await testRepository.save(withEvent);

      // Assert
      expect(eventBus.publishAll).toHaveBeenCalled();
      const events = eventBus.publishAll.mock.calls[0][0];
      expect(events.length).toBe(1);
      expect(events[0].type).toBe("TestEvent");
      expect(events[0].aggregateId).toBe("test-1");
    });
  });

  describe("saveAll", () => {
    it("should save multiple aggregates", async () => {
      // Arrange
      const newAggregates = [
        TestAggregate.create({
          id: "batch-1",
          name: "Batch 1",
          value: 1000,
          category: "D",
        }),
        TestAggregate.create({
          id: "batch-2",
          name: "Batch 2",
          value: 2000,
          category: "D",
        }),
      ];

      // Act
      await testRepository.saveAll(newAggregates);

      // Assert
      const batch1 = await testRepository.findById("batch-1");
      const batch2 = await testRepository.findById("batch-2");

      expect(batch1).not.toBeNull();
      expect(batch1.name).toBe("Batch 1");
      expect(batch2).not.toBeNull();
      expect(batch2.name).toBe("Batch 2");

      // Check count
      const count = await testRepository.count({ category: "D" });
      expect(count).toBe(2);
    });

    it("should handle empty array", async () => {
      // Act
      await testRepository.saveAll([]);

      // Assert - nothing should change
      const count = await testRepository.count();
      expect(count).toBe(4);
    });

    it("should throw RepositoryError if aggregates parameter is not an array", async () => {
      // Act & Assert
      await expect(testRepository.saveAll("not-an-array")).rejects.toThrow(
        RepositoryError,
      );
      await expect(testRepository.saveAll({})).rejects.toThrow(RepositoryError);
      await expect(testRepository.saveAll(null)).rejects.toThrow(
        RepositoryError,
      );
    });

    it("should publish events from all aggregates", async () => {
      // Arrange
      const aggregates = await testRepository.findAll({ category: "A" });

      // Add events to both aggregates
      const withEvents = aggregates.map((agg) => agg.emitTestEvent());

      // Act
      await testRepository.saveAll(withEvents);

      // Assert
      expect(eventBus.publishAll).toHaveBeenCalled();
      const events = eventBus.publishAll.mock.calls[0][0];
      expect(events.length).toBe(2); // Two events from two aggregates
    });
  });

  describe("delete", () => {
    it("should delete an aggregate by ID", async () => {
      // Arrange
      const aggregateBefore = await testRepository.findById("test-1");
      expect(aggregateBefore).not.toBeNull();

      // Act
      await testRepository.delete("test-1");

      // Assert
      const aggregateAfter = await testRepository.findById("test-1");
      expect(aggregateAfter).toBeNull();

      // Check count
      const count = await testRepository.count();
      expect(count).toBe(3);
    });

    it("should throw RepositoryError if ID is missing", async () => {
      // Act & Assert
      await expect(testRepository.delete()).rejects.toThrow(RepositoryError);
      await expect(testRepository.delete("")).rejects.toThrow(RepositoryError);
      await expect(testRepository.delete(null)).rejects.toThrow(
        RepositoryError,
      );
    });
  });

  // Tests for adapter uses direct methods vs. the fallback implementations
  describe("adapter method usage", () => {
    it("should use adapter implementation for findByIds if available", async () => {
      // Arrange
      const specialAdapter = {
        findById: vi.fn(),
        findAll: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
        findByIds: vi
          .fn()
          .mockResolvedValue(
            new Map([["test-1", { id: "test-1", name: "Test 1", value: 100 }]]),
          ),
      };

      const repoWithSpecialAdapter = repository({
        aggregate: TestAggregate,
        adapter: specialAdapter,
      });

      // Act
      await repoWithSpecialAdapter.findByIds(["test-1", "test-2"]);

      // Assert
      expect(specialAdapter.findByIds).toHaveBeenCalled();
      expect(specialAdapter.findById).not.toHaveBeenCalled();
    });

    it("should use adapter implementation for count if available", async () => {
      // Arrange
      const specialAdapter = {
        findById: vi.fn(),
        findAll: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
        count: vi.fn().mockResolvedValue(42),
      };

      const repoWithSpecialAdapter = repository({
        aggregate: TestAggregate,
        adapter: specialAdapter,
      });

      // Act
      const result = await repoWithSpecialAdapter.count({ category: "A" });

      // Assert
      expect(result).toBe(42);
      expect(specialAdapter.count).toHaveBeenCalledWith({ category: "A" });
      expect(specialAdapter.findAll).not.toHaveBeenCalled();
    });

    it("should use adapter implementation for findBySpecification if available", async () => {
      // Arrange
      const specialAdapter = {
        findById: vi.fn(),
        findAll: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
        findBySpecification: vi
          .fn()
          .mockResolvedValue([{ id: "test-2", name: "Test 2", value: 200 }]),
      };

      const repoWithSpecialAdapter = repository({
        aggregate: TestAggregate,
        adapter: specialAdapter,
      });

      // Act
      await repoWithSpecialAdapter.findBySpecification(HighValueSpecification);

      // Assert
      expect(specialAdapter.findBySpecification).toHaveBeenCalledWith(
        HighValueSpecification,
      );
      expect(specialAdapter.findAll).not.toHaveBeenCalled();
    });

    it("should use adapter implementation for saveAll if available", async () => {
      // Arrange
      const specialAdapter = {
        findById: vi.fn(),
        findAll: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
        saveAll: vi.fn().mockResolvedValue(undefined),
      };

      const repoWithSpecialAdapter = repository({
        aggregate: TestAggregate,
        adapter: specialAdapter,
      });

      const aggregates = [
        TestAggregate.create({ id: "test-a", name: "Test A" }),
        TestAggregate.create({ id: "test-b", name: "Test B" }),
      ];

      // Act
      await repoWithSpecialAdapter.saveAll(aggregates);

      // Assert
      expect(specialAdapter.saveAll).toHaveBeenCalledWith(aggregates);
      expect(specialAdapter.save).not.toHaveBeenCalled();
    });
  });
});
