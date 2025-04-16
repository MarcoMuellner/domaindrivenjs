import { describe, it, expect } from "vitest";
import { ValidationError } from "./ValidationError.js";
import { DomainError } from "./DomainError.js";

describe("ValidationError", () => {
  // Test basic validation error creation
  it("should create a validation error with message", () => {
    // Arrange
    const message = "Invalid input";

    // Act
    const error = new ValidationError(message);

    // Assert
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe(message);
    expect(error.context).toEqual({});
    expect(error.cause).toBeUndefined();
  });

  // Test with cause
  it("should create a validation error with cause", () => {
    // Arrange
    const message = "Validation failed";
    const cause = new Error("Zod validation error");

    // Act
    const error = new ValidationError(message, cause);

    // Assert
    expect(error.message).toBe(message);
    expect(error.cause).toBe(cause);
    expect(error.context).toEqual({});
  });

  // Test with context
  it("should store additional context information", () => {
    // Arrange
    const message = "Invalid email format";
    const context = {
      field: "email",
      value: "not-an-email",
      objectType: "User",
    };

    // Act
    const error = new ValidationError(message, undefined, context);

    // Assert
    expect(error.message).toBe(message);
    expect(error.context).toEqual(context);
  });

  // Test with both cause and context
  it("should handle both cause and context", () => {
    // Arrange
    const message = "Validation failed";
    const cause = new Error("Underlying error");
    const context = { field: "username", constraints: ["min:3", "max:20"] };

    // Act
    const error = new ValidationError(message, cause, context);

    // Assert
    expect(error.message).toBe(message);
    expect(error.cause).toBe(cause);
    expect(error.context).toEqual(context);
  });

  // Test error message formatting
  it("should format error message with context details when toString is called", () => {
    // Arrange
    const message = "Validation failed";
    const context = {
      field: "price",
      value: -10,
      constraint: "must be positive",
    };

    // Act
    const error = new ValidationError(message, undefined, context);

    // Assert
    // The default toString behavior comes from Error
    expect(error.toString()).toContain("ValidationError");
    expect(error.toString()).toContain(message);
  });
});
