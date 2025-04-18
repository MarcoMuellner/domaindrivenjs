# Understanding Value Objects

Value objects are one of the fundamental building blocks in Domain-Driven Design. They represent concepts in your domain that are defined by their attributes rather than by an identity. Understanding value objects is essential for building rich, expressive domain models.

![comparison of Value Objects vs Entities](/images/vo_vo_entity_comp.png)

## What is a Value Object?

A value object is an immutable object that represents a descriptive aspect of the domain with no conceptual identity.

::: tip Real-world Analogy
Think of money in your wallet. When you have a $20 bill, you don't care about which specific $20 bill it is—any $20 bill will do. What matters is its value, not its identity. If you exchange your $20 bill for another $20 bill, nothing has changed from your perspective. This is exactly how value objects work in code: they're defined by their attributes (the amount "$20"), not by a unique identity.
:::

### Key Characteristics:

- **Defined by attributes** - Its identity is based on the combination of all its attribute values
- **Immutable** - Once created, it cannot be changed
- **Equality by value** - Two value objects with the same attributes are considered equal
- **Self-validating** - Ensures its values are always valid
- **Conceptual whole** - Represents a complete concept, not just a primitive value

Think of a value object as answering the question "what" rather than "which one."

### Value Objects vs. Primitives

Many developers default to using primitive types (strings, numbers, booleans) to represent domain concepts. This leads to what's called "primitive obsession" - a code smell where primitives are used for domain concepts that deserve their own type.

```javascript
// Using primitives (primitive obsession)
function applyDiscount(price, discountPercent) {
  return price * (1 - discountPercent / 100);
}

// Problems:
// - What currency is the price in?
// - Is the discount percent 0.2 or 20?
// - Nothing prevents negative results
// - No validation of inputs
```

With value objects, your code becomes clearer and safer:

```javascript
// Using value objects
function applyDiscount(price, discountPercentage) {
  return price.applyPercentage(discountPercentage);
}

// Benefits:
// - Price knows its own currency
// - DiscountPercentage validates it's in a valid range
// - Price ensures result is never negative
// - Everything is validated
```

### Value Objects vs. Entities

| Characteristic | Value Objects | Entities |
|----------------|---------------|----------|
| Identity | Based on all attributes | Based on ID/unique identifier |
| Mutability | Immutable | Can change over time |
| Equality | Equal if all attributes match | Equal if IDs match |
| Example | Money, Date Range, Address | Person, Order, Product |
| Question Answered | "What" | "Which one" |

## Value Objects in the Real World

Value objects are everywhere in the real world:

- **Money** - $5 is $5, regardless of which specific bill you have
- **Measurements** - 1 kg is 1 kg, no matter which scale you use
- **Colors** - Red #FF0000 is the same regardless of where it appears
- **Addresses** - Same street, city, and postal code is the same address
- **Time Periods** - A 2-hour duration is the same regardless of when it occurs

## Creating Value Objects with DomainDrivenJS

DomainDrivenJS makes it easy to create value objects with the `valueObject` factory function:

```javascript
import { z } from 'zod';
import { valueObject } from 'domaindrivenjs';

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

DomainDrivenJS provides several built-in value object types for common use cases:

### String Value Objects

```javascript
import {
  String,
  NonEmptyString
} from 'domaindrivenjs';

// Basic string
const description = String.create("Product description");

// Non-empty string with validation
const name = NonEmptyString.create("Product name");

// Will throw error:
try {
  NonEmptyString.create("");
} catch (error) {
  console.error(error.message); 
  // "Invalid NonEmptyString: String must contain at least 1 character(s)"
}

// Using string methods
const lowercase = name.toLower();
const truncated = description.truncate(10); // "Product de..."
```

### Number Value Objects

```javascript
import {
  Number,
  IntegerNumber,
  PositiveNumber,
  NonNegativeNumber
} from 'domaindrivenjs';

// Basic number
const genericNumber = Number.create(42);

// Integer number (no fractions)
const quantity = IntegerNumber.create(5);

// Positive number (greater than zero)
const price = PositiveNumber.create(29.99);

// Non-negative number (zero or greater)
const discount = NonNegativeNumber.create(0.1);

// Using number methods
const doubled = price.multiply(2);
const rounded = price.round(0); // 30
const formatted = price.format('en-US', { 
  style: 'currency', 
  currency: 'USD' 
}); // "$29.99"
```

### Identifier Value Objects

```javascript
import { Identifier } from 'domaindrivenjs';

// Basic identifier
const id = Identifier.create("user-123");

