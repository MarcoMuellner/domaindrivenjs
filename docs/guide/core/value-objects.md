# Understanding Value Objects

Value objects are a fundamental building block in Domain-Driven Design. They represent concepts in your domain that are defined by their attributes rather than their identity.

## What is a Value Object?

A value object:
- Is immutable (unchangeable after creation)
- Has no identity (two value objects with the same attributes are considered equal)
- Represents a descriptive aspect of the domain
- Measures, quantifies, or describes something

Common examples include:
- Money (amount and currency)
- DateRange (start and end dates)
- Address (street, city, state, etc.)
- PhoneNumber (country code, area code, number)

## Why Use Value Objects?

Value objects offer several benefits:
- **Encapsulation of related attributes**: Group attributes that belong together
- **Validation**: Ensure data is valid
- **Business logic**: Contain operations related to the concept
- **Immutability**: Prevent unexpected changes and side effects
- **Clear intent**: Make code more expressive and self-documenting

## Creating Value Objects with Domainify

Domainify provides a simple yet powerful way to create value objects:

```javascript
import { z } from 'zod';
import { valueObject } from 'domainify';

const Money = valueObject({
  name: 'Money',
  schema: z.object({
    amount: z.number().nonnegative(),
    currency: z.string().length(3)
  }),
  methods: {
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
    }
  }
});
```

Let's break down the components:

1. **`name`**: A descriptive name for your value object
2. **`schema`**: A Zod schema that defines the structure and validation rules
3. **`methods`**: Functions that provide behavior related to the value object

## Using Value Objects

Once you've defined a value object, you can use it in your code:

```javascript
// Create a new Money value object
const price = Money.create({ amount: 10.99, currency: 'USD' });
const tax = Money.create({ amount: 0.55, currency: 'USD' });

// Use the methods
const total = price.add(tax);
const discount = price.multiply(0.9);

// Format for display
console.log(total.format()); // "$11.54"
```

## Value Object Equality

Value objects are compared by their attributes, not by identity:

```javascript
const price1 = Money.create({ amount: 10.99, currency: 'USD' });
const price2 = Money.create({ amount: 10.99, currency: 'USD' });
const price3 = Money.create({ amount: 11.99, currency: 'USD' });

console.log(price1.equals(price2)); // true - same attributes
console.log(price1.equals(price3)); // false - different attributes
```

## Built-in Value Objects

Domainify provides several built-in value objects for common use cases:

```javascript
import { 
  String, 
  NonEmptyString, 
  Number, 
  PositiveNumber,
  NonNegativeNumber,
  IntegerNumber,
  Identifier
} from 'domainify';

// String value objects
const name = NonEmptyString.create('John Doe');
const description = String.create('Optional description');

// Number value objects
const price = PositiveNumber.create(10.99);
const quantity = IntegerNumber.create(5);
const percentage = NonNegativeNumber.create(0.1);

// Identifier
const id = Identifier.create('order-123');
```

## Primitive Value Objects vs Complex Value Objects

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
    }
  }
});

const email = Email.create('user@example.com');
console.log(email.getDomain()); // "example.com"
```

### Complex Value Objects

These combine multiple values that form a logical unit:

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
const Email = NonEmptyString.extend({
  name: 'Email',
  schema: (baseSchema) => baseSchema.email().toLowerCase(),
  methods: {
    getDomain() {
      return this.split('@')[1];
    },
    getUsername() {
      return this.split('@')[0];
    },
    isGmail() {
      return this.getDomain() === 'gmail.com';
    }
  }
});

const email = Email.create('user@example.com');
console.log(email.getDomain()); // "example.com"
console.log(email.isGmail()); // false
```

## Composing Value Objects

You can compose complex value objects from simpler ones:

```javascript
const PhoneNumber = valueObject({
  name: 'PhoneNumber',
  schema: z.object({
    countryCode: z.string().regex(/^\+\d{1,3}$/),
    areaCode: z.string().regex(/^\d{3}$/),
    number: z.string().regex(/^\d{7}$/)
  }),
  methods: {
    format() {
      return `${this.countryCode} (${this.areaCode}) ${this.number.slice(0, 3)}-${this.number.slice(3)}`;
    }
  }
});

const ContactInfo = valueObject({
  name: 'ContactInfo',
  schema: z.object({
    email: Email.schema,
    phone: PhoneNumber.schema,
    address: Address.schema.optional()
  }),
  methods: {
    hasAddress() {
      return !!this.address;
    }
  }
});
```

## Best Practices

1. **Keep value objects focused**: Each value object should represent a single concept
2. **Make them immutable**: Always return new instances, never modify existing ones
3. **Include validation**: Ensure all values are valid
4. **Add relevant operations**: Include methods that make sense for the concept
5. **Use descriptive names**: Name your value objects and methods clearly
6. **Compose value objects**: Use simpler value objects as parts of more complex ones

## Common Value Object Examples

Here are some common value objects you might encounter or create:

| Value Object | Example Attributes | Example Methods |
|--------------|-------------------|-----------------|
| Money | amount, currency | add, subtract, multiply, format |
| DateRange | start, end | getDuration, contains, overlaps |
| Address | street, city, state, zip | format, isInternational |
| PhoneNumber | countryCode, areaCode, number | format, isValid |
| Email | (string value) | getDomain, getUsername, isValid |
| Percentage | (number value) | format, toFraction, toDecimal |
| Coordinates | latitude, longitude | distanceTo, isInRegion |
| Color | red, green, blue, alpha | lighten, darken, toHex |
| Temperature | value, unit | convert, format |
| Weight | value, unit | convert, format |

## Next Steps

Now that you understand value objects, learn about [Entities](./entities.md) - objects defined by their identity rather than attributes.
