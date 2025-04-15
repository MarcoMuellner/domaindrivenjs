# Working with Aggregates in domainify

Aggregates are a core building block in Domain-Driven Design (DDD). This guide explains how to create and use aggregates effectively in your domain model with domainify.

## What are Aggregates?

In Domain-Driven Design, aggregates are clusters of domain objects (entities and value objects) treated as a single unit. Each aggregate has:

- **Root Entity** - A single entity that serves as the entry point for accessing the aggregate
- **Boundary** - A clear demarcation of what's inside vs. outside the aggregate
- **Invariants** - Business rules that must be maintained within the aggregate
- **Identity** - A unique identifier derived from the root entity
- **Consistency** - A responsibility to maintain the consistency of the entire cluster

Aggregates define transactional boundaries and are the primary mechanism for enforcing business rules that span multiple related objects.

## Creating Aggregates

The core of domainify's aggregate implementation is the `aggregate` factory function:

```javascript
import { z } from 'zod';
import { aggregate } from 'domainify';

// Define an Order aggregate
const Order = aggregate({
  name: 'Order',                         // Name of the aggregate
  schema: z.object({                     // Zod schema for validation
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      name: z.string().min(1),
      quantity: z.number().int().positive(),
      unitPrice: z.number().positive()
    })),
    status: z.enum(['DRAFT', 'PLACED', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED']),
    placedAt: z.date().optional(),
    total: z.number().nonnegative().optional()
  }),
  identity: 'id',                        // Which field is the identity
  invariants: [                          // Business rules to enforce
    {
      name: 'Order must have at least one item when placed',
      check: order => order.status === 'DRAFT' || order.items.length > 0,
      message: 'Cannot place an order without items'
    },
    {
      name: 'Completed or cancelled order cannot be modified',
      check: order => !['COMPLETED', 'CANCELLED'].includes(order.status),
      message: 'Cannot modify a completed or cancelled order'
    }
  ],
  methods: {                             // Domain behaviors
    addItem(product, quantity) {
      // Implementation that adds an item to the order
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
          name: product.name,
          quantity,
          unitPrice: product.price
        };
        
        newItems = [...this.items, newItem];
      }
      
      // Calculate new total
      const total = newItems.reduce(
        (sum, item) => sum + (item.unitPrice * item.quantity),
        0
      );
      
      return Order.update(this, { 
        items: newItems,
        total
      });
    },
    
    placeOrder() {
      return Order.update(this, {
        status: 'PLACED',
        placedAt: new Date()
      });
    },
    
    cancelOrder(reason) {
      if (this.status === 'SHIPPED' || this.status === 'COMPLETED') {
        throw new Error('Cannot cancel shipped or completed orders');
      }
      
      return Order.update(this, {
        status: 'CANCELLED'
      });
    }
  },
  historize: false                       // Optional history tracking
});
```

## Using Aggregates

### Creating Aggregate Instances

Create new aggregate instances using the `create` method:

```javascript
const order = Order.create({
  id: 'order-123',
  customerId: 'cust-456',
  items: [],
  status: 'DRAFT'
});
```

All properties will be validated against the schema. If any validation fails, a `ValidationError` will be thrown. Additionally, all invariants are checked, and if any fails, an `InvariantViolationError` will be thrown.

### Modifying Aggregates

Modify aggregates using either the aggregate factory or aggregate methods:

```javascript
// Using the factory's update method:
const updatedOrder = Order.update(order, { 
  status: 'PLACED',
  placedAt: new Date()
});

// Or using domain methods (recommended):
const product = {
  id: 'prod-789',
  name: 'Premium Widget',
  price: 99.99
};

const orderWithItem = order.addItem(product, 2);
const placedOrder = orderWithItem.placeOrder();
```

When updating an aggregate, all invariants are validated to ensure the aggregate remains in a consistent state.

### Understanding Invariants

Invariants are business rules that must always be satisfied within an aggregate. They protect the integrity of your domain model:

```javascript
invariants: [
  {
    name: 'Order must have at least one item when placed',
    check: order => order.status === 'DRAFT' || order.items.length > 0,
    message: 'Cannot place an order without items'
  }
]
```

If an invariant is violated, an `InvariantViolationError` is thrown:

```javascript
try {
  // This will throw if the order has no items
  order.placeOrder(); 
} catch (error) {
  if (error instanceof InvariantViolationError) {
    console.error(`Business rule violated: ${error.invariantName}`);
    console.error(`Details: ${error.message}`);
  }
}
```

### Identity and Equality

Like entities, aggregates compare equality based on their identity, not their attributes:

```javascript
const order1 = Order.create({
  id: 'order-123',
  customerId: 'cust-456',
  items: [],
  status: 'DRAFT'
});

const order2 = Order.create({
  id: 'order-123',            // Same ID
  customerId: 'cust-456',
  items: [                    // Different items
    {
      productId: 'prod-789',
      name: 'Widget',
      quantity: 1,
      unitPrice: 10.99
    }
  ],
  status: 'DRAFT'
});

// Equal because they have the same identity
console.log(order1.equals(order2)); // true
```

### Immutability and State Changes

Like entities, aggregate instances are immutable. State changes create new instances while preserving identity:

```javascript
// This throws an error - aggregates are immutable
try {
  order.status = 'PLACED'; // Error: Cannot assign to read-only property
} catch (error) {
  console.error(error);
}

// Instead, use update or methods
const placedOrder = Order.update(order, { status: 'PLACED' });
console.log(placedOrder.status); // 'PLACED'
console.log(order.status);       // Still 'DRAFT'
```

