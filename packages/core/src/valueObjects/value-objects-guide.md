# Working with Value Objects in Domainify

Value objects are a fundamental building block in Domain-Driven Design (DDD). This guide explains how to use value objects effectively in your domain model.

## What are Value Objects?

Value objects are immutable objects that represent a concept in your domain and are defined by their attributes rather than an identity. Two value objects with the same attributes are considered equal, regardless of whether they are the same instance.

Key characteristics:
- **Immutable** - Cannot be changed after creation
- **Attribute-based equality** - Equal if all attributes are equal
- **Self-validating** - Ensures their values are always valid
- **Conceptual whole** - Encapsulates related attributes and behaviors

## Using Primitive Value Objects

The library provides several primitive value objects for common use cases:

### NonEmptyString

Use for text that must not be empty:

```javascript
import { NonEmptyString } from 'domainify';

// Create a non-empty string
const name = NonEmptyString.create('John Doe');

// Use string operations
const upperName = name.toUpper();
const shortened = name.truncate(5); // "John..."

// Will throw ValidationError:
const invalid = NonEmptyString.create('');
```

### PositiveNumber
Use for numbers that must be greater than zero:

```javascript
import { PositiveNumber } from 'domainify';

// Create a positive number
const price = PositiveNumber.create(19.99);

// Use mathematical operations
const discounted = price.multiply(0.9);
const rounded = price.round(0); // 20

// Will throw ValidationError:
const invalid = PositiveNumber.create(0);
```

### NonNegativeNumber
Use for numbers that must be zero or greater:

```javascript
import { NonNegativeNumber } from 'domainify';

// Create a non-negative number
const count = NonNegativeNumber.create(5);
const empty = NonNegativeNumber.create(0);

// Check properties
console.log(empty.isZero()); // true
console.log(count.isPositive()); // true

// Will throw ValidationError:
const invalid = NonNegativeNumber.create(-1);
```

### Identifier

Use for unique identifiers, such as UUIDs:

```javascript
import { Identifier } from 'domainify';

// Create a basic identifier
const id = Identifier.create('user-123');

// Create a UUID identifier
const UUIDType = Identifier.uuid();
const uuid = UUIDType.create('123e4567-e89b-12d3-a456-426614174000');

// Create a numeric identifier
const NumericId = Identifier.numeric({ min: 1 });
const orderId = NumericId.create(1001);

// Generate a new UUID
const newUuid = Identifier.generateUUID();
```

### Creating custom value objects

You can create custom value objects by extending the `ValueObject` class. This allows you to define your own validation rules and behaviors.

```javascript
import { z } from 'zod';
import { valueObject } from 'domainify';

const Email = valueObject({
  name: 'Email',
  schema: z.string().email().toLowerCase(),
  methods: {
    getDomain() {
      return this.split('@')[1];
    },
    
    getLocalPart() {
      return this.split('@')[0];
    },
    
    isGmail() {
      return this.getDomain() === 'gmail.com';
    }
  }
});

// Usage
const email = Email.create('User@Example.com');
console.log(email.toString()); // "user@example.com"
console.log(email.getDomain()); // "example.com"
```

### Extending Value Objects

You can extend existing value objects to create new ones with additional properties or methods. This is useful for creating specialized versions of value objects.

```javascript
import { NonEmptyString } from 'domainify';

// Extend NonEmptyString to create an Email value object
const Email = NonEmptyString.extend({
  name: 'Email',
  schema: (baseSchema) => baseSchema.email().toLowerCase(),
  methods: {
    getDomain() {
      return this.split('@')[1];
    },
    
    getLocalPart() {
      return this.split('@')[0];
    }
  }
});

// Usage
const email = Email.create('User@Example.com');
console.log(email.toString()); // "user@example.com"
console.log(email.getDomain()); // "example.com"
console.log(email.truncate(10)); // "user@exam..."

// Invalid email will throw ValidationError
try {
  Email.create('not-an-email');
} catch (error) {
  console.error(error.message); // "Invalid Email: Invalid email"
}
```

### Composing Value Objects
You can compose complex value objects from simpler ones:

```javascript
import { z } from 'zod';
import { valueObject, PositiveNumber, NonEmptyString } from 'domainify';

// Create a Currency value object
const Currency = NonEmptyString.extend({
  name: 'Currency',
  schema: (baseSchema) => baseSchema.length(3).toUpperCase(),
  methods: {
    isEuro() {
      return this === 'EUR';
    },
    
    isDollar() {
      return this === 'USD';
    }
  }
});

// Create a Money value object composed of amount and currency
const Money = valueObject({
  name: 'Money',
  schema: z.object({
    amount: PositiveNumber.schema,
    currency: Currency.schema
  }),
  methods: {
    add(other) {
      if (this.currency !== other.currency) {
        throw new Error(`Cannot add ${other.currency} to ${this.currency}`);
      }
      return Money.create({
        amount: parseFloat(this.amount) + parseFloat(other.amount),
        currency: this.currency
      });
    },
    
    format(locale = 'en-US') {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: this.currency
      }).format(this.amount);
    }
  }
});

// Usage
const price = Money.create({
  amount: 10.99,
  currency: 'USD'
});

const tax = Money.create({
  amount: 0.55,
  currency: 'usd'  // Will be converted to uppercase
});

const total = price.add(tax);
console.log(total.format()); // "$11.54"
```

### Best Practices

1) Keep value objects focused - Each value object should represent a single concept
2) Use descriptive names - Names should reflect domain terminology
3) Validate thoroughly - Add all relevant validation in the schema
4) Make operations return new instances - Never modify an existing value object
5) Use extension for specialization - Extend existing value objects for more specific cases
6) Use composition for complex objects - Compose complex objects from simpler ones
7) Add domain-specific methods - Operations should model behavior relevant to the domain

By following these principles, you'll build a rich, expressive domain model with value objects that enforce business rules and capture domain knowledge.

