# Working with Entities

Entities are a fundamental building block in Domain-Driven Design. While value objects are defined by their attributes, entities are defined by their identity and can change over time.

## What is an Entity?

An entity:
- Has a unique identity that remains constant throughout its lifecycle
- Can change its attributes over time while maintaining the same identity
- Represents a specific individual, object, or concept in your domain
- Encapsulates state and behavior

Common examples include:
- User (with a unique user ID)
- Order (with a unique order number)
- Product (with a unique product code)
- Customer (with a unique customer ID)

## Why Use Entities?

Entities offer several benefits:
- **Identity tracking**: Follow an object through its lifecycle even as it changes
- **State management**: Manage changes to an object over time
- **Behavior encapsulation**: Group related operations with the data they affect
- **Consistent validation**: Enforce invariants and business rules
- **Intent revelation**: Express domain concepts clearly in your code

## Creating Entities with Domainify

Domainify provides a simple way to create entities:

```javascript
import { z } from 'zod';
import { entity, valueObject } from 'domainify';

// First, let's define a Money value object
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
    }
  }
});

// Now, let's create a Product entity
const Product = entity({
  name: 'Product',
  schema: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    description: z.string().optional(),
    price: Money.schema,
    stockLevel: z.number().int().nonnegative(),
    createdAt: z.date(),
    updatedAt: z.date()
  }),
  identity: 'id',
  methods: {
    updatePrice(newPrice) {
      return Product.update(this, {
        price: newPrice,
        updatedAt: new Date()
      });
    },
    decreaseStock(quantity) {
      if (quantity > this.stockLevel) {
        throw new Error('Not enough stock');
      }
      return Product.update(this, {
        stockLevel: this.stockLevel - quantity,
        updatedAt: new Date()
      });
    },
    increaseStock(quantity) {
      return Product.update(this, {
        stockLevel: this.stockLevel + quantity,
        updatedAt: new Date()
      });
    }
  }
});
```

Let's break down the components:

1. **`name`**: A descriptive name for your entity
2. **`schema`**: A Zod schema that defines the structure and validation rules
3. **`identity`**: The property that uniquely identifies this entity
4. **`methods`**: Functions that provide behavior related to the entity

## Using Entities

Once you've defined an entity, you can use it in your code:

```javascript
// Create a new Product entity
const product = Product.create({
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Ergonomic Keyboard',
  description: 'A comfortable keyboard for long typing sessions',
  price: Money.create({ amount: 89.99, currency: 'USD' }),
  stockLevel: 50,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Update the product's price
const discountedProduct = product.updatePrice(
  Money.create({ amount: 79.99, currency: 'USD' })
);

// Process an order
const updatedProduct = product.decreaseStock(5);
```

## Entity Identity and Equality

Entities are compared by their identity, not by their attributes:

```javascript
const product1 = Product.create({
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Ergonomic Keyboard',
  price: Money.create({ amount: 89.99, currency: 'USD' }),
  stockLevel: 50,
  createdAt: new Date(),
  updatedAt: new Date()
});

const product2 = Product.create({
  id: '123e4567-e89b-12d3-a456-426614174000', // Same ID
  name: 'Ergonomic Keyboard Pro', // Different name
  price: Money.create({ amount: 129.99, currency: 'USD' }), // Different price
  stockLevel: 25, // Different stock level
  createdAt: new Date(),
  updatedAt: new Date()
});

const product3 = Product.create({
  id: '123e4567-e89b-12d3-a456-426614174001', // Different ID
  name: 'Ergonomic Keyboard', // Same name
  price: Money.create({ amount: 89.99, currency: 'USD' }), // Same price
  stockLevel: 50, // Same stock level
  createdAt: new Date(),
  updatedAt: new Date()
});

console.log(product1.equals(product2)); // true - same identity
console.log(product1.equals(product3)); // false - different identity
```

## Entity Lifecycle

Entities typically have a lifecycle:

1. **Creation**: An entity is created with initial state
2. **Updates**: The entity's state changes over time through its methods
3. **Archival/Deletion**: The entity may be marked as inactive or deleted

Domainify helps you manage this lifecycle with immutable update patterns.

## Entities vs. Value Objects

Here's a comparison of entities and value objects:

| Characteristic | Entities | Value Objects |
|----------------|----------|---------------|
| **Identity** | Defined by identity | Defined by attributes |
| **Mutability** | Can change attributes | Immutable |
| **Equality** | Equal if same identity | Equal if same attributes |
| **Lifespan** | Tracked over time | Can be created and discarded |
| **Examples** | User, Order, Product | Money, Address, DateRange |

## Best Practices

1. **Focus on identity**: Choose meaningful, stable identifiers
2. **Encapsulate state changes**: Provide methods for all valid state transitions
3. **Enforce invariants**: Ensure state changes maintain valid entity state
4. **Use value objects**: Compose entities with value objects for complex attributes
5. **Keep methods focused**: Each method should represent a single, coherent operation
6. **Name clearly**: Use domain terminology for entities and methods

## Common Entity Patterns

### Identity Generation

There are several approaches to generating entity identifiers:

```javascript
// Client-generated UUID
const Order = entity({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    // other properties...
  }),
  identity: 'id'
});

// Server-assigned incremental ID (from database)
const Order = entity({
  name: 'Order',
  schema: z.object({
    id: z.number().int().positive(),
    orderNumber: z.string(),
    // other properties...
  }),
  identity: 'id'
});

// Natural key as identity
const CountryCode = entity({
  name: 'CountryCode',
  schema: z.object({
    code: z.string().length(2).toUpperCase(),
    name: z.string()
  }),
  identity: 'code'
});
```

### Validation on Update

It's important to validate entity state after changes:

```javascript
const BankAccount = entity({
  name: 'BankAccount',
  schema: z.object({
    id: z.string().uuid(),
    balance: z.number(),
    status: z.enum(['ACTIVE', 'FROZEN', 'CLOSED'])
  }),
  identity: 'id',
  methods: {
    withdraw(amount) {
      if (this.status !== 'ACTIVE') {
        throw new Error(`Cannot withdraw from account with status: ${this.status}`);
      }
      
      if (amount > this.balance) {
        throw new Error('Insufficient funds');
      }
      
      return BankAccount.update(this, {
        balance: this.balance - amount
      });
    }
  }
});
```

## Next Steps

Now that you understand entities, learn about [Aggregates](./aggregates.md) - clusters of objects that work together as a unit.