## Integrating with Value Objects

Aggregates can contain value objects as properties, just like entities:

```javascript
import { z } from 'zod';
import { 
  aggregate, 
  NonEmptyString, 
  PositiveNumber,
  specificValueObjectSchema 
} from 'domainify';

const Product = aggregate({
  name: 'Product',
  schema: z.object({
    id: z.string().uuid(),
    name: specificValueObjectSchema(NonEmptyString),
    price: specificValueObjectSchema(PositiveNumber),
    stockLevel: z.number().int().nonnegative(),
    isActive: z.boolean().default(true)
  }),
  identity: 'id',
  invariants: [
    {
      name: 'Product cannot be sold if out of stock',
      check: product => !product.isActive || product.stockLevel > 0,
      message: 'Cannot sell a product with zero stock'
    }
  ],
  methods: {
    decreaseStock(quantity) {
      if (quantity > this.stockLevel) {
        throw new Error('Not enough stock available');
      }
      
      return Product.update(this, {
        stockLevel: this.stockLevel - quantity
      });
    }
  }
});

// Create with value objects
const product = Product.create({
  id: 'prod-123',
  name: NonEmptyString.create('Premium Widget'),
  price: PositiveNumber.create(99.99),
  stockLevel: 10
});
```

## History Tracking

Enable history tracking by setting `historize: true`:

```javascript
const HistorizedOrder = aggregate({
  name: 'HistorizedOrder',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive()
    })),
    status: z.enum(['DRAFT', 'PLACED']),
    _history: z.array(z.any()).optional()
  }),
  identity: 'id',
  historize: true
});

const order = HistorizedOrder.create({
  id: 'order-123',
  customerId: 'cust-456',
  items: [],
  status: 'DRAFT'
});

const placedOrder = HistorizedOrder.update(order, { status: 'PLACED' });

console.log(placedOrder._history);
/* History structure:
[{ 
  timestamp: Date,
  changes: [{ 
    field: 'status', 
    from: 'DRAFT', 
    to: 'PLACED', 
    timestamp: Date 
  }]
}]
*/
```

## Extending Aggregates

Create more specialized aggregates by extending existing ones:

```javascript
const SubscriptionOrder = Order.extend({
  name: 'SubscriptionOrder',
  schema: (baseSchema) => baseSchema.extend({
    renewalPeriod: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
    nextRenewalDate: z.date(),
    isActive: z.boolean().default(true)
  }),
  invariants: [
    {
      name: 'Next renewal date must be in the future',
      check: order => order.nextRenewalDate > new Date(),
      message: 'Renewal date must be in the future'
    },
    {
      name: 'Inactive subscription cannot be renewed',
      check: order => order.isActive || order.status === 'DRAFT',
      message: 'Cannot renew an inactive subscription'
    }
  ],
  methods: {
    renew() {
      const nextDate = new Date(this.nextRenewalDate);
      
      switch (this.renewalPeriod) {
        case 'MONTHLY':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'QUARTERLY':
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case 'YEARLY':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }
      
      return SubscriptionOrder.update(this, {
        nextRenewalDate: nextDate
      });
    },
    
    changeRenewalPeriod(period) {
      return SubscriptionOrder.update(this, {
        renewalPeriod: period
      });
    },
    
    deactivate() {
      return SubscriptionOrder.update(this, {
        isActive: false
      });
    }
  }
});
```

When extending, both schema validation and invariants are combined, ensuring that both the base and extended business rules are enforced.

## Domain Events (Coming Soon)

In a future release, aggregates will integrate closely with domain events, allowing you to emit events when significant state changes occur:

```javascript
// Future API example (not yet implemented)
placeOrder() {
  return Order.update(this, {
    status: 'PLACED',
    placedAt: new Date()
  }).emitEvent('OrderPlaced', {
    orderId: this.id,
    customerId: this.customerId,
    items: this.items,
    total: this.total
  });
}
```

## Repositories (Coming Soon)

Repositories will provide a collection-like interface for storing and retrieving aggregates:

```javascript
// Future API example (not yet implemented)
const OrderRepository = repository({
  aggregate: Order,
  adapter: mongoAdapter({
    collectionName: 'orders'
  })
});

// Save an aggregate
await OrderRepository.save(order);

// Retrieve by ID
const order = await OrderRepository.findById('order-123');
```

## Best Practices

1. **Design Aggregates Around Consistency Boundaries** - Group entities and value objects that need to be consistent with each other.

2. **Keep Aggregates Small** - Focus on essential relationships. Don't include objects just because they're related.

3. **Reference Other Aggregates by Identity** - When one aggregate needs to reference another, use its ID instead of including the entire object.

4. **Protect Invariants** - Define comprehensive invariants to protect the business rules of your domain.

5. **Design for Performance** - Consider how aggregates will be loaded and used in your application.

6. **Use Value Objects** - Break down complex properties into value objects to increase expressiveness and encapsulation.

7. **Validate at Boundaries** - Aggregates enforce their own validation, ensuring data integrity at all times.

8. **Design Methods Around Business Operations** - Methods should model meaningful operations in your domain, not just CRUD.

9. **Consider State Transitions** - Method names should reflect state transitions in your domain (e.g., `placeOrder`, `cancelOrder`).

10. **Apply Command-Query Separation** - Separate methods that change state from methods that return information.

By following these principles, you'll build a rich, expressive domain model with aggregates that enforce business rules and maintain data consistency throughout your application.
