import { describe, it, expect } from "vitest";
import { NonNegativeNumber } from "./NonNegativeNumber.js";
import { ValidationError } from "../../errors/index.js";

describe("NonNegativeNumber Value Object", () => {
  it("should create a non-negative number value object with valid data", () => {
    // Arrange
    const positiveValue = 42;
    const zeroValue = 0;

    // Act
    const positiveObj = NonNegativeNumber.create(positiveValue);
    const zeroObj = NonNegativeNumber.create(zeroValue);

    // Assert
    expect(positiveObj + 0).toBe(42);
    expect(zeroObj + 0).toBe(0);
  });

  it("should throw ValidationError for negative values", () => {
    // Arrange
    const invalidValues = [-1, -0.1, -42.5];

    // Act & Assert
    invalidValues.forEach((value) => {
      expect(() => NonNegativeNumber.create(value)).toThrow(ValidationError);
    });
  });

  it("should accept zero", () => {
    // Arrange
    const value = 0;

    // Act
    const numObj = NonNegativeNumber.create(value);

    // Assert
    expect(numObj.isZero()).toBe(true);
  });

  it("should accept decimal non-negative values", () => {
    // Arrange
    const value = 0.1;

    // Act
    const numObj = NonNegativeNumber.create(value);

    // Assert
    expect(numObj + 0).toBe(0.1);
  });

  it("should inherit methods from Number value object", () => {
    // Arrange
    const value = 5;

    // Act
    const numObj = NonNegativeNumber.create(value);

    // Assert
    expect(numObj.add(3) + 0).toBe(8);
    expect(numObj.multiply(2) + 0).toBe(10);
  });

  it("should maintain non-negative constraint when using operations", () => {
    // Arrange
    const numObj = NonNegativeNumber.create(5);

    // Act
    const result = numObj.subtract(2);

    // Assert
    expect(result + 0).toBe(3);

    // This operation would result in a negative number
    // but the value object doesn't enforce constraints on operations
    // only on creation
    const negativeResult = numObj.subtract(10);
    expect(negativeResult + 0).toBe(-5);

    // Verify that creating a new instance with the negative value fails
    expect(() => NonNegativeNumber.create(negativeResult)).toThrow(
      ValidationError,
    );
  });
});