// UUID-specific identifier
const UUIDType = Identifier.uuid();
const uuid = UUIDType.create("123e4567-e89b-12d3-a456-426614174000");

// Generate a new UUID
const newId = Identifier.generateUUID();

// Numeric identifier
const NumericId = Identifier.numeric({ min: 1 });
const orderId = NumericId.create(1001);
const nextId = orderId.next(); // 1002
```

## Creating Custom Value Objects

Let's explore how to create custom value objects for your domain concepts:

### Simple Domain Concepts

For simple concepts that wrap a single value:

```javascript
import { z } from 'zod';
import { valueObject } from 'domaindrivenjs';

const Email = valueObject({
  name: 'Email',
  schema: z.string().email().toLowerCase(),
  methods: {
    getDomain() {
      return this.split('@')[1];
    },
    getUsername() {
      return this.split('@')[0];
    },
    isBusinessEmail() {
      const domain = this.getDomain();
      return !domain.includes('gmail.com') && 
             !domain.includes('hotmail.com') &&
             !domain.includes('yahoo.com');
    }
  }
});

// Usage
const email = Email.create('User@Example.com');
console.log(email.toString()); // "user@example.com" (normalized to lowercase)
console.log(email.getDomain()); // "example.com"
console.log(email.isBusinessEmail()); // true
```

### Complex Domain Concepts

For concepts that combine multiple values:

```javascript
import { z } from 'zod';
import { valueObject } from 'domaindrivenjs';

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
    },
    
    extend(days) {
      const newEnd = new Date(this.end);
      newEnd.setDate(newEnd.getDate() + days);
      
      return DateRange.create({
        start: this.start,
        end: newEnd
      });
    }
  }
});

// Usage
const bookingRange = DateRange.create({
  start: new Date('2023-06-01'),
  end: new Date('2023-06-07')
});

console.log(bookingRange.durationInDays()); // 7
console.log(bookingRange.includes(new Date('2023-06-03'))); // true

const otherRange = DateRange.create({
  start: new Date('2023-06-05'),
  end: new Date('2023-06-10')
});

console.log(bookingRange.overlaps(otherRange)); // true
```

## Extending Value Objects

You can extend existing value objects to create more specialized versions:

```javascript
import { NonEmptyString } from 'domaindrivenjs';

