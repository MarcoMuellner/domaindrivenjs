# Working with Aggregates

Aggregates are a crucial pattern in Domain-Driven Design that solve one of the most challenging problems in software: **maintaining consistency in a complex object graph**. They provide clear boundaries for transactional changes and help you design models that protect business rules.

<!-- DIAGRAM: Visual showing an aggregate as a boundary around a cluster of entities and value objects, with a clear root entity and connections between objects inside the boundary -->

## What is an Aggregate?

An aggregate is a cluster of domain objects (entities and value objects) treated as a single unit for data changes. Each aggregate has:

- **Root Entity** - A single entry point that controls access to members inside the aggregate
- **Boundary** - A clear demarcation of what's inside vs. outside the aggregate
- **Invariants** - Business rules that must be consistent within the aggregate
- **Identity** - Derived from the root entity's identity
- **Transactional Consistency** - All changes to objects inside the boundary happen in a single transaction

### Visualizing an Aggregate

Think of an aggregate like a protective bubble around a group of related objects:

- The **aggregate root** is the only entity visible from outside
- External objects can only reference the root, not the internal members
- All modifications must go through the root, which enforces invariants
- When saved, everything inside the bubble is saved together

## Why Use Aggregates?

Aggregates solve several critical problems in domain modeling:

1. **Consistency Enforcement** - Maintain business rules across related objects
2. **Simplified Object Graphs** - Prevent tangled webs of object references
3. **Clear Transaction Boundaries** - Define what must be changed together
4. **Reduced Complexity** - Protect the internal state of object clusters
5. **Controlled Access** - Provide a single point of entry for modifications
6. **Decoupled Design** - Limit dependencies between different parts of the system

### The Problem Aggregates Solve

Without aggregates, object relationships become tangled and consistency becomes difficult to maintain:

<!-- DIAGRAM: Before/after comparison showing messy object graph with arrows everywhere vs. clear aggregate boundaries -->

```
// WITHOUT AGGREGATES: Complex, tangled object relationships
order.customer.address.changeCity("New York");
order.items[0].product.decreaseStock(2);
order.updateTotal();
// Did we remember to update everything that depends on these changes?
// What if an invariant is violated?
```

With aggregates, we have clear boundaries and access rules:

```
// WITH AGGREGATES: Clean, controlled modifications
order.shipTo(newAddress); // Order aggregate handles internal consistency
inventory.decreaseStock(productId, 2); // Inventory aggregate handles stock rules
```

## Creating Aggregates with DomainDrivenJS

DomainDrivenJS makes creating aggregates straightforward with the `aggregate` factory function:

