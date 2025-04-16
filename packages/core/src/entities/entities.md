# Working with Entities in domainify

Entities are a fundamental building block in Domain-Driven Design (DDD). This guide explains how to create and use entities effectively in your domain model with domainify.

## What are Entities?

Entities are objects with identity that persists across state changes. Unlike value objects which are defined entirely by their attributes, entities are defined primarily by their identity.

Key characteristics:

- **Identified by identity** - Entities have a unique identifier that persists throughout their lifecycle
- **Mutable** - Can be changed while maintaining the same identity
- **Identity-based equality** - Equal if identity fields are equal, regardless of other attribute values
- **Self-validating** - Ensures their values are always valid
- **Domain behaviors** - Encapsulates business logic through methods
- **May contain value objects** - Can have value objects as properties
- **Optional historization** - Can track the history of changes

## Creating Entities

The core of domainify's entity implementation is the `entity` factory function:

```javascript
import { z } from "zod";
import { entity, valueObject } from "domainify";

// A value object to use within the entity
const Email = valueObject({
  name: "Email",
  schema: z.string().email(),
  methods: {
    getDomain() {
      return this.split("@")[1];
    },
  },
});

const Customer = entity({
  name: "Customer",
  schema: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    email: Email.schema,
    createdAt: z.date(),
  }),
  identity: "id",
  historize: true, // Optional history tracking
  methods: {
    updateEmail(email) {
      return this.update({ email });
    },

    changeName(name) {
      return this.update({ name });
    },
  },
});

// Usage
const customer = Customer.create({
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "John Doe",
  email: Email.create("john@example.com"),
  createdAt: new Date(),
});

// Updating an entity - modifies the same instance
customer.updateEmail(Email.create("john.doe@example.com"));
console.log(customer.email); // 'john.doe@example.com'
```

## Entity Identity

Entities are identified by a specific field (specified by the `identity` parameter). This identity persists across state changes, and two entities with the same identity are considered equal:

```javascript
const customer1 = Customer.create({
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "John",
  email: Email.create("john@example.com"),
  createdAt: new Date(),
});

const customer2 = Customer.create({
  id: "123e4567-e89b-12d3-a456-426614174000", // Same ID
  name: "John Doe", // Different name
  email: Email.create("john.doe@example.com"), // Different email
  createdAt: new Date(),
});

// Equal because they have the same ID
console.log(customer1.equals(customer2)); // true
```

## Updating Entities

Entities are mutable, and you can update them using the `update` method:

```javascript
// Direct update method
customer.update({
  name: "John Doe",
  email: Email.create("john.doe@example.com"),
});

// Using a custom update method
customer.updateEmail(Email.create("new.email@example.com"));
```

The entity is modified in-place, while maintaining its identity.

## Value Objects Within Entities

Entities can contain value objects as properties:

```javascript
import { valueObject, entity } from "domainify";

// Define a value object
const Address = valueObject({
  name: "Address",
  schema: z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.string(),
  }),
  methods: {
    format() {
      return `${this.street}, ${this.city}, ${this.zipCode}`;
    },
  },
});

// Use it in an entity
const Customer = entity({
  name: "Customer",
  schema: z.object({
    id: z.string().uuid(),
    name: z.string(),
    address: Address.schema,
  }),
  identity: "id",
  methods: {
    moveToAddress(newAddress) {
      return this.update({ address: newAddress });
    },
  },
});

// Creating with a value object
const address = Address.create({
  street: "123 Main St",
  city: "Anytown",
  zipCode: "12345",
});

const customer = Customer.create({
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "John Doe",
  address,
});

// Update with a new value object
const newAddress = Address.create({
  street: "456 Oak Ave",
  city: "Othertown",
  zipCode: "67890",
});

customer.moveToAddress(newAddress);
```

## Optional History Tracking

Entities can optionally track the history of changes made to them:

```javascript
const HistorizedCustomer = entity({
  name: "Customer",
  schema: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
  }),
  identity: "id",
  historize: true, // Enable history tracking
  methods: {
    // ...methods
  },
});

const customer = HistorizedCustomer.create({
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "John",
  email: "john@example.com",
});

// Make some changes
customer.update({ name: "John Doe" });
customer.update({ email: "john.doe@example.com" });

// Access history
const history = customer.getHistory();
console.log(history);
/*
[
  {
    version: 1,
    timestamp: [Date],
    data: { id: '123e4567-e89b-12d3-a456-426614174000', name: 'John', email: 'john@example.com' }
  },
  {
    version: 2,
    timestamp: [Date],
    data: { id: '123e4567-e89b-12d3-a456-426614174000', name: 'John Doe', email: 'john@example.com' }
  }
]
*/

// Get current version
console.log(customer.getVersion()); // 3
```

## Built-in Behaviors

All entities created with domainify have these built-in behaviors:

### Mutability with Validation

Entities are mutable but ensure all changes are validated:

```javascript
// Will validate the email format
customer.update({ email: "invalid-email" }); // Throws ValidationError
```

### Identity-Based Equality

Entities are equal if their identity fields are equal:

```javascript
console.log(customer1.equals(customer2)); // true if same ID
```

### String Representation

All entities have a meaningful string representation:

```javascript
console.log(customer.toString()); // "Customer(id: 123e4567-e89b-12d3-a456-426614174000)"
```

### Versioning

All entities track their version number:

```javascript
const customer = Customer.create({ id: "abc123", name: "John" });
console.log(customer.getVersion()); // 1

customer.update({ name: "John Doe" });
console.log(customer.getVersion()); // 2
```

## Extending Entities

You can extend entities to create more specialized types:

```javascript
const RegisteredCustomer = Customer.extend({
  name: "RegisteredCustomer",
  schema: (baseSchema) =>
    baseSchema.extend({
      registrationDate: z.date(),
      verified: z.boolean().default(false),
    }),
  methods: {
    verify() {
      return this.update({
        verified: true,
      });
    },
  },
});

// Usage
const registeredCustomer = RegisteredCustomer.create({
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "John Doe",
  email: "john@example.com",
  registrationDate: new Date(),
});

registeredCustomer.verify();
console.log(registeredCustomer.verified); // true
```

## Best Practices

1. **Use meaningful identities** - Choose identity fields that make sense in your domain
2. **Keep entities focused** - Each entity should represent a single concept
3. **Use value objects for valid combinations** - Encapsulate related attributes as value objects
4. **Use domain language** - Name entities and methods using ubiquitous language
5. **Add domain-specific methods** - Operations should model behavior relevant to the domain
6. **Validate thoroughly** - Add all relevant validation in the schema
7. **Consider historization** - Enable history tracking when audit trails are important
8. **Use extension for specialization** - Extend existing entities for more specific types

By following these principles, you'll build a rich, expressive domain model with entities that enforce business rules and capture domain knowledge.
