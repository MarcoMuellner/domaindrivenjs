                                                                                                      # Quick Start Guide

This guide will help you get up and running with Domainify quickly. We'll build a simple e-commerce domain model with products and orders.

## The TLDR Version

Here's the minimal setup to create a domain model with Domainify:

```javascript
import { z } from 'zod';
import { valueObject, entity, aggregate } from 'domainify';

// 1. Create a Money value object
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

// 2. Create a Product entity
const Product = entity({
  name: 'Product',
  schema: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    price: Money.schema,
    stockLevel: z.number().int().nonnegative()
  }),
  identity: 'id',
  methods: {
    decreaseStock(quantity) {
      if (quantity > this.stockLevel) {
        throw new Error('Not enough stock');
      }
      return Product.update(this, {
        stockLevel: this.stockLevel - quantity
      });
    }
  }
});

// 3. Create an Order aggregate
const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
      unitPrice: Money.schema
    })),
    status: z.enum(['DRAFT', 'PLACED', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED'])
  }),
  identity: 'id',
  invariants: [
    {
      name: 'Order must have items when placed',
      check: order => order.status !== 'PLACED' || order.items.length > 0
    }
  ],
  methods: {
    addItem(product, quantity) {
      // Look for existing item with same product
      const existingItemIndex = this.items.findIndex(
        item => item.productId === product.id
      );
      
      let newItems;
      
      if (existingItemIndex >= 0) {
        // Update existing item
        const item = this.items[existingItemIndex];
        const updatedItem = {
          ...item,
          quantity: item.quantity + quantity
        };
        
        newItems = [
          ...this.items.slice(0, existingItemIndex),
          updatedItem,
          ...this.items.slice(existingItemIndex + 1)
        ];
      } else {
        // Add new item
        const newItem = {
          productId: product.id,
          quantity,
          unitPrice: product.price
        };
        
        newItems = [...this.items, newItem];
      }
      
      return Order.update(this, {
        items: newItems
      });
    },
    placeOrder() {
      return Order.update(this, {
        status: 'PLACED'
      });
    }
  }
});

// 4. Use the domain model
const product = Product.create({
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Premium Widget',
  price: Money.create({ amount: 29.99, currency: 'USD' }),
  stockLevel: 100
});

let order = Order.create({
  id: '123e4567-e89b-12d3-a456-426614174001',
  customerId: '123e4567-e89b-12d3-a456-426614174002',
  items: [],
  status: 'DRAFT'
});

order = order.addItem(product, 2);
order = order.placeOrder();
```

## Step-by-Step Explanation

### 1. Create Value Objects

Value objects are immutable objects defined by their attributes. They encapsulate related properties and behaviors. In our example, `Money` is a value object that represents a monetary amount in a specific currency.

```javascript
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
```

Key points:
- Value objects are validated using Zod schemas
- They are immutable - methods return new instances instead of modifying the existing one
- They encapsulate business logic related to the concept they represent

### 2. Create Entities

Entities are objects with identity that can change over time while maintaining that identity.

```javascript
const Product = entity({
  name: 'Product',
  schema: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    price: Money.schema,
    stockLevel: z.number().int().nonnegative()
  }),
  identity: 'id',
  methods: {
    decreaseStock(quantity) {
      if (quantity > this.stockLevel) {
        throw new Error('Not enough stock');
      }
      return Product.update(this, {
        stockLevel: this.stockLevel - quantity
      });
    }
  }
});
```

Key points:
- Entities have a unique identity (specified by the `identity` property)
- Their attributes can change over time
- They encapsulate business logic and enforce invariants
- They use the `update` method to create new instances with changed attributes

### 3. Create Aggregates

Aggregates are clusters of objects treated as a single unit with a root entity.

```javascript
const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
      unitPrice: Money.schema
    })),
    status: z.enum(['DRAFT', 'PLACED', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED'])
  }),
  identity: 'id',
  invariants: [
    {
      name: 'Order must have items when placed',
      check: order => order.status !== 'PLACED' || order.items.length > 0
    }
  ],
  methods: {
    // Methods implementation...
  }
});
```

Key points:
- Aggregates enforce invariants (business rules) across the entire cluster
- They maintain consistency boundaries
- They have a root entity (in this case, the Order itself)
- They encapsulate complex business operations

### 4. Use the Domain Model

Once you've defined your domain model, you can use it to represent and manipulate your domain:

```javascript
const product = Product.create({
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Premium Widget',
  price: Money.create({ amount: 29.99, currency: 'USD' }),
  stockLevel: 100
});

let order = Order.create({
  id: '123e4567-e89b-12d3-a456-426614174001',
  customerId: '123e4567-e89b-12d3-a456-426614174002',
  items: [],
  status: 'DRAFT'
});

order = order.addItem(product, 2);
order = order.placeOrder();
```

Key points:
- All objects are created using their `create` method
- State changes happen through methods that return new instances
- The domain model enforces business rules and invariants

## What's Next?

Now that you've seen a basic example, explore these topics to learn more:

- [Understanding Value Objects](/guide/core/value-objects.md)
- [Working with Entities](/guide/core/entities.md)
- [Aggregates and Business Rules](/guide/core/aggregates.md)
- [Domain Events and Event Sourcing](/guide/core/domain-events.md)

For a deeper understanding of the DDD concepts, check out our [DDD Fundamentals](/guide/ddd/) section.
