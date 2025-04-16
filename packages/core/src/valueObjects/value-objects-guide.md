# Working with Value Objects in domainify

Value objects are a fundamental building block in Domain-Driven Design (DDD). This guide explains how to create and use value objects effectively in your domain model with domainify.

## What are Value Objects?

Value objects are immutable objects that represent a concept in your domain and are defined by their attributes rather than an identity. Two value objects with the same attributes are considered equal, regardless of whether they are the same instance.

Key characteristics:

- **Immutable** - Cannot be changed after creation
- **Attribute-based equality** - Equal if all attributes are equal
- **Self-validating** - Ensures their values are always valid
- **Conceptual whole** - Encapsulates related attributes and behaviors

## Creating Value Objects

The core of domainify's value object implementation is the `valueObject` factory function that creates immutable, self-validating objects:

```javascript
import { z } from "zod";
import { valueObject } from "domainify";

const Money = valueObject({
  name: "Money",
  schema: z.object({
    amount: z.number().nonnegative(),
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

    multiply(factor) {
      return Money.create({
        amount: this.amount * factor,
        currency: this.currency,
      });
    },

    equals(other) {
      return this.amount === other.amount && this.currency === other.currency;
    },
  },
});

// Usage
const price = Money.create({ amount: 10.99, currency: "USD" });
const tax = Money.create({ amount: 0.55, currency: "USD" });
const total = price.add(tax); // Returns a new Money instance
```

## Built-in Value Objects

domainify provides several primitive value objects for common use cases:

### String

A general-purpose string value object with common text operations:

```javascript
import { String } from "domainify";

// Create a string
const text = String.create("Hello World");

// Use string operations
const lowercase = text.toLower();
const truncated = text.truncate(5); // "Hello..."
const padded = text.padStart(15, "-"); // "----Hello World"
const contains = text.contains("World"); // true
```

### NonEmptyString

Extends the String value object to ensure the string is not empty:

```javascript
import { NonEmptyString } from "domainify";

// Create a non-empty string
const name = NonEmptyString.create("John Doe");

// Will throw ValidationError:
try {
  NonEmptyString.create("");
} catch (error) {
  console.error(error.message); // "Invalid NonEmptyString: String must contain at least 1 character(s)"
}
```

### Number

A general-purpose number value object with mathematical operations:

```javascript
import { Number } from "domainify";

// Create a number
const num = Number.create(42);

// Use mathematical operations
const doubled = num.multiply(2);
const rounded = Number.create(3.14159).round(2); // 3.14
const formatted = num.format("en-US"); // "42"
const percentage = num.toPercentage(); // "4,200%"
const currency = num.toCurrency("USD"); // "$42.00"
```

### PositiveNumber

Extends the Number value object to ensure the number is greater than zero:

```javascript
import { PositiveNumber } from "domainify";

// Create a positive number
const price = PositiveNumber.create(19.99);

// Will throw ValidationError:
try {
  PositiveNumber.create(0);
} catch (error) {
  console.error(error.message); // "Invalid PositiveNumber: Number must be greater than 0"
}
```

### NonNegativeNumber

Ensures the number is zero or greater:

```javascript
import { NonNegativeNumber } from "domainify";

// Create a non-negative number
const count = NonNegativeNumber.create(5);
const empty = NonNegativeNumber.create(0);

// Will throw ValidationError:
try {
  NonNegativeNumber.create(-1);
} catch (error) {
  console.error(error.message); // "Invalid NonNegativeNumber: Number must be greater than or equal to 0"
}
```

### IntegerNumber

Ensures the number is an integer:

```javascript
import { IntegerNumber } from "domainify";

// Create an integer
const count = IntegerNumber.create(5);

// Will throw ValidationError:
try {
  IntegerNumber.create(5.5);
} catch (error) {
  console.error(error.message); // "Invalid IntegerNumber: Expected integer, received float"
}
```

### PercentageNumber

Ensures the number is between 0 and 1, representing a percentage:

