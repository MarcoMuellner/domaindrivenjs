# Understanding Value Objects

Value objects are a fundamental building block in Domain-Driven Design. They represent concepts in your domain that are defined by their attributes rather than by an identity.

## What is a Value Object?

<!-- DIAGRAM: Comparison between Value Objects (defined by attributes) and Entities (defined by identity) with examples of each and how equality works differently -->

A value object:
- Is defined completely by its **attributes** (not by an identity)
- Is **immutable** - once created, it cannot be changed
- Provides **equality based on attributes** - two value objects with the same attributes are considered equal
- Encapsulates related **validation and behavior**
- Represents a **cohesive concept** in your domain

### Real-World Examples

Think of value objects as concepts that answer the question "what" rather than "which":

| Domain | Value Objects Examples |
|--------|------------------------|
| E-commerce | Money, Address, ProductCode, EmailAddress |
| Financial | Money, InterestRate, DateRange, Account Number |
| Transportation | Route, TimeSlot, Distance, Location |
| Healthcare | BloodPressure, Temperature, DosageAmount |

### Value Objects vs. Entities

The crucial distinction between value objects and entities is that **value objects have no identity**. Consider these examples:

- A $5 bill is a value object - if you exchange it for another $5 bill, you don't care which specific one you have
- A car is an entity - even if two cars are identical in all respects, they're still different cars with unique identities

Value objects can be freely replaced with equivalent objects, while entities maintain their identity even as their attributes change.

## Why Use Value Objects?

Value objects offer several important benefits:

1. **Safer code** - Immutability prevents unexpected side effects
2. **Domain expressiveness** - They capture important concepts in your business domain
3. **Encapsulated validation** - They ensure values are always valid
4. **Simplified equality** - No need to worry about object references
5. **Reduced primitive obsession** - Replace primitive types with richer domain concepts

For example, instead of representing money as a raw number:

```javascript
// Without value objects - using primitives
function applyDiscount(price, discountPercent) {
  return price * (1 - discountPercent);
}

// Problems:
// - What currency is the price in?
// - Is discountPercent a decimal (0.2) or a percentage (20)?
// - Nothing prevents negative results
```

With value objects, intentions become clear:

```javascript
// With value objects
function applyDiscount(price, discount) {
  return price.applyPercentageDiscount(discount);
}

// Benefits:
// - Price includes currency
// - Percentage is a proper concept
// - Validation ensures no invalid operations
```

## Creating Value Objects with Domainify

Domainify makes it easy to create value objects with the `valueObject` factory function:

```javascript
import { z } from 'zod';
import { valueObject } from 'domainify';

const Money = valueObject({
  name: 'Money',                    // Name of the value object
  schema: z.object({                // Zod schema for validation
    amount: z.number().nonnegative(),
    currency: z.string().length(3)
  }),
  methods: {                        // Methods that provide behavior
    add(other) {
      if (this.currency !== other.currency) {
        throw new Error('Cannot add different currencies');
      }
      return Money.create({ 
        amount: this.amount + other.amount, 
        currency: this.currency 
      });
    },
    
    multiply(factor) {
      return Money.create({ 
        amount: this.amount * factor, 
        currency: this.currency 
      });
    },
    
    format(locale = 'en-US') {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: this.currency
      }).format(this.amount);
    },
    
    equals(other) {
      if (!(other instanceof Object) || other.constructor !== Object) {
        return false;
      }
      return this.amount === other.amount && 
             this.currency === other.currency;
    }
  }
});
```

Let's break down the components:

- **name**: A descriptive name for your value object
- **schema**: A Zod schema that defines the structure and validation rules
- **methods**: Functions that provide behavior related to the value object

## Using Value Objects

Once defined, value objects are used like this:

```javascript
// Create value objects
const price = Money.create({ amount: 29.99, currency: 'USD' });
const tax = Money.create({ amount: 2.40, currency: 'USD' });

// Use methods
const total = price.add(tax);
console.log(total.format()); // "$32.39"

// Check equality
const samePrice = Money.create({ amount: 29.99, currency: 'USD' });
console.log(price.equals(samePrice)); // true

// Value objects are immutable
try {
  price.amount = 39.99; // This will throw an error
} catch (error) {
  console.error(error); // "Cannot assign to read only property 'amount'"
}

// Methods always return new instances
const discounted = price.multiply(0.9);
console.log(discounted.format()); // "$26.99"
console.log(price.format()); // Original is unchanged: "$29.99"
```

## Built-in Value Object Types

Domainify provides several built-in value object types for common use cases:

```javascript
import {
  String,
  NonEmptyString,
  Number,
  IntegerNumber,
  PositiveNumber,
  NonNegativeNumber,
  Identifier
} from 'domainify';

// String value objects
const description = String.create("Product description");
const name = NonEmptyString.create("Product name");

// Number value objects
const price = PositiveNumber.create(29.99);
const quantity = IntegerNumber.create(5);
const discount = NonNegativeNumber.create(0.1);

// Identifier for IDs
const orderId = Identifier.create("order-123");
const uuidId = Identifier.uuid().create("123e4567-e89b-12d3-a456-426614174000");
```

## Primitive vs. Complex Value Objects

There are two main types of value objects:

### Primitive Value Objects

These wrap a single primitive value with validation and behavior:

```javascript
const Email = valueObject({
  name: 'Email',
  schema: z.string().email().toLowerCase(),
  methods: {
    getDomain() {
      return this.split('@')[1];
    },
    getUsername() {
      return this.split('@')[0];
    }
  },
  overrideIsPrimitive: true // Tells Domainify this wraps a primitive
});

const email = Email.create('user@example.com');
console.log(email.getDomain()); // "example.com"
```

