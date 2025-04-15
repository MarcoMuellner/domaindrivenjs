# Working with Entities in domainify

Entities are a fundamental building block in Domain-Driven Design (DDD). This guide explains how to create and use entities effectively in your domain model with domainify.

## What are Entities?

Entities are objects that have:

1. **Identity** - They're defined by a unique identifier that persists across state changes
2. **Lifecycle** - They can be created, updated, and deleted
3. **Business rules** - They encapsulate domain logic and validation
4. **Mutability** - Unlike value objects, entities can change while maintaining their identity

The key difference between entities and value objects is that entities are compared by their identity, not by their attributes. Two entities with the same attributes but different IDs are different entities.

## Creating Entities

The core of domainify's entity implementation is the `entity` factory function that creates immutable, self-validating entities:

```javascript
import { z } from 'zod';
import { entity } from 'domainify';

const Customer = entity({
    name: 'Customer',
    schema: z.object({
        id: z.string().uuid(),
        name: z.string().min(1),
        email: z.string().email(),
        address: z.string().optional()
    }),
    identity: 'id',
    methods: {
        updateEmail(email) {
            return Customer.update(this, { email });
        },
        changeName(name) {
            return Customer.update(this, { name });
        },
        moveToAddress(address) {
            return Customer.update(this, { address });
        }
    }
});

// Usage
const customer = Customer.create({
    id: 'cust-123',
    name: 'John Doe',
    email: 'john@example.com'
});

// Update using a method
const updatedCustomer = customer.updateEmail('john.doe@example.com');

// Update directly
const movedCustomer = Customer.update(updatedCustomer, {
    address: '123 Main St, Anytown'
});
```

## Entity Features

### Identity-Based Equality

Entities compare equality based on their identity, not their attributes:

```javascript
const customer1 = Customer.create({
    id: 'cust-123',
    name: 'John',
    email: 'john@example.com'
});

const customer2 = Customer.create({
    id: 'cust-123',
    name: 'Johnny', // Different name
    email: 'johnny@example.com' // Different email
});

console.log(customer1.equals(customer2)); // true - same ID
```

### Immutability with State Changes

Like value objects, entities are immutable. State changes create new instances while preserving identity:

```javascript
const customer = Customer.create({
    id: 'cust-123',
    name: 'John Doe',
    email: 'john@example.com'
});

// This would throw an error
try {
    customer.name = 'Jane Doe'; // Error: Cannot assign to read-only property
} catch (error) {
    console.error(error);
}

// Instead, use the update method
const updatedCustomer = Customer.update(customer, { name: 'Jane Doe' });
console.log(updatedCustomer.name); // 'Jane Doe'
console.log(customer.name); // Still 'John Doe'
```

### Identity Protection

Entities prevent changing the identity field after creation:

```javascript
const customer = Customer.create({
    id: 'cust-123',
    name: 'John Doe',
    email: 'john@example.com'
});

// This would throw an error
try {
    Customer.update(customer, { id: 'cust-456' });
} catch (error) {
    console.error(error); // Cannot change identity of Customer
}
```

### Optional Historization

Entities can optionally track their state changes by enabling historization:

```javascript
const AuditedCustomer = entity({
    name: 'AuditedCustomer',
    schema: z.object({
        id: z.string().uuid(),
        name: z.string().min(1),
        email: z.string().email(),
        status: z.enum(['ACTIVE', 'INACTIVE']),
        _history: z.array(z.any()).optional()
    }),
    identity: 'id',
    historize: true, // Enable historization
    methods: {
        deactivate() {
            return AuditedCustomer.update(this, { status: 'INACTIVE' });
        }
    }
});

const customer = AuditedCustomer.create({
    id: 'cust-123',
    name: 'John Doe',
    email: 'john@example.com',
    status: 'ACTIVE'
});

const inactiveCustomer = customer.deactivate();

console.log(inactiveCustomer._history);
// Contains a record of the status change
// [{ 
//   timestamp: Date,
//   changes: [{ 
//     field: 'status', 
//     from: 'ACTIVE', 
//     to: 'INACTIVE', 
//     timestamp: Date 
//   }]
// }]
```

## Using Value Objects with Entities

Entities work seamlessly with value objects:

```javascript
import { z } from 'zod';
import { entity, NonEmptyString, Email } from 'domainify';

const User = entity({
    name: 'User',
    schema: z.object({
        id: z.string().uuid(),
        username: z.string(),
        displayName: NonEmptyString.schema, // Properly typed as NonEmptyString schema
        email: Email.schema // Properly typed as Email schema
    }),
    identity: 'id',
    methods: {
        updateDisplayName(name) {
            return User.update(this, {
                displayName: NonEmptyString.create(name)
            });
        },
        updateEmail(email) {
            return User.update(this, {
                email: Email.create(email)
            });
        }
    }
});

// Create user with value objects
const user = User.create({
    id: 'user-123',
    username: 'johndoe',
    displayName: NonEmptyString.create('John Doe'),
    email: Email.create('john@example.com')
});

// Update a value object property
const updatedUser = user.updateDisplayName('John Smith');
```

## Extending Entities

You can extend entities to create more specialized types while inheriting the base behavior:

```javascript
const BaseCustomer = entity({
  name: 'BaseCustomer',
  schema: z.object({
    id: z.string().uuid(),
    name: z.string().min(1)
  }),
  identity: 'id',
  methods: {
    changeName(name) {
      return BaseCustomer.update(this, { name });
    }
  }
});

const PremiumCustomer = BaseCustomer.extend({
  name: 'PremiumCustomer',
  schema: (baseSchema) => baseSchema.extend({
    level: z.enum(['GOLD', 'PLATINUM', 'DIAMOND']),
    discountRate: z.number().min(0).max(1)
  }),
  methods: {
    upgradeMembership(newLevel) {
      const discountRates = {
        'GOLD': 0.05,
        'PLATINUM': 0.10,
        'DIAMOND': 0.15
      };
      
      return PremiumCustomer.update(this, {
        level: newLevel,
        discountRate: discountRates[newLevel]
      });
    }
  }
});

// Create a premium customer
const customer = PremiumCustomer.create({
  id: 'cust-123',
  name: 'Jane Smith',
  level: 'GOLD',
  discountRate: 0.05
});

// Use inherited method
const renamedCustomer = customer.changeName('Jane Doe');

// Use specialized method
const upgradedCustomer = customer.upgradeMembership('PLATINUM');
console.log(upgradedCustomer.level); // 'PLATINUM'
console.log(upgradedCustomer.discountRate); // 0.10
```

## Best Practices

1. **Identify Entities by Their Identity** - Focus on what makes an entity unique in your domain
2. **Make Entities Self-Validating** - Use Zod schemas to enforce validation at creation and update
3. **Prefer Methods Over Direct Updates** - Encapsulate domain logic in methods rather than using `update` directly
4. **Use Value Objects for Complex Attributes** - Decompose complex entities using value objects
5. **Avoid Circular References** - When entities reference each other, use IDs rather than direct references
6. **Consider Historization for Audit Needs** - Enable history tracking when you need to know how entities changed
7. **Keep Entities Focused** - Each entity should have a clear responsibility in the domain

By following these principles, you'll build a rich domain model that accurately captures your business rules and maintains data integrity.