```javascript
import { PercentageNumber } from "domainify";

// Create a percentage
const discount = PercentageNumber.create(0.25); // 25%

// Format as percentage
console.log(discount.format()); // "25%"

// Will throw ValidationError if outside 0-1 range:
try {
  PercentageNumber.create(1.5);
} catch (error) {
  console.error(error.message); // "Invalid PercentageNumber: Number must be less than or equal to 1"
}
```

### Identifier

A specialized value object for handling identifiers and IDs:

```javascript
import { Identifier } from "domainify";

// Create a basic identifier
const id = Identifier.create("user-123");

// Create a UUID identifier
const UUIDType = Identifier.uuid();
const uuid = UUIDType.create("123e4567-e89b-12d3-a456-426614174000");

// Create a numeric identifier
const NumericId = Identifier.numeric({ min: 1 });
const orderId = NumericId.create(1001);

// Generate a new UUID
const newUuid = Identifier.generateUUID();
```

## Extending Value Objects

You can extend existing value objects to create new ones with additional properties or methods:

```javascript
import { NonEmptyString } from "domainify";

// Extend NonEmptyString to create an Email value object
const Email = NonEmptyString.extend({
  name: "Email",
  schema: (baseSchema) => baseSchema.email().toLowerCase(),
  methods: {
    getDomain() {
      return this.split("@")[1];
    },

    getLocalPart() {
      return this.split("@")[0];
    },

    isGmail() {
      return this.getDomain() === "gmail.com";
    },
  },
});

// Usage
const email = Email.create("User@Example.com");
console.log(email.toString()); // "user@example.com"
console.log(email.getDomain()); // "example.com"
```

## Composing Value Objects

You can compose complex value objects from simpler ones:

```javascript
import { z } from "zod";
import { valueObject, PositiveNumber, NonEmptyString } from "domainify";

// Create a Currency value object
const Currency = NonEmptyString.extend({
  name: "Currency",
  schema: (baseSchema) => baseSchema.length(3).toUpperCase(),
  methods: {
    isEuro() {
      return this === "EUR";
    },

    isDollar() {
      return this === "USD";
    },
  },
});

// Create a Money value object composed of amount and currency
const Money = valueObject({
  name: "Money",
  schema: z.object({
    amount: PositiveNumber.schema,
    currency: Currency.schema,
  }),
  methods: {
    add(other) {
      if (this.currency !== other.currency) {
        throw new Error(`Cannot add ${other.currency} to ${this.currency}`);
      }
      return Money.create({
        amount: this.amount + other.amount,
        currency: this.currency,
      });
    },

    format(locale = "en-US") {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: this.currency,
      }).format(this.amount);
    },
  },
});

// Usage
const price = Money.create({
  amount: 10.99,
  currency: "USD",
});

const tax = Money.create({
  amount: 0.55,
  currency: "usd", // Will be converted to uppercase
});

const total = price.add(tax);
console.log(total.format()); // "$11.54"
```

## Built-in Behaviors

All value objects created with domainify have these built-in behaviors:

### Immutability

All value objects are immutable - their properties cannot be changed after creation:

```javascript
const name = NonEmptyString.create("John");
name.value = "Jane"; // Error: Cannot assign to read-only property 'value'
```

### Value-Based Equality

Value objects are equal if all their properties are equal:

```javascript
const price1 = Money.create({ amount: 10, currency: "USD" });
const price2 = Money.create({ amount: 10, currency: "USD" });

console.log(price1.equals(price2)); // true
```

### String Representation

All value objects have a meaningful string representation:

```javascript
const price = Money.create({ amount: 10, currency: "USD" });
console.log(price.toString()); // "Money({"amount":10,"currency":"USD"})"
```

## Best Practices

1. **Keep value objects focused** - Each value object should represent a single concept
2. **Use descriptive names** - Names should reflect domain terminology
3. **Validate thoroughly** - Add all relevant validation in the schema
4. **Make operations return new instances** - Never modify an existing value object
5. **Use extension for specialization** - Extend existing value objects for more specific cases
6. **Use composition for complex objects** - Compose complex objects from simpler ones
7. **Add domain-specific methods** - Operations should model behavior relevant to the domain

By following these principles, you'll build a rich, expressive domain model with value objects that enforce business rules and capture domain knowledge.