// Extend NonEmptyString to create a specialized value object
const ProductName = NonEmptyString.extend({
  name: 'ProductName',
  schema: (baseSchema) => baseSchema.max(100),
  methods: {
    toSEOSlug() {
      return this.toString()
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  }
});

// Usage
const name = ProductName.create('Professional Mechanical Keyboard (RGB Backlit)');
console.log(name.toSEOSlug()); // "professional-mechanical-keyboard-rgb-backlit"

// This will throw error due to length constraint
try {
  ProductName.create('This product name is way too long and exceeds the maximum allowed length of one hundred characters which will cause validation to fail');
} catch (error) {
  console.error(error.message); 
  // "Invalid ProductName: String must contain at most 100 character(s)"
}
```

## Composing Value Objects

Complex domain concepts can be composed of other value objects:

```javascript
import { z } from 'zod';
import { valueObject, Email, NonEmptyString } from 'domaindrivenjs';

// First, define component value objects
const PhoneNumber = valueObject({
  name: 'PhoneNumber',
  schema: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  methods: {
    getCountryCode() {
      if (this.startsWith('+')) {
        return this.split(' ')[0];
      }
      return null;
    },
    
    formatNational() {
      // Just an example formatter
      const digits = this.replace(/\D/g, '');
      if (digits.length === 10) {
        return `(${digits.substring(0,3)}) ${digits.substring(3,6)}-${digits.substring(6)}`;
      }
      return this.toString();
    }
  }
});

// Now compose them into a more complex value object
const ContactInfo = valueObject({
  name: 'ContactInfo',
  schema: z.object({
    email: Email.schema,
    name: NonEmptyString.schema,
    phone: PhoneNumber.schema.optional()
  }),
  methods: {
    hasPhone() {
      return this.phone !== undefined;
    },
    
    withNewEmail(email) {
      return ContactInfo.create({
        ...this,
        email: Email.create(email)
      });
    }
  }
});

// Usage
const contact = ContactInfo.create({
  email: Email.create('john@example.com'),
  name: NonEmptyString.create('John Doe'),
  phone: PhoneNumber.create('+1 555-123-4567')
});

console.log(contact.email.getDomain()); // "example.com"
console.log(contact.hasPhone()); // true
console.log(contact.phone.formatNational()); // "(555) 123-4567"

// Create a new contact info with updated email
const updatedContact = contact.withNewEmail('john.doe@company.com');
```

## Value Objects for Domain Rules

Value objects can encapsulate business rules and constraints:

```javascript
import { z } from 'zod';
import { valueObject } from 'domaindrivenjs';

const PasswordStrength = valueObject({
  name: 'PasswordStrength',
  schema: z.enum(['WEAK', 'MEDIUM', 'STRONG']),
  methods: {
    isAcceptable() {
      return this !== 'WEAK';
    },
    
    requiresAdditionalFactors() {
      return this === 'MEDIUM';
    }
  }
});

const Password = valueObject({
  name: 'Password',
  schema: z.string().min(8),
  methods: {
    getStrength() {
      let score = 0;
      
      // Length check
      if (this.length >= 12) score += 2;
      else if (this.length >= 10) score += 1;
      
      // Complexity checks
      if (/[A-Z]/.test(this)) score += 1;
      if (/[a-z]/.test(this)) score += 1;
      if (/[0-9]/.test(this)) score += 1;
      if (/[^A-Za-z0-9]/.test(this)) score += 2;
      
      // Determine strength
      if (score >= 5) return PasswordStrength.create('STRONG');
      if (score >= 3) return PasswordStrength.create('MEDIUM');
      return PasswordStrength.create('WEAK');
    },
    
    isAcceptableForRegistration() {
      return this.getStrength().isAcceptable();
    }
  }
});

// Usage
const password = Password.create('P@ssw0rd');
const strength = password.getStrength();

console.log(strength.toString()); // "MEDIUM"
console.log(strength.isAcceptable()); // true
console.log(strength.requiresAdditionalFactors()); // true

const strongPassword = Password.create('Compl3x!P@ssw0rd');
console.log(strongPassword.getStrength().toString()); // "STRONG"
```

## Value Objects in a Domain Model

Value objects work together with entities and other DDD building blocks in your domain model:

```javascript
import { z } from 'zod';
import { valueObject, entity } from 'domaindrivenjs';

// Value objects
const Email = valueObject({
  name: 'Email',
  schema: z.string().email().toLowerCase(),
  // methods...
});

const Money = valueObject({
  name: 'Money',
  schema: z.object({
    amount: z.number().nonnegative(),
    currency: z.string().length(3)
  }),
  // methods...
});

// Entity using value objects
const Customer = entity({
  name: 'Customer',
  schema: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: Email.schema,
    creditBalance: Money.schema
  }),
  identity: 'id',
  methods: {
    updateEmail(newEmail) {
      return Customer.update(this, { email: newEmail });
    },
    
    addCredit(amount) {
      if (amount.currency !== this.creditBalance.currency) {
        throw new Error('Currency mismatch');
      }
      
      return Customer.update(this, {
        creditBalance: this.creditBalance.add(amount)
      });
    }
  }
});

// Usage
const customer = Customer.create({
  id: '123',
  name: 'Jane Smith',
  email: Email.create('jane@example.com'),
  creditBalance: Money.create({ amount: 0, currency: 'USD' })
});

// Add store credit
const customerWithCredit = customer.addCredit(
  Money.create({ amount: 50, currency: 'USD' })
);
```

## Special Types of Value Objects

### Collection Value Objects

Collections themselves can be value objects:

```javascript
import { z } from 'zod';
import { valueObject } from 'domaindrivenjs';

const TagList = valueObject({
  name: 'TagList',
  schema: z.array(z.string()).max(10),
  methods: {
    add(tag) {
      // If tag already exists, return same list
      if (this.includes(tag)) return this;
      
      // Otherwise create new list with the tag added
      return TagList.create([...this, tag]);
    },
    
    remove(tag) {
      return TagList.create(this.filter(t => t !== tag));
    },
    
    asString() {
      return this.join(', ');
    },
    
    // Override the iterator to make this behave like an array
    [Symbol.iterator]() {
      return this.valueOf()[Symbol.iterator]();
    }
  }
});

// Usage
let tags = TagList.create(['javascript', 'node']);
tags = tags.add('ddd');
tags = tags.add('javascript'); // No change, already exists
console.log(tags.asString()); // "javascript, node, ddd"

// Can iterate like an array
for (const tag of tags) {
  console.log(tag);
}
```

### Range Value Objects

Range concepts like periods, intervals, or spans:

```javascript
import { z } from 'zod';
import { valueObject } from 'domaindrivenjs';