```javascript
import { z } from 'zod';
import { aggregate, valueObject } from 'domaindrivenjs';

// Define a value object for use within the aggregate
const LineItem = valueObject({
  name: 'LineItem',
  schema: z.object({
    productId: z.string().uuid(),
    productName: z.string().min(1),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
  }),
  methods: {
    getSubtotal() {
      return this.quantity * this.unitPrice;
    }
  }
});

// Define an Order aggregate
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
      check: order => order.status !== 'PLACED' || order.items.length > 0,
      message: "Cannot place an empty order"
    },
    {
      name: 'Placed order must have shipping address',
      check: order => order.status !== 'PLACED' || order.shippingAddress !== undefined,
      message: "Shipping address is required to place an order"
    },
    {
      name: 'Placed order must have placedAt timestamp',
      check: order => order.status !== 'PLACED' || order.placedAt !== undefined,
      message: "Missing placement timestamp"
    }
  ],
  methods: {
    // Add a product to the order
    addItem(product, quantity) {
      // Reject modifications to orders that aren't in draft status
      if (this.status !== 'DRAFT') {
        throw new Error(`Cannot add items to an order with status: ${this.status}`);
      }
      
      // Create a new line item
      const newItem = LineItem.create({
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: product.price
      });
      
      // Check if the product already exists in the order
      const existingItemIndex = this.items.findIndex(item => 
        item.productId === product.id
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
      
      // Return a new Order instance with the updated items
      return Order.update(this, {
        items: updatedItems,
        updatedAt: new Date()
      });
    },
    
    // Remove an item from the order
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
    
    // Place the order
    placeOrder(shippingAddress) {
      if (this.status !== 'DRAFT') {
        throw new Error(`Cannot place an order with status: ${this.status}`);
      }
      
      // Note: The invariants will automatically check if the order has items
      // and if the shipping address is provided
      
      const now = new Date();
      
      return Order.update(this, {
        status: 'PLACED',
        shippingAddress,
        placedAt: now,
        updatedAt: now
      }).emitEvent('OrderPlaced', {
        orderId: this.id,
        customerId: this.customerId,
        total: this.getTotal(),
        placedAt: now
      });
    },
    
    // Cancel the order
    cancelOrder(reason) {
      if (!['DRAFT', 'PLACED', 'PAID'].includes(this.status)) {
        throw new Error(`Cannot cancel an order with status: ${this.status}`);
      }
      
      return Order.update(this, {
        status: 'CANCELLED',
        updatedAt: new Date()
      }).emitEvent('OrderCancelled', {
        orderId: this.id,
        reason: reason || 'Customer requested cancellation',
        cancelledAt: new Date()
      });
    },
    
    // Calculate the total cost of the order
    getTotal() {
      return this.items.reduce(
        (total, item) => total + LineItem.create(item).getSubtotal(), 
        0
      );
    }
  }
});
```

### Reviewing the Components

Let's break down the key elements:

1. **schema**: Defines the structure and validation rules for the aggregate
2. **identity**: Specifies which property serves as the identity of the aggregate root
3. **invariants**: Business rules that must always be true for the aggregate to be valid
4. **methods**: Operations that modify the aggregate or provide information about it

## Determining Aggregate Boundaries

One of the most challenging aspects of using aggregates is deciding what should be included within a single aggregate boundary. This decision impacts both consistency and performance.

### Guidelines for Good Aggregate Design

1. **Include only what must be consistent together** - If two things must be consistent with each other, they likely belong in the same aggregate
2. **Keep aggregates small** - Smaller aggregates are easier to load, save, and keep consistent
3. **Consider domain experts' mental model** - How domain experts think about related concepts often hints at natural aggregate boundaries
4. **Analyze transactional requirements** - What needs to change together in a single transaction?
5. **Consider performance implications** - Very large aggregates can cause performance issues

### Common Aggregate Patterns

Here are some common patterns for aggregates across different domains:

| Domain | Aggregate Root | Contains |
|--------|----------------|----------|
| E-commerce | Order | OrderLines, ShippingInfo, PaymentDetails |
| Banking | Account | Transactions, AccountHolders, AccountRules |
| HR | Employee | Positions, Skills, Benefits, TimeEntries |
| Inventory | Product | Variants, Specifications, StockLevels |
| Insurance | Policy | Coverage, Claims, Beneficiaries |

### Example: E-commerce Domain

In an e-commerce system, you might have these aggregates:

<!-- DIAGRAM: E-commerce domain aggregates showing Order, Product, Customer, and ShoppingCart as separate aggregates with their internal entities and value objects -->

- **Order Aggregate**
    - Root: Order
    - Contains: OrderLines, ShippingDetails, BillingDetails

- **Product Aggregate**
    - Root: Product
    - Contains: ProductVariants, ProductAttributes, Pricing

- **Customer Aggregate**
    - Root: Customer
    - Contains: CustomerAddresses, PaymentMethods, Preferences

- **ShoppingCart Aggregate**
    - Root: ShoppingCart
    - Contains: CartItems, AppliedDiscounts, ShippingEstimate

Note that each aggregate references others by ID, not direct object references.

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
const keyboard = {
  id: '123e4567-e89b-12d3-a456-426614174002',
  name: 'Mechanical Keyboard',
  price: 89.99
};

