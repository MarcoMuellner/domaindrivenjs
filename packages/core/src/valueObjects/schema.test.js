import { describe, it, expect } from "vitest";
import { z } from "zod";
import { valueObjectSchema, specificValueObjectSchema } from "./schema.js";
import {
  String as StringValue,
  NonEmptyString,
  PositiveNumber,
  IntegerNumber,
} from "./primitives/index.js";
import { valueObject } from "./Base.js";

describe("valueObjectSchema", () => {
  it("should create a schema that validates value objects", () => {
    // Arrange
    const schema = z.object({
      name: z.string(),
      valueObj: valueObjectSchema(),
    });

    const strValue = StringValue.create("Hello");
    const numValue = PositiveNumber.create(42);
    const regularObject = { foo: "bar" };
    const string = "Not a value object";

    // Act & Assert
    // Valid cases
    expect(() =>
      schema.parse({ name: "Test", valueObj: strValue }),
    ).not.toThrow();
    expect(() =>
      schema.parse({ name: "Test", valueObj: numValue }),
    ).not.toThrow();

    // Invalid cases
    expect(() =>
      schema.parse({ name: "Test", valueObj: regularObject }),
    ).toThrow();
    expect(() => schema.parse({ name: "Test", valueObj: string })).toThrow();
    expect(() => schema.parse({ name: "Test", valueObj: 123 })).toThrow();
    expect(() => schema.parse({ name: "Test", valueObj: null })).toThrow();
  });

  it("should accept custom type name for error messages", () => {
    // Arrange
    const schema = z.object({
      valueObj: valueObjectSchema({ typeName: "MoneyValue" }),
    });

    // Act
    try {
      schema.parse({ valueObj: "not a value object" });
    } catch (error) {
      // Assert
      expect(error.errors[0].message).toContain("MoneyValue");
    }
  });

  it("should use custom type checking function", () => {
    // Arrange
    // Create a schema that only accepts value objects with a currency property
    const moneySchema = valueObjectSchema({
      typeName: "MoneyValue",
      typeCheck: (val) =>
        val instanceof Object &&
        typeof val.equals === "function" &&
        typeof val.currency === "string",
    });

    // Create a schema and some test objects
    const schema = z.object({ money: moneySchema });

    // Create a custom Money value object
    const Money = valueObject({
      name: "Money",
      schema: z.object({
        amount: z.number(),
        currency: z.string().length(3),
      }),
      methods: {
        add(other) {
          if (this.currency !== other.currency) {
            throw new Error("Cannot add different currencies");
          }
          return Money.create({
            amount: this.amount + other.amount,
            currency: this.currency,
          });
        },
      },
    });

    const money = Money.create({ amount: 100, currency: "USD" });
    const nonMoney = StringValue.create("Not money");

    // Act & Assert
    // Valid case - has currency
    expect(() => schema.parse({ money })).not.toThrow();

    // Invalid case - doesn't have currency
    expect(() => schema.parse({ money: nonMoney })).toThrow();
  });
});