const NumberRange = valueObject({
  name: 'NumberRange',
  schema: z.object({
    min: z.number(),
    max: z.number()
  }).refine(data => data.min <= data.max, {
    message: 'Min must be less than or equal to max'
  }),
  methods: {
    includes(value) {
      return value >= this.min && value <= this.max;
    },
    
    overlaps(other) {
      return this.min <= other.max && this.max >= other.min;
    },
    
    length() {
      return this.max - this.min;
    },
    
    expand(amount) {
      return NumberRange.create({
        min: this.min - amount,
        max: this.max + amount
      });
    }
  }
});

// Usage
const range = NumberRange.create({ min: 10, max: 20 });
console.log(range.includes(15)); // true
console.log(range.length()); // 10

const expandedRange = range.expand(5);
console.log(expandedRange.min); // 5
console.log(expandedRange.max); // 25
```

## Value Object Validation with Zod

DomainDrivenJS uses Zod for validation, giving you a powerful way to define constraints:

```javascript
import { z } from 'zod';
import { valueObject } from 'domaindrivenjs';

const PostalCode = valueObject({
  name: 'PostalCode',
  schema: z.string()
    .trim()
    .refine(
      (val) => /^\d{5}(-\d{4})?$/.test(val), 
      {message: "Invalid US postal code format"}
    ),
  methods: {
    // Methods...
  }
});

// Various value validations
const Person = valueObject({
  name: 'Person',
  schema: z.object({
    name: z.string().min(2).max(100),
    age: z.number().int().min(0).max(150),
    email: z.string().email().optional(),
    // Conditional validation
    driverLicense: z.string().optional()
      .refine(
        (val, ctx) => {
          // If age < 16, no license should be present
          if (ctx.parent.age < 16 && val !== undefined) {
            return false;
          }
          return true;
        },
        {message: "People under 16 cannot have a driver's license"}
      )
  })
});
```

## Techniques and Patterns

### Factory Methods for Special Cases

Sometimes you need special ways to create value objects:

```javascript
import { z } from 'zod';
import { valueObject } from 'domaindrivenjs';

const IPAddress = valueObject({
  name: 'IPAddress',
  schema: z.string().refine(
    (val) => /^(\d{1,3}\.){3}\d{1,3}$/.test(val),
    {message: "Invalid IP address format"}
  ),
  methods: {
    isLocalhost() {
      return this === '127.0.0.1';
    }
  }
});

// Add factory methods to the value object
IPAddress.localhost = function() {
  return IPAddress.create('127.0.0.1');
};

IPAddress.fromParts = function(a, b, c, d) {
  if ([a, b, c, d].some(part => part < 0 || part > 255)) {
    throw new Error('IP address parts must be between 0 and 255');
  }
  return IPAddress.create(`${a}.${b}.${c}.${d}`);
};

// Usage
const localhost = IPAddress.localhost();
const customIp = IPAddress.fromParts(192, 168, 1, 1);
```

### Value Object Serialization

For persisting value objects:

```javascript
import { z } from 'zod';
import { valueObject } from 'domaindrivenjs';

const Color = valueObject({
  name: 'Color',
  schema: z.object({
    red: z.number().int().min(0).max(255),
    green: z.number().int().min(0).max(255),
    blue: z.number().int().min(0).max(255),
    alpha: z.number().min(0).max(1).default(1)
  }),
  methods: {
    toHex() {
      const r = this.red.toString(16).padStart(2, '0');
      const g = this.green.toString(16).padStart(2, '0');
      const b = this.blue.toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    },
    
    toRGBA() {
      return `rgba(${this.red}, ${this.green}, ${this.blue}, ${this.alpha})`;
    },
    
    // Serialization helper
    toJSON() {
      return this.toHex();
    }
  }
});

// Static factory method for creating from hex
Color.fromHex = function(hex) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    throw new Error('Invalid hex color format');
  }
  
  return Color.create({
    red: parseInt(hex.substring(1, 3), 16),
    green: parseInt(hex.substring(3, 5), 16),
    blue: parseInt(hex.substring(5, 7), 16)
  });
};

// Usage with serialization
const color = Color.create({ red: 255, green: 0, blue: 0 });
console.log(color.toHex()); // "#ff0000"

// Automatic JSON serialization uses the toJSON method
const data = { primaryColor: color };
const json = JSON.stringify(data); // {"primaryColor":"#ff0000"}

// Deserialize
const parsed = JSON.parse(json);
const reconstructed = Color.fromHex(parsed.primaryColor);
```

### Null Object Pattern

Create default "null" values with defined behavior:

```javascript
import { valueObject } from 'domaindrivenjs';