const mouse = {
  id: '123e4567-e89b-12d3-a456-426614174003',
  name: 'Ergonomic Mouse',
  price: 59.99
};

order = order.addItem(keyboard, 1);
order = order.addItem(mouse, 1);

// Calculate the total
const total = order.getTotal(); // 149.98

// Place the order
const shippingAddress = {
  street: '123 Main St',
  city: 'Anytown',
  state: 'CA',
  zipCode: '12345',
  country: 'US'
};

order = order.placeOrder(shippingAddress);

// Order is now in PLACED status and has emitted an OrderPlaced event
console.log(order.status); // 'PLACED'
```

### Immutability and State Changes

Like entities in DomainDrivenJS, aggregates are immutable. State changes create new instances:

```javascript
const draftOrder = Order.create({/*...*/});
console.log(draftOrder.status); // 'DRAFT'

const placedOrder = draftOrder.placeOrder({/*...*/});
console.log(placedOrder.status); // 'PLACED'

// The original order remains unchanged
console.log(draftOrder.status); // Still 'DRAFT'
```

## Invariants: Protecting Business Rules

Invariants are business rules that must always be satisfied within an aggregate. They're checked whenever an aggregate is created or updated:

```javascript
const Order = aggregate({
  // ... other properties ...
  invariants: [
    {
      name: 'Order must have items when placed',
      check: order => order.status !== 'PLACED' || order.items.length > 0,
      message: "Cannot place an empty order"
    }
  ]
});

// This will throw an InvariantViolationError because it violates the invariant
try {
  const emptyOrder = Order.create({
    id: '123',
    customerId: '456',
    items: [], // Empty items array
    status: 'PLACED', // Status is PLACED, which requires items
    updatedAt: new Date()
  });
} catch (error) {
  console.error(`${error.name}: ${error.message}`);
  // "InvariantViolationError: Cannot place an empty order"
}
```

### Invariants vs. Validation

It's important to understand the difference between validation and invariants:

- **Validation** checks if individual values are valid (handled by the Zod schema)
- **Invariants** check if the relationships between values make sense in the business context

For example:
- Validation ensures a price is a positive number
- An invariant ensures that an order can't be placed without items

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
      }).emitEvent('OrderPlaced', {
        orderId: this.id,
        customerId: this.customerId,
        total: this.getTotal(),
        items: this.items,
        placedAt: new Date()
      });
    },
    
    markAsShipped(trackingNumber) {
      if (this.status !== 'PAID') {
        throw new Error(`Cannot ship an order with status: ${this.status}`);
      }
      
      return Order.update(this, {
        status: 'SHIPPED',
        trackingNumber,
        updatedAt: new Date()
      }).emitEvent('OrderShipped', {
        orderId: this.id,
        trackingNumber,
        shippedAt: new Date()
      });
    }
  }
});
```

### Working with Events

Events emitted by aggregates are typically handled when the aggregate is saved to a repository:

```javascript
// When saving with a repository, events are published to subscribers
await orderRepository.save(order.placeOrder(shippingAddress));

// Event handlers respond to the events
eventBus.on('OrderPlaced', async (event) => {
  console.log(`Order ${event.orderId} was placed with total ${event.total}`);
  
  // Handle the event by performing related actions
  await notificationService.sendOrderConfirmation(event.customerId, event.orderId);
  await inventoryService.reserveItems(event.items);
});
```

## Inter-Aggregate References

A critical rule of aggregates is that they should reference other aggregates by identity, not by direct object reference. This maintains proper boundaries and prevents tangled object graphs:

```javascript
// BAD: Direct reference to another aggregate
const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customer: Customer.schema, // Direct reference to Customer aggregate
    // ... other fields
  })
});

// GOOD: Reference by identity
const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(), // Reference by ID
    // ... other fields
  })
});
```

### Why This Matters

Referencing by identity provides several benefits:

1. **Clear boundaries** - It's obvious where one aggregate ends and another begins
2. **Simpler persistence** - Easier to save aggregates independently
3. **Reduced memory usage** - Don't need to load entire object graphs
4. **Consistency control** - Changes to one aggregate don't directly affect others
5. **Easier concurrency handling** - Less chance of conflicting changes