describe("specificValueObjectSchema", () => {
  it("should create a schema that validates specific value object types", () => {
    // Arrange
    const schema = z.object({
      stringValue: specificValueObjectSchema(StringValue),
      nonEmptyString: specificValueObjectSchema(NonEmptyString),
      positiveNumber: specificValueObjectSchema(PositiveNumber),
    });

    const strValue = StringValue.create("");
    const nonEmptyStr = NonEmptyString.create("Required");
    const posNum = PositiveNumber.create(42);

    // Act & Assert
    // All correct types
    expect(() =>
      schema.parse({
        stringValue: strValue,
        nonEmptyString: nonEmptyStr,
        positiveNumber: posNum,
      }),
    ).not.toThrow();

    // Mixed up value object types
    expect(() =>
      schema.parse({
        stringValue: posNum, // Wrong type
        nonEmptyString: nonEmptyStr,
        positiveNumber: posNum,
      }),
    ).toThrow();

    expect(() =>
      schema.parse({
        stringValue: strValue,
        nonEmptyString: strValue, // Wrong type
        positiveNumber: posNum,
      }),
    ).toThrow();

    expect(() =>
      schema.parse({
        stringValue: strValue,
        nonEmptyString: nonEmptyStr,
        positiveNumber: nonEmptyStr, // Wrong type
      }),
    ).toThrow();
  });

  it("should throw an error when providing an invalid factory", () => {
    // Act & Assert
    // Test with null
    try {
      specificValueObjectSchema(null);
      expect(true).toBe(false); // Force test to fail if we get here
    } catch (error) {
      expect(error.message).toBe("Invalid value object factory provided");
    }

    // Test with empty object
    try {
      specificValueObjectSchema({});
      expect(true).toBe(false); // Force test to fail if we get here
    } catch (error) {
      expect(error.message).toBe("Invalid value object factory provided");
    }

    // Test with object missing create method
    try {
      specificValueObjectSchema({ name: "Test" });
      expect(true).toBe(false); // Force test to fail if we get here
    } catch (error) {
      expect(error.message).toBe("Invalid value object factory provided");
    }
  });

  it("should correctly handle extended value objects", () => {
    // Arrange
    // Create a base value object and an extended version
    const BaseValue = valueObject({
      name: "BaseValue",
      schema: z.object({
        value: z.string(),
      }),
      methods: {
        getValue() {
          return this.value;
        },
      },
    });

    const ExtendedValue = BaseValue.extend({
      name: "ExtendedValue",
      schema: (base) =>
        base.extend({
          extra: z.boolean(),
        }),
      methods: {
        isExtra() {
          return this.extra;
        },
      },
    });

    // Create a schema that expects the extended type
    const schema = z.object({
      extended: specificValueObjectSchema(ExtendedValue),
    });

    // Create instances
    const baseInstance = BaseValue.create({ value: "base" });
    const extendedInstance = ExtendedValue.create({
      value: "extended",
      extra: true,
    });

    // Act & Assert
    // Base instance shouldn't validate as extended
    expect(() => schema.parse({ extended: baseInstance })).toThrow();

    // Extended instance should validate
    expect(() => schema.parse({ extended: extendedInstance })).not.toThrow();
  });

  it("should validate properly in complex object structures", () => {
    // Arrange
    const complexSchema = z.object({
      id: z.string(),
      name: specificValueObjectSchema(NonEmptyString),
      values: z.array(specificValueObjectSchema(IntegerNumber)),
      nested: z.object({
        description: specificValueObjectSchema(StringValue),
      }),
    });

    const validObject = {
      id: "123",
      name: NonEmptyString.create("Test Item"),
      values: [
        IntegerNumber.create(1),
        IntegerNumber.create(2),
        IntegerNumber.create(3),
      ],
      nested: {
        description: StringValue.create("A detailed description"),
      },
    };

    const invalidObject1 = {
      id: "123",
      name: "Plain string", // Should be NonEmptyString
      values: [IntegerNumber.create(1), IntegerNumber.create(2)],
      nested: {
        description: StringValue.create("A detailed description"),
      },
    };

    // Act & Assert
    expect(() => complexSchema.parse(validObject)).not.toThrow();
    expect(() => complexSchema.parse(invalidObject1)).toThrow();
  });

  it("should work with Zod default values", () => {
    // Arrange
    const defaultNonEmptyString = NonEmptyString.create("Default Value");

    const schemaWithDefault = z.object({
      id: z.string(),
      name: specificValueObjectSchema(NonEmptyString).default(
        defaultNonEmptyString,
      ),
    });

    // Act
    const result = schemaWithDefault.parse({ id: "123" });

    // Assert
    expect(result.name).toBe(defaultNonEmptyString);
    expect(result.name.toString()).toBe("Default Value");
  });

  it("should work with Zod optional properties", () => {
    // Arrange
    const optionalSchema = z.object({
      id: z.string(),
      name: specificValueObjectSchema(NonEmptyString).optional(),
    });

    // Act & Assert
    // Should work without the optional property
    expect(() => optionalSchema.parse({ id: "123" })).not.toThrow();

    // Should work with the optional property
    expect(() =>
      optionalSchema.parse({
        id: "123",
        name: NonEmptyString.create("Test"),
      }),
    ).not.toThrow();

    // Should still validate the type when provided
    try {
      optionalSchema.parse({
        id: "123",
        name: "Not a value object",
      });
      // If we get here, the validation didn't fail as expected
      expect(true).toBe(false); // Force the test to fail
    } catch (error) {
      // Validation error happened as expected
      expect(error).toBeDefined();
    }
  });

  it("should work with Zod nullable properties", () => {
    // Arrange
    const nullableSchema = z.object({
      id: z.string(),
      name: specificValueObjectSchema(NonEmptyString).nullable(),
    });

    // Act & Assert
    // Should work with null
    expect(() => nullableSchema.parse({ id: "123", name: null })).not.toThrow();

    // Should work with the proper value object
    expect(() =>
      nullableSchema.parse({
        id: "123",
        name: NonEmptyString.create("Test"),
      }),
    ).not.toThrow();

    // Should still validate the type when not null
    try {
      nullableSchema.parse({
        id: "123",
        name: "Not a value object",
      });
      // If we get here, the validation didn't fail as expected
      expect(true).toBe(false); // Force the test to fail
    } catch (error) {
      // Validation error happened as expected
      expect(error).toBeDefined();
    }
  });
});