const Discount = valueObject({
  name: 'Discount',
  schema: z.object({
    percentage: z.number().min(0).max(100),
    name: z.string(),
    isActive: z.boolean().default(true)
  }),
  methods: {
    apply(amount) {
      if (!this.isActive) return amount;
      return amount * (1 - this.percentage / 100);
    }
  }
});

// Add a "no discount" factory method
Discount.none = function() {
  return Discount.create({
    percentage: 0,
    name: 'No Discount',
    isActive: true
  });
};

// Usage
function calculatePrice(basePrice, discount = Discount.none()) {
  return discount.apply(basePrice);
}

const regularPrice = calculatePrice(100); // 100
const salePrice = calculatePrice(100, Discount.create({
  percentage: 20,
  name: '20% Off Sale'
})); // 80
```

## Best Practices for Value Objects

1. **Make them truly immutable** - Value objects should never change after creation
2. **Keep them focused** - Each value object should represent one concept
3. **Express domain rules** - Encapsulate validation and behaviors related to the concept
4. **Use value objects for all domain values** - Don't mix primitives and value objects for the same concept
5. **Return new instances from methods** - All operations should return new value objects
6. **Name operations using domain language** - Methods should reflect domain terminology
7. **Validate thoroughly** - Define comprehensive validation rules to ensure valid state
8. **Consider creating collections of value objects** - Collections with domain meaning can be value objects
9. **Use factory methods for special cases** - Provide named constructors for common instances
10. **Document domain rules** - Value objects should make domain rules explicit

## Anti-patterns to Avoid

### Mutable Value Objects

```javascript
// ANTI-PATTERN: Mutable value object
class Color {
  constructor(r, g, b) {
    this.red = r;
    this.green = g;
    this.blue = b;
  }
  
  darken() {
    // Directly modifies the object!
    this.red = Math.max(0, this.red - 20);
    this.green = Math.max(0, this.green - 20);
    this.blue = Math.max(0, this.blue - 20);
    return this;
  }
}

// BETTER: Immutable value object
const Color = valueObject({
  name: 'Color',
  schema: z.object({
    red: z.number().int().min(0).max(255),
    green: z.number().int().min(0).max(255),
    blue: z.number().int().min(0).max(255)
  }),
  methods: {
    darken() {
      return Color.create({
        red: Math.max(0, this.red - 20),
        green: Math.max(0, this.green - 20),
        blue: Math.max(0, this.blue - 20)
      });
    }
  }
});
```

### Missing Validation

```javascript
// ANTI-PATTERN: Missing validation
const Email = valueObject({
  name: 'Email',
  schema: z.string(), // No validation!
  methods: {
    getDomain() {
      // Might throw error if not a valid email
      return this.split('@')[1];
    }
  }
});

// BETTER: With validation
const Email = valueObject({
  name: 'Email',
  schema: z.string().email().toLowerCase(),
  methods: {
    getDomain() {
      return this.split('@')[1];
    }
  }
});
```

### Overly Complex Value Objects

```javascript
// ANTI-PATTERN: Too many responsibilities
const User = valueObject({
  name: 'User',
  schema: z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string(),
    loginAttempts: z.number(),
    lastLogin: z.date(),
    // Many more fields...
  }),
  methods: {
    // Auth methods
    checkPassword() { /*...*/ },
    incrementLoginAttempts() { /*...*/ },
    // Profile methods
    getFullName() { /*...*/ },
    // Many more methods...
  }
});

// BETTER: Split into focused value objects
const Email = valueObject({
  name: 'Email',
  schema: z.string().email().toLowerCase(),
  methods: { /*...*/ }
});

const Password = valueObject({
  name: 'Password',
  schema: z.string().min(8),
  methods: { 
    isMatch(plaintext) { /*...*/ }
  }
});

// And then use an entity for User with identity
```

## Summary

Value objects are a powerful tool for modeling your domain concepts with precision and clarity. By using value objects instead of primitive types, you:

1. **Make domain concepts explicit** in your code
2. **Encapsulate validation and behavior** specific to those concepts
3. **Eliminate entire categories of bugs** through immutability
4. **Improve code readability** by expressing domain concepts directly

With DomainDrivenJS's composable, immutable value objects, you can build rich domain models that express complex business rules clearly and concisely.

## Next Steps

Now that you understand value objects, explore these related concepts:
- [Entities](./entities.md) for concepts with identity that changes over time
- [Aggregates](./aggregates.md) for clusters of related objects treated as a unit
- [Domain Events](./domain-events.md) for modeling significant occurrences
- [Specifications](./specifications.md) for reusable business rules