### Complex Value Objects

These combine multiple values into a cohesive concept:

```javascript
const Address = valueObject({
  name: 'Address',
  schema: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string().length(2),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/)
  }),
  methods: {
    format() {
      return `${this.street}, ${this.city}, ${this.state} ${this.zipCode}`;
    },
    isInState(stateCode) {
      return this.state === stateCode.toUpperCase();
    }
  }
});

const address = Address.create({
  street: '123 Main St',
  city: 'Anytown',
  state: 'CA',
  zipCode: '12345'
});
```

## Extending Value Objects

You can extend existing value objects to create more specialized types:

```javascript
const PhoneNumber = String.extend({
  name: 'PhoneNumber',
  schema: (baseSchema) => baseSchema.regex(/^\+?[1-9]\d{1,14}$/),
  methods: {
    formatNational() {
      // Format implementation for national display
      // Example: (555) 123-4567
      const digits = this.replace(/\D/g, '');
      return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
    }
  }
});

const phoneNumber = PhoneNumber.create('+12025550179');
console.log(phoneNumber.formatNational()); // "(202) 555-0179"
```

## Integrating with Entities and Aggregates

Value objects are often used as properties within entities and aggregates:

```javascript
const Product = entity({
  name: 'Product',
  schema: z.object({
    id: z.string().uuid(),
    name: NonEmptyString.schema, // Use the value object schema
    price: Money.schema,         // Use the value object schema
    description: String.schema.optional()
  }),
  identity: 'id',
  methods: {
    // Product methods...
  }
});

// Creating an entity with value objects
const product = Product.create({
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: NonEmptyString.create('Premium Widget'),
  price: Money.create({ amount: 49.99, currency: 'USD' }),
  description: String.create('A high-quality widget for all your needs')
});
```

## Value Object Schema Helpers

Domainify provides schema helpers to make it easier to use value objects in your entity schemas:

```javascript
import { z } from 'zod';
import { valueObjectSchema, specificValueObjectSchema } from 'domainify';

// Create a schema that accepts any value object
const genericSchema = z.object({
  id: z.string(),
  anyValueObj: valueObjectSchema()
});

// Create a schema that accepts a specific value object type
const specificSchema = z.object({
  id: z.string(),
  email: specificValueObjectSchema(Email),
  money: specificValueObjectSchema(Money)
});
```

## Validation and Error Handling

Value objects automatically validate their data at creation time:

```javascript
try {
  const invalidMoney = Money.create({ amount: -10, currency: 'USD' });
} catch (error) {
  console.error(error.message); 
  // "Invalid Money: amount must be greater than or equal to 0"
}

try {
  const invalidEmail = Email.create('not-an-email');
} catch (error) {
  console.error(error.message);
  // "Invalid Email: Invalid email"
}
```

The `ValidationError` includes details about what failed and why, making it easier to understand and fix issues.

## Best Practices

1. **Keep value objects focused** - Each value object should represent a single concept
2. **Make operations return new instances** - Never modify an existing value object
3. **Use descriptive method names** - Methods should clearly express their intent
4. **Validate thoroughly** - Add all relevant validation in the schema
5. **Consider performance** - For high-frequency operations, be mindful of object creation costs
6. **Use composition** - Compose complex value objects from simpler ones
7. **Don't leak domain knowledge** - Keep domain logic inside the value object
8. **Use factory methods** for complex creation scenarios
9. **Create specific value objects** rather than reusing generic ones
10. **Unit test value objects** thoroughly, including edge cases

## Common Value Object Patterns

### Measurements with Units

```javascript
const Temperature = valueObject({
  name: 'Temperature',
  schema: z.object({
    value: z.number(),
    unit: z.enum(['C', 'F', 'K'])
  }),
  methods: {
    toCelsius() {
      if (this.unit === 'C') return this;
      if (this.unit === 'F') {
        return Temperature.create({
          value: (this.value - 32) * 5/9,
          unit: 'C'
        });
      }
      if (this.unit === 'K') {
        return Temperature.create({
          value: this.value - 273.15,
          unit: 'C'
        });
      }
    },
    // Other conversion methods...
  }
});
```

### Date Ranges

```javascript
const DateRange = valueObject({
  name: 'DateRange',
  schema: z.object({
    start: z.date(),
    end: z.date()
  }).refine(data => data.start <= data.end, {
    message: 'End date must be after start date'
  }),
  methods: {
    durationInDays() {
      return Math.ceil((this.end - this.start) / (1000 * 60 * 60 * 24));
    },
    includes(date) {
      return date >= this.start && date <= this.end;
    },
    overlaps(other) {
      return this.start <= other.end && this.end >= other.start;
    }
  }
});
```

### Composite Identifiers

```javascript
const OrderLineItemId = valueObject({
  name: 'OrderLineItemId',
  schema: z.object({
    orderId: z.string().uuid(),
    lineItemNumber: z.number().int().positive()
  }),
  methods: {
    toString() {
      return `${this.orderId}-${this.lineItemNumber}`;
    }
  }
});
```

## Next Steps

Now that you understand value objects, you can:

- Learn about [Entities](/guide/core/entities.html), which have identity that persists through state changes
- Explore [Aggregates](/guide/core/aggregates.html), which group related entities and value objects
- Check out [Domain Events](/guide/core/domain-events.html) to model significant changes in your domain
