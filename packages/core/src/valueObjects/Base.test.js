// packages/core/src/valueObjects/Base.test.js
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { valueObject } from "./Base.js";
import { ValidationError } from "../errors/index.js";

describe("valueObject", () => {
  // Helper function to create a test value object
  const createTestValueObject = () => {
    return valueObject({
      name: "TestValue",
      schema: z.object({
        value: z.number().positive(),
        label: z.string().min(1),
      }),
      methods: {
        getValue() {
          return this.value;
        },
        doubled() {
          const factory = this.constructor;
          return factory.create({
            value: this.value * 2,
            label: this.label,
          });
        },
      },
    });
  };

  it("should throw error if name is missing", () => {
    // Arrange & Act & Assert
    expect(() =>
      valueObject({
        schema: z.object({ value: z.number() }),
      }),
    ).toThrow("Value object name is required");
  });

  it("should throw error if schema is missing", () => {
    // Arrange & Act & Assert
    expect(() =>
      valueObject({
        name: "TestValue",
      }),
    ).toThrow("Value object schema is required");
  });

  it("should create a value object with valid data", () => {
    // Arrange
    const TestValue = createTestValueObject();
    const data = { value: 5, label: "test" };

    // Act
    const instance = TestValue.create(data);

    // Assert
    expect(instance.value).toBe(5);
    expect(instance.label).toBe("test");
  });

  it("should throw ValidationError for invalid data", () => {
    // Arrange
    const TestValue = createTestValueObject();
    const invalidData = { value: -5, label: "test" };

    // Act & Assert
    expect(() => TestValue.create(invalidData)).toThrow(ValidationError);

    try {
      TestValue.create(invalidData);
    } catch (error) {
      expect(error.message).toContain("Invalid TestValue");
      expect(error.context.objectType).toBe("TestValue");
    }
  });

  it("should create immutable objects", () => {
    // Arrange
    const TestValue = createTestValueObject();
    const instance = TestValue.create({ value: 5, label: "test" });

    // Act & Assert
    expect(() => {
      instance.value = 10;
    }).toThrow();
    expect(() => {
      instance.label = "changed";
    }).toThrow();
    expect(() => {
      instance.newProp = "new";
    }).toThrow();
  });

  it("should include custom methods in the instance", () => {
    // Arrange
    const TestValue = createTestValueObject();

    // Act
    const instance = TestValue.create({ value: 5, label: "test" });

    // Assert
    expect(typeof instance.getValue).toBe("function");
    expect(instance.getValue()).toBe(5);

    // Test method that returns a new instance
    const doubled = instance.doubled();
    expect(doubled.value).toBe(10);
    expect(doubled.label).toBe("test");
  });

  it("should implement equals method comparing all properties", () => {
    // Arrange
    const TestValue = createTestValueObject();
    const instance1 = TestValue.create({ value: 5, label: "test" });
    const instance2 = TestValue.create({ value: 5, label: "test" });
    const instance3 = TestValue.create({ value: 10, label: "test" });

    // Act & Assert
    expect(instance1.equals(instance2)).toBe(true);
    expect(instance1.equals(instance3)).toBe(false);
    expect(instance1.equals(null)).toBe(false);
    expect(instance1.equals(undefined)).toBe(false);

    // Same instance equals itself
    expect(instance1.equals(instance1)).toBe(true);
  });

  it("should implement toString method", () => {
    // Arrange
    const TestValue = createTestValueObject();
    const instance = TestValue.create({ value: 5, label: "test" });

    // Act
    const stringRepresentation = instance.toString();

    // Assert
    expect(stringRepresentation).toBe('TestValue({"value":5,"label":"test"})');
  });

  describe("extend", () => {
    it("should allow extending a value object with additional validation", () => {
      // Arrange
      const TestValue = createTestValueObject();

      // Act
      const ExtendedValue = TestValue.extend({
        name: "ExtendedValue",
        schema: (baseSchema) =>
          baseSchema.extend({
            extra: z.boolean().default(false),
          }),
      });

      // Assert
      expect(typeof ExtendedValue.create).toBe("function");

      // Create instance with extra property
      const instance = ExtendedValue.create({
        value: 5,
        label: "test",
        extra: true,
      });

      expect(instance.value).toBe(5);
      expect(instance.label).toBe("test");
      expect(instance.extra).toBe(true);

      // Default value should be applied
      const instanceWithDefault = ExtendedValue.create({
        value: 5,
        label: "test",
      });

      expect(instanceWithDefault.extra).toBe(false);
    });

    it("should allow extending a value object with additional methods", () => {
      // Arrange
      const TestValue = createTestValueObject();

      // Act
      const ExtendedValue = TestValue.extend({
        name: "ExtendedValue",
        methods: {
          tripled() {
            const factory = this.constructor;
            return factory.create({
              value: this.value * 3,
              label: this.label,
            });
          },
        },
      });

      // Assert
      const instance = ExtendedValue.create({ value: 5, label: "test" });

      // Original methods should still work
      expect(instance.getValue()).toBe(5);
      expect(instance.doubled().value).toBe(10);

      // New methods should work
      expect(instance.tripled().value).toBe(15);
    });

    it("should throw error if extended value object name is missing", () => {
      // Arrange
      const TestValue = createTestValueObject();

      // Act & Assert
      expect(() =>
        TestValue.extend({
          schema: (baseSchema) => baseSchema,
        }),
      ).toThrow("Extended value object name is required");
    });
  });
});