## Aggregate Repositories

Each aggregate type should have its own repository for persistence:

```javascript
import { repository } from 'domaindrivenjs';

const OrderRepository = repository({
  aggregate: Order,
  adapter: mongoAdapter({
    connectionString: 'mongodb://localhost:27017',
    database: 'shop',
    collection: 'orders'
  }),
  // Configuration for event handling
  events: {
    publishOnSave: true, // Publish events when saving
    clearAfterPublish: true // Clear events after publishing
  }
});

// Custom queries
const OrderRepository = repository({
  aggregate: Order,
  adapter: mongoAdapter({
    collectionName: "orders",
  }),
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

// Save an order and publish its events
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

### Event Sourcing

For more advanced scenarios, you can implement event sourcing with aggregates, where the state is reconstructed from a sequence of events:

```javascript
// Simplified event sourcing example
function applyEvents(events, initialState = {}) {
  // Rebuild aggregate state by applying events in sequence
  return events.reduce((state, event) => {
    switch (event.type) {
      case 'OrderCreated':
        return {
          id: event.orderId,
          customerId: event.customerId,
          items: [],
          status: 'DRAFT'
        };
      
      case 'OrderItemAdded':
        return {
          ...state,
          items: [...state.items, {
            productId: event.productId,
            productName: event.productName,
            quantity: event.quantity,
            unitPrice: event.unitPrice
          }]
        };
      
      case 'OrderPlaced':
        return {
          ...state,
          status: 'PLACED',
          placedAt: event.timestamp
        };
      
      // Handle other events...
      
      default:
        return state;
    }
  }, initialState);
}

// Recreate order from events
const events = await eventStore.getEvents('order-123');
const order = Order.create(applyEvents(events));
```

## Best Practices

1. **Keep aggregates small** - Focus on true invariants, not just related data
2. **Reference other aggregates by ID** - Don't create direct object references between aggregates
3. **Design for eventual consistency** - Between aggregates, use eventual consistency, not immediate consistency
4. **Choose the right aggregate root** - The root should be the natural entry point and enforce all invariants
5. **Name aggregates as nouns** - Use domain terminology from your ubiquitous language
6. **Test aggregate invariants** - Write tests that verify your business rules are enforced
7. **Use domain events** - Emit events when significant state changes occur
8. **Transaction per aggregate** - Modify only one aggregate per transaction
9. **Be mindful of loading performance** - Consider how aggregates will be loaded and used
10. **Model state transitions explicitly** - Make lifecycle states and transitions clear

## Common Aggregate Examples

Here are some common aggregate examples from different domains to inspire your own modeling:

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

## Troubleshooting Common Issues

### "My aggregates are too large"

**Signs**:
- Slow loading times
- Complex relationships inside the aggregate
- Too many items in collections

**Solutions**:
- Split into multiple aggregates with references by ID
- Use summary data instead of embedding full objects
- Implement lazy loading for less-frequently-needed data

### "Changes to one aggregate affect another"

**Signs**:
- Invariants span multiple aggregates
- Direct references between aggregates
- Changes don't save correctly

**Solutions**:
- Use domain events to maintain eventual consistency
- Reference by ID, not by object reference
- Reconsider your aggregate boundaries

### "It's hard to decide what belongs together"

**Signs**:
- Uncertainty about which objects belong in which aggregate
- Frequent changes to aggregate structure

**Solutions**:
- Focus on what must be consistent together
- Look at transaction boundaries in the business
- Consider performance implications
- Start broader and refine later

## Next Steps

Now that you understand aggregates, explore these related topics:

- [Repositories](./repositories.md) - For persisting and retrieving aggregates
- [Domain Events](./domain-events.md) - For communication between aggregates
- [Specifications](./specifications.md) - For encapsulating query logic
- [Domain Services](./domain-services.md) - For operations that span multiple aggregates
