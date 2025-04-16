import { describe, it, expect } from "vitest";
import { IntegerNumber } from "./IntegerNumber.js";
import { ValidationError } from "../../errors/index.js";

describe("IntegerNumber Value Object", () => {
  it("should create an integer number value object with valid data", () => {
    // Arrange
    const positiveValue = 42;
    const zeroValue = 0;
    const negativeValue = -10;

    // Act
    const positiveObj = IntegerNumber.create(positiveValue);
    const zeroObj = IntegerNumber.create(zeroValue);
    const negativeObj = IntegerNumber.create(negativeValue);

    // Assert
    expect(positiveObj + 0).toBe(42);
    expect(zeroObj + 0).toBe(0);
    expect(negativeObj + 0).toBe(-10);
  });

  it("should throw ValidationError for non-integer values", () => {
    // Arrange
    const invalidValues = [1.5, -3.14, 0.1];

    // Act & Assert
    invalidValues.forEach((value) => {
      expect(() => IntegerNumber.create(value)).toThrow(ValidationError);
    });
  });

  it("should accept zero", () => {
    // Arrange
    const value = 0;

    // Act
    const numObj = IntegerNumber.create(value);

    // Assert
    expect(numObj.isZero()).toBe(true);
    expect(numObj.isInteger()).toBe(true);
  });

  it("should inherit methods from Number value object", () => {
    // Arrange
    const value = 5;

    // Act
    const numObj = IntegerNumber.create(value);

    // Assert
    expect(numObj.add(3) + 0).toBe(8);
    expect(numObj.multiply(2) + 0).toBe(10);
  });

  it("should maintain integer constraint when using operations", () => {
    // Arrange
    const numObj = IntegerNumber.create(5);

    // Act
    const intResult = numObj.add(3);

    // Assert
    expect(intResult + 0).toBe(8);
    expect(intResult.isInteger()).toBe(true);

    // This operation would result in a non-integer
    // but the value object doesn't enforce constraints on operations
    // only on creation
    const floatResult = numObj.divide(2);
    expect(floatResult + 0).toBe(2.5);

    // Verify that creating a new instance with the float value fails
    expect(() => IntegerNumber.create(floatResult)).toThrow(ValidationError);
  });
});
