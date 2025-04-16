# Working with Entities in domainify

Entities are a fundamental building block in Domain-Driven Design (DDD). This guide explains how to create and use entities effectively in your domain model with domainify.

## What are Entities?

In Domain-Driven Design, entities are objects defined by their identity, not just their attributes:

- **Identity** - They have a unique identifier that persists throughout their lifecycle
- **Mutable State** - Their attributes can change over time while maintaining identity
- **Business Rules** - They encapsulate domain logic and enforce invariants
- **Lifecycle** - They follow a defined lifecycle (creation, updates, possibly deletion)

The key distinction between entities and value objects is that **two entities with the same attributes but different identities are considered different**. The identity makes the entity unique, not its current state.

## Creating Entities

The core of domainify's entity implementation is the `entity` factory function:

```javascript
import { z } from "zod";
import { entity } from "domainify";

// Define a Customer entity
const Customer = entity({
  name: "Customer", // Name of the entity
  schema: z.object({
    // Zod schema for validation
    id: z.string().uuid(),
    name: z.string().min(1),
    email: z.string().email(),
    address: z.string().optional(),
  }),
  identity: "id", // Which field is the identity
  methods: {
    // Custom domain methods
    updateEmail(email) {
      return Customer.update(this, { email });
    },
    changeName(name) {
      return Customer.update(this, { name });
    },
    moveToAddress(address) {
      return Customer.update(this, { address });
    },
  },
  historize: false, // Optional history tracking
});
```

## Using Entities

### Creating Entity Instances

Create new entity instances using the `create` method:

```javascript
const customer = Customer.create({
  id: "cust-123",
  name: "John Doe",
  email: "john@example.com",
});
```

All properties will be validated against the schema. If any validation fails, a `ValidationError` will be thrown.

### Updating Entities

Update entities using either the entity factory or entity methods:

```javascript
// Using the factory's update method:
const updatedCustomer = Customer.update(customer, {
  name: "John Smith",
});

// Or using domain methods (recommended):
const updatedCustomer = customer.updateEmail("john.smith@example.com");
const movedCustomer = customer.moveToAddress("123 Main St, Anytown");
```

### Identity-Based Equality

Entities compare equality based on their identity, not their attributes:

```javascript
const customer1 = Customer.create({
  id: "cust-123",
  name: "John",
  email: "john@example.com",
});

const customer2 = Customer.create({
  id: "cust-123", // Same ID
  name: "John Smith", // Different name
  email: "john@company.com", // Different email
});

// Equal because they have the same identity
console.log(customer1.equals(customer2)); // true
```

### Immutability with State Changes

Like value objects, entity instances are immutable. State changes create new instances while preserving identity:

```javascript
// This throws an error - entities are immutable
try {
  customer.name = "Jane Doe"; // Error: Cannot assign to read-only property
} catch (error) {
  console.error(error);
}

// Instead, use update or methods
const updatedCustomer = Customer.update(customer, { name: "Jane Doe" });
console.log(updatedCustomer.name); // 'Jane Doe'
console.log(customer.name); // Still 'John Doe'
```

### Identity Protection

The identity field is protected from changes:

```javascript
try {
  // This throws an error - cannot change identity
  Customer.update(customer, { id: "cust-456" });
} catch (error) {
  console.error(error); // Cannot change identity of Customer
}
```

## History Tracking

Enable history tracking by setting `historize: true`:

```javascript
const AuditedCustomer = entity({
  name: "AuditedCustomer",
  schema: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    email: z.string().email(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    _history: z.array(z.any()).optional(),
  }),
  identity: "id",
  historize: true, // Enable history tracking
  methods: {
    deactivate() {
      return AuditedCustomer.update(this, { status: "INACTIVE" });
    },
  },
});

const customer = AuditedCustomer.create({
  id: "cust-123",
  name: "John Doe",
  email: "john@example.com",
  status: "ACTIVE",
});

const inactiveCustomer = customer.deactivate();

console.log(inactiveCustomer._history);
/* History structure:
[{ 
  timestamp: Date,
  changes: [{ 
    field: 'status', 
    from: 'ACTIVE', 
    to: 'INACTIVE', 
    timestamp: Date 
  }]
}]
*/
```

Only actual changes are recorded in history. Updates that don't change values won't create history entries.

## Integrating with Value Objects

Entities can contain value objects as properties. Use the value object schema helpers for proper validation:

```javascript
import { z } from "zod";
import {
  entity,
  NonEmptyString,
  Email,
  Money,
  valueObjectSchema,
  specificValueObjectSchema,
} from "domainify";

const Order = entity({
  name: "Order",
  schema: z.object({
    id: z.string().uuid(),
    customerName: specificValueObjectSchema(NonEmptyString),
    customerEmail: specificValueObjectSchema(Email),
    totalAmount: specificValueObjectSchema(Money),
    // Any value object (not type-specific)
    metadata: valueObjectSchema(),
  }),
  identity: "id",
  methods: {
    updateCustomerName(name) {
      return Order.update(this, {
        customerName: NonEmptyString.create(name),
      });
    },
  },
});

// Create with value objects
const order = Order.create({
  id: "order-123",
  customerName: NonEmptyString.create("John Doe"),
  customerEmail: Email.create("john@example.com"),
  totalAmount: Money.create({ amount: 99.99, currency: "USD" }),
  metadata: SomeValueObject.create({ version: "1.0" }),
});

// Update value object properties
const updatedOrder = order.updateCustomerName("Jane Smith");
```

## Extending Entities

Create more specialized entities by extending existing ones:

```javascript
const BaseUser = entity({
  name: "BaseUser",
  schema: z.object({
    id: z.string().uuid(),
    username: z.string().min(3),
    email: z.string().email(),
  }),
  identity: "id",
  methods: {
    updateEmail(email) {
      return BaseUser.update(this, { email });
    },
  },
});

const AdminUser = BaseUser.extend({
  name: "AdminUser",
  schema: (baseSchema) =>
    baseSchema.extend({
      role: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER"]),
      permissions: z.array(z.string()),
    }),
  methods: {
    grantPermission(permission) {
      const currentPermissions = [...this.permissions];
      if (!currentPermissions.includes(permission)) {
        currentPermissions.push(permission);
      }
      return AdminUser.update(this, { permissions: currentPermissions });
    },
    revokePermission(permission) {
      const currentPermissions = this.permissions.filter(
        (p) => p !== permission,
      );
      return AdminUser.update(this, { permissions: currentPermissions });
    },
  },
});

// Create admin user
const admin = AdminUser.create({
  id: "user-123",
  username: "admin",
  email: "admin@example.com",
  role: "ADMIN",
  permissions: ["users.view", "users.edit"],
});

// Use inherited methods
const updatedAdmin = admin.updateEmail("admin@company.com");

// Use specialized methods
const enhancedAdmin = admin.grantPermission("settings.manage");
```

You can even change the identity field when extending:

```javascript
const ProductByCode = entity({
  name: "ProductByCode",
  schema: z.object({
    code: z.string(),
    name: z.string(),
    price: z.number(),
  }),
  identity: "code", // Using code as identity
});

const ProductById = ProductByCode.extend({
  name: "ProductById",
  schema: (baseSchema) =>
    baseSchema.extend({
      id: z.string().uuid(),
    }),
  identity: "id", // Changed to use id as identity
});
```

## Value Object Schema Helpers

Domainify provides schema helpers to make it easier to use value objects in your entity schemas:

### General Value Object Schema

For any value object type:

```javascript
import { z } from "zod";
import { valueObjectSchema } from "domainify";

const schema = z.object({
  // Accepts any value object
  genericValueObj: valueObjectSchema(),

  // With custom validation and message
  customValueObj: valueObjectSchema({
    typeName: "MoneyValue",
    typeCheck: (val) =>
      typeof val.amount === "number" && typeof val.currency === "string",
  }),
});
```

### Specific Value Object Schema

For specific value object types:

```javascript
import { z } from "zod";
import { specificValueObjectSchema, Email, Money } from "domainify";

const schema = z.object({
  // Specifically validates Email value objects
  email: specificValueObjectSchema(Email),

  // Specifically validates Money value objects
  price: specificValueObjectSchema(Money),
});
```

## Best Practices

1. **Make Identity Explicit**: Choose meaningful identity fields that naturally represent uniqueness in your domain.

2. **Prefer Methods Over Direct Updates**: Encapsulate domain logic in methods rather than using the `update` function directly.

3. **Keep Entities Focused**: Each entity should represent a single concept in your domain with clear responsibilities.

4. **Use Value Objects for Complex Attributes**: Decompose complex properties into value objects instead of primitive values.

5. **Consider Immutability**: Even though entities can change, treat individual instances as immutable by using the update methods.

6. **Historize When Needed**: Enable history tracking only when you need to track changes over time to avoid overhead.

7. **Validate at Boundaries**: Entities enforce their own validation, ensuring data integrity at all times.

8. **Avoid Deep Entity Nesting**: Prefer references (by ID) over direct nesting of entities within entities.

9. **Extend for Specialization**: Use extension for creating specialized entity types rather than duplicating code.

10. **Use Schema Helpers for Value Objects**: Leverage the schema helpers to integrate value objects properly.

By following these principles, you'll build a rich, expressive domain model that accurately captures your business rules and maintains data integrity throughout your application.
