# Working with Aggregates

Aggregates are a crucial pattern in Domain-Driven Design that help manage complex object graphs by grouping related entities and value objects into a cohesive unit with clear boundaries. They provide a structured approach to managing relationships and enforcing invariants across multiple objects.

## What is an Aggregate?

An aggregate:
- Is a cluster of domain objects (entities and value objects) treated as a single unit
- Has a root entity (called the aggregate root) that provides the only access point to the objects inside
- Enforces consistency rules (invariants) that must be maintained whenever the aggregate changes
- Defines a transactional boundary for data changes
- Serves as a unit of data retrieval from persistence

## Why Use Aggregates?

Aggregates offer several benefits:
- **Consistency enforcement**: Maintain business rules across multiple objects
- **Simplified object graph**: Clear boundaries around related objects
- **Transactional integrity**: Natural boundaries for database transactions
- **Reduced complexity**: Protected internal state that can only be modified through the root
- **Decreased coupling**: References between aggregates use identity instead of direct object references

## Creating Aggregates with Domainify

Domainify makes creating aggregates straightforward:

```javascript
import { z } from 'zod';
import { aggregate, valueObject, entity } from 'domainify';

// First, let's define a LineItem value object
const LineItem = valueObject({
  name: 'LineItem',
  schema: z.object({
    productId: z.string().uuid(),
    productName: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
  }),
  methods: {
    getSubtotal() {
      return this.quantity * this.unitPrice;
    }
  }
});

// Now, define an Order aggregate
const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    items: z.array(LineItem.schema),
    status: z.enum(['DRAFT', 'PLACED', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    shippingAddress: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string(),
      country: z.string()
    }).optional(),
    placedAt: z.date().optional(),
    updatedAt: z.date()
  }),
  identity: 'id',
  invariants: [
    {
      name: 'Order must have items when placed',
      check: order => order.status !== 'PLACED' || order.items.length > 0
    },
    {
      name: 'Placed order must have shipping address',
      check: order => order.status !== 'PLACED' || order.shippingAddress !== undefined
    },
    {
      name: 'Placed order must have placedAt timestamp',
      check: order => order.status !== 'PLACED' || order.placedAt !== undefined
    }
  ],
  methods: {
    addItem(productId, productName, quantity, unitPrice) {
      if (this.status !== 'DRAFT') {
        throw new Error(`Cannot add items to an order with status: ${this.status}`);
      }
      
      // Create a new line item
      const newItem = LineItem.create({
        productId,
        productName,
        quantity,
        unitPrice
      });
      
      // Check if the product already exists in the order
      const existingItemIndex = this.items.findIndex(item => 
        item.productId === productId
      );
      
      let updatedItems;
      
      if (existingItemIndex >= 0) {
        // Update the quantity if the product already exists
        const existingItem = this.items[existingItemIndex];
        const updatedItem = LineItem.create({
          ...existingItem,
          quantity: existingItem.quantity + quantity
        });
        
        updatedItems = [
          ...this.items.slice(0, existingItemIndex),
          updatedItem,
          ...this.items.slice(existingItemIndex + 1)
        ];
      } else {
        // Add a new item if the product doesn't exist in the order
        updatedItems = [...this.items, newItem];
      }
      
      return Order.update(this, {
        items: updatedItems,
        updatedAt: new Date()
      });
    },
    
    removeItem(productId) {
      if (this.status !== 'DRAFT') {
        throw new Error(`Cannot remove items from an order with status: ${this.status}`);
      }
      
      const updatedItems = this.items.filter(item => 
        item.productId !== productId
      );
      
      // If nothing was removed, throw an error
      if (updatedItems.length === this.items.length) {
        throw new Error(`Product ${productId} not found in order`);
      }
      
      return Order.update(this, {
        items: updatedItems,
        updatedAt: new Date()
      });
    },
    
    placeOrder(shippingAddress) {
      if (this.status !== 'DRAFT') {
        throw new Error(`Cannot place an order with status: ${this.status}`);
      }
      
      return Order.update(this, {
        status: 'PLACED',
        shippingAddress,
        placedAt: new Date(),
        updatedAt: new Date()
      });
    },
    
    cancelOrder() {
      if (!['DRAFT', 'PLACED', 'PAID'].includes(this.status)) {
        throw new Error(`Cannot cancel an order with status: ${this.status}`);
      }
      
      return Order.update(this, {
        status: 'CANCELLED',
        updatedAt: new Date()
      });
    },
    
    getTotal() {
      return this.items.reduce(
        (total, item) => total + (item.quantity * item.unitPrice), 
        0
      );
    }
  }
});
```

Let's break down the components:

1. **`name`**: A descriptive name for your aggregate
2. **`schema`**: A Zod schema that defines the structure and validation rules
3. **`identity`**: The property that uniquely identifies this aggregate root
4. **`invariants`**: Business rules that must always be true for the aggregate
5. **`methods`**: Functions that provide behavior and enforce rules

## Aggregate Boundaries

Determining aggregate boundaries is one of the most important aspects of DDD. Well-designed aggregates:

1. **Enforce true invariants**: Group objects that have consistency rules between them
2. **Are cohesive**: Contain objects that naturally belong together
3. **Are not too large**: Avoid very large object graphs that are hard to load and modify
4. **Consider performance**: Think about how they'll be loaded and saved

### Example: E-commerce Domain

In an e-commerce domain, you might have these aggregates:

- **Order** (contains LineItems, ShippingInfo)
- **Product** (contains ProductVariants, ProductAttributes)
- **Customer** (contains CustomerAddresses, PaymentMethods)
- **ShoppingCart** (contains CartItems)

Each aggregate enforces its own invariants and has its own lifecycle.

## Using Aggregates

Once you've defined your aggregates, you can use them in your application:

```javascript
// Create a new order
let order = Order.create({
  id: '123e4567-e89b-12d3-a456-426614174000',
  customerId: '123e4567-e89b-12d3-a456-426614174001',
  items: [],
  status: 'DRAFT',
  updatedAt: new Date()
});

// Add items to the order
order = order.addItem(
  '123e4567-e89b-12d3-a456-426614174002',
  'Mechanical Keyboard',
  1,
  89.99
);

order = order.addItem(
  '123e4567-e89b-12d3-a456-426614174003',
  'Ergonomic Mouse',
  1,
  59.99
);

// Place the order
order = order.placeOrder({
  street: '123 Main St',
  city: 'Anytown',
  state: 'CA',
  zipCode: '12345',
  country: 'US'
});

// Calculate the total
const total = order.getTotal(); // 149.98
```

## Invariants

Invariants are business rules that must always be true for an aggregate to be valid. They're checked whenever an aggregate is created or updated:

```javascript
const Order = aggregate({
  // ... other properties ...
  invariants: [
    {
      name: 'Order must have items when placed',
      check: order => order.status !== 'PLACED' || order.items.length > 0
    },
    {
      name: 'Shipped order must have tracking number',
      check: order => order.status !== 'SHIPPED' || order.trackingNumber !== undefined
    }
  ]
});

// This will throw an error because it violates the first invariant
const invalidOrder = Order.create({
  id: '123',
  customerId: '456',
  items: [], // Empty items array
  status: 'PLACED', // Status is PLACED, which requires items
  updatedAt: new Date()
});
```

## Domain Events

Aggregates are the natural place for generating domain events - significant occurrences that other parts of the system might want to know about:

```javascript
const Order = aggregate({
  // ... previous properties ...
  methods: {
    placeOrder(shippingAddress) {
      if (this.status !== 'DRAFT') {
        throw new Error(`Cannot place an order with status: ${this.status}`);
      }
      
      return Order.update(this, {
        status: 'PLACED',
        shippingAddress,
        placedAt: new Date(),
        updatedAt: new Date()
      }).emitEvent(OrderPlaced.create({
        orderId: this.id,
        customerId: this.customerId,
        total: this.getTotal(),
        items: this.items,
        placedAt: new Date()
      }));
    },
    
    markAsShipped(trackingNumber) {
      if (this.status !== 'PAID') {
        throw new Error(`Cannot ship an order with status: ${this.status}`);
      }
      
      return Order.update(this, {
        status: 'SHIPPED',
        trackingNumber,
        updatedAt: new Date()
      }).emitEvent(OrderShipped.create({
        orderId: this.id,
        trackingNumber,
        shippedAt: new Date()
      }));
    }
  }
});
```

## Inter-Aggregate References

Aggregates should reference other aggregates by identity, not by direct object reference:

```javascript
// L BAD: Direct reference to another aggregate
const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customer: Customer.schema, // Direct reference to Customer aggregate
    // ... other fields
  })
});

//  GOOD: Reference by identity
const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(), // Reference by ID
    // ... other fields
  })
});
```

## Aggregate Repositories

Each aggregate type typically has its own repository for persistence:

```javascript
const OrderRepository = repository({
  name: 'OrderRepository',
  entity: Order,
  methods: {
    async findByCustomerId(customerId) {
      return this.findMany({ customerId });
    },
    
    async findPendingOrders() {
      return this.findMany({
        status: { $in: ['PLACED', 'PAID'] }
      });
    }
  }
});

// Using the repository
const orderRepo = OrderRepository.create(new MongoAdapter({
  connectionString: 'mongodb://localhost:27017',
  database: 'shop',
  collection: 'orders'
}));

// Save an order
await orderRepo.save(order);

// Find an order by ID
const savedOrder = await orderRepo.findById(order.id);

// Find all orders for a customer
const customerOrders = await orderRepo.findByCustomerId(customerId);
```

## Advanced Aggregate Patterns

### Handling Large Aggregates

For aggregates with a lot of data, you might want to use lazy loading for certain parts:

```javascript
const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    summary: z.object({
      itemCount: z.number().int().nonnegative(),
      total: z.number().nonnegative()
    }),
    // These fields might be lazily loaded
    items: z.array(LineItem.schema).optional(),
    history: z.array(OrderHistoryEntry.schema).optional()
  }),
  methods: {
    // Method to load full details when needed
    async loadFullDetails(orderRepository) {
      if (this.items) {
        return this; // Already loaded
      }
      
      return await orderRepository.findById(this.id, { 
        includeItems: true,
        includeHistory: true
      });
    }
  }
});
```

### Nested Entities

Sometimes you need entities inside an aggregate that aren't aggregates themselves:

```javascript
// A nested entity inside the Order aggregate
const OrderItem = entity({
  name: 'OrderItem',
  schema: z.object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    productName: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
    options: z.array(z.object({
      name: z.string(),
      value: z.string()
    }))
  }),
  identity: 'id'
});

const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    items: z.array(OrderItem.schema),
    // ... other fields
  }),
  // ... rest of the aggregate
});
```

### State Transitions

For aggregates with complex lifecycle states, explicitly modeling state transitions can be helpful:

```javascript
const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    status: z.enum(['DRAFT', 'PLACED', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    // ... other fields
  }),
  methods: {
    // State transitions
    place(shippingAddress) {
      this.assertStatus('DRAFT');
      return Order.update(this, {
        status: 'PLACED',
        shippingAddress,
        placedAt: new Date()
      });
    },
    
    markAsPaid(paymentId) {
      this.assertStatus('PLACED');
      return Order.update(this, {
        status: 'PAID',
        paymentId,
        paidAt: new Date()
      });
    },
    
    ship(trackingNumber) {
      this.assertStatus('PAID');
      return Order.update(this, {
        status: 'SHIPPED',
        trackingNumber,
        shippedAt: new Date()
      });
    },
    
    deliver() {
      this.assertStatus('SHIPPED');
      return Order.update(this, {
        status: 'DELIVERED',
        deliveredAt: new Date()
      });
    },
    
    cancel() {
      this.assertStatusIn(['DRAFT', 'PLACED', 'PAID']);
      return Order.update(this, {
        status: 'CANCELLED',
        cancelledAt: new Date()
      });
    },
    
    // Helper method for state validation
    assertStatus(expected) {
      if (this.status !== expected) {
        throw new Error(`Order must be in ${expected} status, but was ${this.status}`);
      }
    },
    
    assertStatusIn(expectedStatuses) {
      if (!expectedStatuses.includes(this.status)) {
        throw new Error(`Order must be in one of [${expectedStatuses.join(', ')}] statuses, but was ${this.status}`);
      }
    }
  }
});
```

## Best Practices

1. **Keep aggregates small**: Focus on true invariants, not just related data
2. **Reference other aggregates by ID**: Don't create direct object references between aggregates
3. **Design for eventual consistency**: Between aggregates, use eventual consistency, not immediate consistency
4. **Choose the right aggregate root**: The root should be the natural entry point and enforce all invariants
5. **Name aggregates as nouns**: Use domain terminology from your ubiquitous language
6. **Test aggregate invariants**: Write tests that verify your business rules are enforced
7. **Use domain events**: Emit events when significant state changes occur

## Common Aggregate Examples

Here are some common aggregate examples from different domains:

### E-commerce
- **Order** (root) with OrderItems, ShippingInfo
- **Product** (root) with Variants, Attributes, Images
- **Inventory** (root) with StockItems, Reservations
- **Customer** (root) with Addresses, PaymentMethods

### Banking
- **Account** (root) with Transactions, AccountHolders
- **Loan** (root) with PaymentSchedule, CollateralItems
- **Transfer** (root) with SourceAccount, DestinationAccount, Amount

### Project Management
- **Project** (root) with Tasks, Members, Milestones
- **Task** (root) with Comments, Attachments, TimeEntries
- **Team** (root) with Members, Roles, Permissions

## Next Steps

Now that you understand aggregates, learn about [Repositories](./repositories.md) - the pattern for persisting and retrieving aggregates from storage.