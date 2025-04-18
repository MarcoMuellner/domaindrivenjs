# Working with Domain Events

When something significant happens in your domain that other parts of your system should know about, you need a way to communicate that occurrence. Domain events solve this problem elegantly by representing these important happenings as first-class objects in your code.

<!-- DIAGRAM: Visual showing an event flowing from an aggregate (source) to multiple subscribers, with timeline showing "Event Happens" → "Event Published" → "Handlers React" -->

## What are Domain Events?

A domain event is an immutable object that represents something meaningful that has happened in your domain. They are always named in past tense (e.g., `OrderPlaced`, `PaymentReceived`) because they describe something that has already occurred.

::: tip Real-world Analogy
Think of a newspaper. When something significant happens in the world, a newspaper publishes the story. It doesn't directly tell each reader what happened—it simply publishes the news with all the relevant details, and interested readers can consume that information and react to it in their own way. Similarly, domain events announce that something important happened in your application, carrying all the relevant data about that occurrence, and interested components can subscribe to and react to these events without the source needing to know who's listening.
:::

### Key Characteristics

- **Named in past tense** - Events describe something that has already happened
- **Immutable** - Once created, events cannot be modified
- **Self-contained** - Include all relevant data about what happened
- **Timestamped** - Record when the event occurred
- **Identifiable** - Can be uniquely identified (often with the source aggregate ID)
- **Observable** - Can be subscribed to by interested parties

### Real-world Analogies

Consider these everyday examples:
- A wedding announcement (event: `PersonMarried`)
- A birth announcement (event: `BabyBorn`)
- A store receipt (event: `PurchaseCompleted`)
- A graduation notification (event: `DegreeAwarded`)

Each represents something meaningful that happened, carries important information about the occurrence, and is sent to interested parties.

## Why Use Domain Events?

Domain events offer several powerful benefits for your architecture:

### 1. Decoupling Components

Events create loose coupling between parts of your system. The component that emits an event doesn't need to know who's listening or what they'll do with the information.

```
Without events:
Order → Direct call → Inventory → Direct call → Notification → Direct call → Analytics
```

```
With events:
Order → OrderPlaced Event → [Inventory, Notification, Analytics] (subscribe independently)
```

### 2. Capturing Business Significance

Events make important business activities explicit in your code:

```javascript
// Without events - just internal state changes
function placeOrder(order) {
  order.status = 'PLACED';
  order.placedAt = new Date();
  save(order);
}

// With events - capturing business significance
function placeOrder(order) {
  const placedOrder = order.place(); // Returns updated order and attaches event
  save(placedOrder); // Saves and publishes the event
}
```

### 3. Enabling Distributed Systems

Events facilitate communication between separate services or bounded contexts:

<!-- DIAGRAM: Multiple bounded contexts/services communicating via events through an event bus -->

### 4. Supporting Audit and History

Events create a natural audit trail of system activity:

```
10:15:32 - UserRegistered { userId: "user-123", email: "user@example.com" }
10:16:05 - OrderPlaced { orderId: "order-456", userId: "user-123", items: [...] }
10:16:12 - PaymentReceived { orderId: "order-456", amount: 59.99 }
10:16:15 - OrderShipped { orderId: "order-456", trackingNumber: "TN123456" }
```

### 5. Enabling Event Sourcing

Events can serve as the primary source of truth in your system, with the current state derived from the event history (more on this later).

## Creating Domain Events with DomainDrivenJS

DomainDrivenJS makes it easy to create and use domain events:

```javascript
import { z } from 'zod';
import { domainEvent } from 'domaindrivenjs';

// Define our event
const OrderPlaced = domainEvent({
  name: 'OrderPlaced',
  schema: z.object({
    orderId: z.string().uuid(),
    customerId: z.string().uuid(),
    totalAmount: z.number().positive(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().positive()
    })),
    placedAt: z.date()
  })
});

// Create an event instance
const event = OrderPlaced.create({
  orderId: 'order-123',
  customerId: 'cust-456',
  totalAmount: 99.99,
  items: [
    { productId: 'prod-789', quantity: 2, unitPrice: 49.99 }
  ],
  placedAt: new Date()
});
```

Let's break down the components:

1. **`name`**: A descriptive name for your event (always past tense)
2. **`schema`**: A Zod schema that defines the data structure and validation rules
3. **`create`**: Factory method to create a validated event instance

## The Event Lifecycle

Domain events typically follow this lifecycle:

<!-- DIAGRAM: Flow chart showing the event lifecycle with: 1. Source creates event, 2. Event is published, 3. Event bus distributes to handlers, 4. Handlers process the event -->

### 1. Creation

An event is created when something significant happens, typically within an aggregate:

```javascript
const Order = aggregate({
  // ...
  methods: {
    place() {
      if (this.status !== 'DRAFT') {
        throw new Error(`Cannot place an order with status: ${this.status}`);
      }
      
      return Order.update(this, { 
        status: 'PLACED',
        placedAt: new Date()
      }).emitEvent(OrderPlaced, {
        orderId: this.id,
        customerId: this.customerId,
        totalAmount: this.getTotalAmount(),
        items: this.items,
        placedAt: new Date()
      });
    }
  }
});
```

The `.emitEvent()` method attaches the event to the aggregate but doesn't publish it yet.

### 2. Publication

Events are typically published when an aggregate is saved to a repository:

```javascript
// Events are published when the aggregate is saved
await orderRepository.save(order.place());
```

### 3. Distribution

The event bus distributes events to all interested subscribers:

```javascript
import { eventBus } from 'domaindrivenjs';

// Set up event handling
eventBus.on(OrderPlaced, async (event) => {
  console.log(`Order ${event.orderId} was placed at ${event.placedAt}`);
  
  // Handle the event by updating inventory
  await inventoryService.reserveItems(event.items);
});

// Set up another handler for the same event
eventBus.on(OrderPlaced, async (event) => {
  // Send confirmation email
  await emailService.sendOrderConfirmation(event.customerId, event.orderId);
});
```

### 4. Processing

Each handler processes the event according to its responsibility:

```javascript
// Inventory handler
async function handleOrderPlaced(event) {
  for (const item of event.items) {
    await inventoryRepository.reserveItem(item.productId, item.quantity);
  }
}

// Notification handler
async function handleOrderPlaced(event) {
  const customer = await customerRepository.findById(event.customerId);
  await notificationService.sendEmail({
    to: customer.email,
    subject: 'Your order has been placed',
    body: `Thank you for your order #${event.orderId}`
  });
}
```

## The Event Bus

The event bus is central to working with domain events, providing a publish-subscribe mechanism:

```javascript
import { eventBus } from 'domaindrivenjs';

// Subscribe to an event (using event factory)
eventBus.on(OrderPlaced, async (event) => {
  // Handle event
});

// Subscribe to an event (using event name as string)
eventBus.on('OrderPlaced', async (event) => {
  // Handle event
});

// Subscribe once (handler will be removed after first execution)
eventBus.once(OrderPlaced, async (event) => {
  // Handle event once
});

// Manually publish an event
await eventBus.publish(OrderPlaced.create({
  orderId: 'order-123',
  // other data...
}));

// Publish multiple events
await eventBus.publishAll([
  OrderPlaced.create({ /* data */ }),
  PaymentReceived.create({ /* data */ })
]);
```

### Custom Event Bus Adapters

You can create custom event bus adapters for different messaging systems:

```javascript
import { createEventBus } from 'domaindrivenjs';

// Create a custom adapter for RabbitMQ (example)
const rabbitMQAdapter = {
  async publish(event) {
    await rabbitConnection.sendToQueue(
      'domain-events',
      Buffer.from(JSON.stringify(event))
    );
  },
  
  subscribe(eventType, handler) {
    // Set up subscription using RabbitMQ
    const consumer = async (msg) => {
      const content = JSON.parse(msg.content.toString());
      if (content.type === eventType) {
        await handler(content);
        channel.ack(msg);
      }
    };
    
    channel.consume('domain-events', consumer);
    
    // Return function to unsubscribe
    return () => channel.cancel(consumer);
  }
};

// Create event bus with custom adapter
const messagingEventBus = createEventBus({
  adapter: rabbitMQAdapter
});

// Or set adapter on existing event bus
eventBus.setAdapter(rabbitMQAdapter);
```

## Working with Aggregates and Events

DomainDrivenJS provides a seamless integration between aggregates and domain events:

### Emitting Events

Aggregates can emit events when significant state changes occur:

```javascript
const Order = aggregate({
  // ...
  methods: {
    place() {
      // Validation, state changes...
      
      return Order.update(this, {
        status: 'PLACED',
        placedAt: new Date()
      }).emitEvent(OrderPlaced, {
        orderId: this.id,
        customerId: this.customerId,
        // other event data...
      });
    },
    
    cancel(reason) {
      // Validation, state changes...
      
      return Order.update(this, {
        status: 'CANCELLED',
        cancelledAt: new Date()
      }).emitEvent(OrderCancelled, {
        orderId: this.id,
        reason,
        cancelledAt: new Date()
      });
    }
  }
});
```

### Getting and Clearing Events

Events attached to an aggregate can be accessed and cleared:

```javascript
// Place order (attaches an event)
const placedOrder = order.place();

// Get all events from the aggregate
const events = placedOrder.getDomainEvents();
console.log(events); // [OrderPlaced event]

// Clear events from the aggregate
const clearedOrder = placedOrder.clearDomainEvents();
console.log(clearedOrder.getDomainEvents()); // []
```

### Automatic Publishing with Repositories

Repositories can automatically publish events when an aggregate is saved:

```javascript
const OrderRepository = repository({
  aggregate: Order,
  adapter: createMongoAdapter({
    collectionName: 'orders'
  }),
  events: {
    publishOnSave: true, // Auto-publish events when saving
    clearAfterPublish: true // Clear events after publishing
  }
});

// When we save the order, events are automatically published
await OrderRepository.save(order.place());
```

## Event Patterns and Best Practices

### Event Naming

Follow these naming conventions for clarity:

| Guideline | Good Examples | Poor Examples |
|-----------|---------------|--------------|
| Use past tense | OrderPlaced, PaymentReceived | PlaceOrder, ReceivePayment |
| Be specific | CustomerAddressChanged | CustomerUpdated |
| Focus on business significance | StockDepleted | StockChanged |
| Use domain terminology | ShipmentDispatched | BoxSent |

### Event Content

Design your event content carefully:

1. **Include all necessary context** - Events should be self-contained
2. **Use identifiers, not full objects** - Include IDs, not nested objects
3. **Include a timestamp** - When did this happen?
4. **Consider versioning information** - For event evolution
5. **Keep events focused** - One event per significant occurrence

Example of well-designed event content:

```javascript
OrderShipped = domainEvent({
  name: 'OrderShipped',
  schema: z.object({
    orderId: z.string().uuid(),
    shippedAt: z.date(),
    trackingNumber: z.string(),
    carrier: z.string(),
    estimatedDelivery: z.date(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive()
    })),
    version: z.string().default('1.0')
  })
});
```

### Event Patterns

#### Notification Events

Simple notifications about something that happened:

```javascript
// Just notify interested parties
UserLoggedIn.create({
  userId: 'user-123',
  timestamp: new Date(),
  ipAddress: '192.168.1.1'
});
```

#### State Change Events

Capturing changes to domain objects:

```javascript
// Before and after state
CustomerProfileUpdated.create({
  customerId: 'cust-123',
  changes: {
    previousEmail: 'old@example.com',
    newEmail: 'new@example.com',
    updatedAt: new Date()
  }
});
```

#### Domain Significant Events

Representing important domain activities:

```javascript
// Business significance
LowStockDetected.create({
  productId: 'prod-123',
  currentQuantity: 5,
  thresholdQuantity: 10,
  warehouseId: 'warehouse-1',
  detectedAt: new Date()
});
```

### Domain Events vs. Integration Events

It's important to distinguish between different types of events:

| Type | Purpose | Scope | Examples |
|------|---------|-------|----------|
| **Domain Events** | Capture domain changes | Within a bounded context | OrderPlaced, InventoryReduced |
| **Integration Events** | Communication between contexts | Across bounded contexts | OrderPlacedIntegration, PaymentProcessedIntegration |

Integration events typically contain less information and are designed for cross-context communication:

```javascript
// Domain event (rich, internal)
OrderPlaced.create({
  orderId: 'order-123',
  customerId: 'cust-456',
  items: [/* detailed item information */],
  appliedPromotions: [/* promotion details */],
  customerNotes: 'Please leave at the door',
  placedAt: new Date()
});

// Integration event (streamlined, external)
OrderPlacedIntegration.create({
  orderId: 'order-123',
  customerId: 'cust-456',
  totalAmount: 99.99,
  itemCount: 3,
  placedAt: new Date()
});
```

## Event Sourcing

Event sourcing is a powerful pattern where events become the primary source of truth, with the current state derived from the event history.

<!-- DIAGRAM: Flow showing: Events → Event Store → Replay → Current State, with branches for snapshots and projections -->

### Basic Concept

Instead of storing the current state, you store a sequence of events that led to that state:

```
Traditional: Save current order state (Order with status = "SHIPPED")

Event Sourced: 
1. OrderCreated {...}
2. ProductAdded {...}
3. OrderPlaced {...}
4. PaymentReceived {...}
5. OrderShipped {...}
```

The current state is rebuilt by replaying these events in sequence.

### Implementing Event Sourcing with DomainDrivenJS

DomainDrivenJS supports event sourcing with the `EventSourcedAggregate` pattern:

```javascript
import { EventSourcedAggregate } from 'domaindrivenjs';

// Create an event-sourced aggregate
const EventSourcedOrder = EventSourcedAggregate({
  name: 'Order',
  events: {
    // Define events and their impact on state
    OrderCreated: {
      schema: z.object({
        customerId: z.string().uuid(),
        createdAt: z.date()
      }),
      apply: (state, event) => ({
        ...state,
        customerId: event.customerId,
        items: [],
        status: 'DRAFT',
        total: 0,
        createdAt: event.createdAt,
        updatedAt: event.createdAt
      })
    },
    
    ProductAdded: {
      schema: z.object({
        productId: z.string().uuid(),
        productName: z.string(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive()
      }),
      apply: (state, event) => {
        const newItem = {
          productId: event.productId,
          productName: event.productName,
          quantity: event.quantity,
          unitPrice: event.unitPrice
        };
        
        // Check if product already exists in order
        const existingItemIndex = state.items.findIndex(
          item => item.productId === event.productId
        );
        
        let updatedItems;
        if (existingItemIndex >= 0) {
          // Update quantity of existing item
          const existingItem = state.items[existingItemIndex];
          const updatedItem = {
            ...existingItem,
            quantity: existingItem.quantity + event.quantity
          };
          
          updatedItems = [
            ...state.items.slice(0, existingItemIndex),
            updatedItem,
            ...state.items.slice(existingItemIndex + 1)
          ];
        } else {
          // Add new item
          updatedItems = [...state.items, newItem];
        }
        
        // Calculate new total
        const newTotal = updatedItems.reduce(
          (sum, item) => sum + (item.quantity * item.unitPrice),
          0
        );
        
        return {
          ...state,
          items: updatedItems,
          total: newTotal,
          updatedAt: new Date()
        };
      }
    },
    
    OrderPlaced: {
      schema: z.object({
        placedAt: z.date()
      }),
      apply: (state, event) => ({
        ...state,
        status: 'PLACED',
        placedAt: event.placedAt,
        updatedAt: event.placedAt
      })
    }
    // More event handlers...
  },
  
  commands: {
    // Commands trigger events
    createOrder: (_, { customerId }) => [
      {
        type: 'OrderCreated',
        data: {
          customerId,
          createdAt: new Date()
        }
      }
    ],
    
    addProduct: (state, { product, quantity }) => {
      if (state.status !== 'DRAFT') {
        throw new Error('Cannot add products to a non-draft order');
      }
      
      return [
        {
          type: 'ProductAdded',
          data: {
            productId: product.id,
            productName: product.name,
            quantity,
            unitPrice: product.price
          }
        }
      ];
    },
    
    placeOrder: (state) => {
      if (state.status !== 'DRAFT') {
        throw new Error('Cannot place an order that is not in draft status');
      }
      
      if (state.items.length === 0) {
        throw new Error('Cannot place an empty order');
      }
      
      return [
        {
          type: 'OrderPlaced',
          data: {
            placedAt: new Date()
          }
        }
      ];
    }
  }
});
```

### Working with Event-Sourced Aggregates

```javascript
// Create a new order by issuing commands that generate events
let order = await orderRepository.getById('order-123');
if (!order) {
  order = EventSourcedOrder.createNew('order-123');
  
  // Execute commands which produce events
  order = order.execute('createOrder', { customerId: 'cust-456' });
  order = order.execute('addProduct', { product, quantity: 2 });
  order = order.execute('placeOrder');
  
  // Save the events
  await orderRepository.save(order);
}

// When loading, the state is reconstructed from events
const reconstitutedOrder = await orderRepository.getById('order-123');
```

### Snapshots for Performance

For performance with long event streams, snapshots store the current state at intervals:

```javascript
// Load from snapshot and apply only newer events
async function loadOrderWithSnapshot(orderId) {
  // Try to get a snapshot first
  const snapshot = await snapshotStore.getLatestSnapshot(orderId);
  
  // Get events after the snapshot
  const events = await eventStore.getEvents(
    orderId, 
    snapshot ? snapshot.version : 0
  );
  
  // Rebuild from snapshot or empty
  let order;
  if (snapshot) {
    order = EventSourcedOrder.fromSnapshot(snapshot);
  } else {
    order = EventSourcedOrder.createEmpty(orderId);
  }
  
  // Apply newer events to rebuild current state
  return order.applyEvents(events);
}

// Create snapshots periodically
function createSnapshotIfNeeded(order) {
  if (order.eventsSinceSnapshot > 100) {
    snapshotStore.saveSnapshot({
      aggregateId: order.id,
      version: order.version,
      state: order.state,
      timestamp: new Date()
    });
  }
}
```

## Common Event Patterns

### Event Notification

Simple notification of other components:

```javascript
// Order service emits event
orderAggregate.place().emitEvent(OrderPlaced.create({/*...*/}));

// Inventory service listens and acts
eventBus.on(OrderPlaced, async (event) => {
  await inventoryService.reserveItems(event.items);
});

// Notification service also listens and acts
eventBus.on(OrderPlaced, async (event) => {
  await emailService.sendOrderConfirmation(event.customerId, event.orderId);
});
```

### Event-Carried State Transfer

Use events to keep separate services in sync:

```javascript
// Customer service emits events with changed data
customerAggregate.updateAddress(newAddress).emitEvent(
  CustomerAddressChanged.create({
    customerId: this.id,
    newAddress,
    changedAt: new Date()
  })
);

// Order service maintains its own copy of customer data
eventBus.on(CustomerAddressChanged, async (event) => {
  await orderService.updateCustomerAddress(
    event.customerId, 
    event.newAddress
  );
});
```

### Event Sourcing with CQRS

Combining Event Sourcing with Command Query Responsibility Segregation:

<!-- DIAGRAM: CQRS + Event Sourcing, showing Command Side → Events → Event Store → Projections → Query Side -->

```
Commands → Command Handlers → Domain Events → Event Store
                                    ↓
                               Projections
                                    ↓
Queries ← Query Handlers ← Read Models (optimized for querying)
```

### Event Versioning

As your events evolve, you may need versioning strategies:

```javascript
// Version 1 of an event
const OrderPlacedV1 = domainEvent({
  name: 'OrderPlaced',
  schema: z.object({
    orderId: z.string().uuid(),
    customerId: z.string().uuid(),
    totalAmount: z.number(),
    placedAt: z.date(),
    _version: z.literal('1.0').default('1.0')
  })
});

// Version 2 adds additional fields
const OrderPlacedV2 = domainEvent({
  name: 'OrderPlaced',
  schema: z.object({
    orderId: z.string().uuid(),
    customerId: z.string().uuid(),
    totalAmount: z.number(),
    items: z.array(z.object({/*...*/})), // Added field
    shippingAddress: z.object({/*...*/}), // Added field
    placedAt: z.date(),
    _version: z.literal('2.0').default('2.0')
  })
});

// Event handler that supports multiple versions
eventBus.on('OrderPlaced', (event) => {
  if (event._version === '1.0') {
    // Handle v1 format
  } else if (event._version === '2.0') {
    // Handle v2 format
  } else {
    // Unknown version
    console.error(`Unknown event version: ${event._version}`);
  }
});
```

## Troubleshooting and Best Practices

### Common Issues

1. **Missed Events**: Events not being processed by certain handlers
    - Use persistent messaging with retry mechanisms
    - Implement idempotent handlers that can safely reprocess events

2. **Too Many Events**: System performance degrades with high event volume
    - Consider event filtering mechanisms
    - Use snapshots for event sourcing
    - Implement event pruning for old events

3. **Inconsistent Processing Order**: Events processed out of sequence
    - Use sequence numbers or timestamps
    - Design handlers to be resilient to out-of-order events
    - Consider event batching or transaction boundaries

### Best Practices

1. **Design for Idempotence**: Handlers should be able to process the same event multiple times without side effects
   ```javascript
   // Idempotent handler using request ID for uniqueness
   eventBus.on(PaymentReceived, async (event) => {
     // Check if we've already processed this event
     if (await processedEvents.exists(event.id)) {
       return; // Already processed, exit early
     }
     
     // Process the payment
     await recordPayment(event.orderId, event.amount);
     
     // Mark as processed to ensure idempotence
     await processedEvents.record(event.id);
   });
   ```

2. **Include Essential Context**: Events should contain all necessary information for handlers
   ```javascript
   // Good: Contains all context needed
   OrderShipped.create({
     orderId: 'order-123',
     customerId: 'cust-456', // Include for notifications
     trackingNumber: 'TN123456789',
     carrier: 'FedEx',
     estimatedDelivery: estimatedDate,
     shippedAt: new Date()
   });
   
   // Bad: Missing essential context
   OrderShipped.create({
     orderId: 'order-123',
     trackingNumber: 'TN123456789'
     // Missing customer ID for notifications
     // Missing carrier information
     // Missing dates
   });
   ```

3. **Handle Failures Gracefully**: Implement resilient event handling
   ```javascript
   eventBus.on(OrderPlaced, async (event) => {
     try {
       await inventoryService.reserveItems(event.items);
     } catch (error) {
       // Log the error
       logger.error(`Failed to reserve inventory for order ${event.orderId}`, error);
       
       // Record the failure for manual resolution
       await failedEventQueue.add({
         eventType: 'OrderPlaced',
         eventData: event,
         error: error.message,
         timestamp: new Date()
       });
       
       // Optionally raise a system alert
       await alertingService.raiseAlert(
         'INVENTORY_RESERVATION_FAILED',
         `Failed to reserve inventory for order ${event.orderId}`
       );
     }
   });
   ```

4. **Name Events Meaningfully**: Use clear, past-tense verbs that reflect domain significance
   ```javascript
   // Good: Clear and specific
   CustomerEmailVerified, OrderShipped, PaymentDeclined
   
   // Bad: Vague or present tense
   UpdateUser, ProcessOrder, HandlePayment
   ```

5. **Document Event Schema**: Maintain clear documentation of your events
   ```javascript
   /**
    * OrderPlaced - Emitted when a customer confirms their order
    * 
    * Properties:
    * - orderId: Unique identifier for the order
    * - customerId: Customer who placed the order
    * - totalAmount: Order total including taxes and shipping
    * - items: Array of items ordered with quantities
    * - placedAt: When the order was placed
    * 
    * Consumers:
    * - Inventory Service (reserves stock)
    * - Notification Service (sends confirmation email)
    * - Analytics Service (updates sales metrics)
    */
   ```

## Next Steps

Now that you understand domain events, explore these related topics:

- [Aggregates](./aggregates.md): Learn how aggregates emit domain events
- [Repositories](./repositories.md): See how repositories publish events when saving aggregates
- [Event Sourcing](../advanced/event-sourcing.md): Dive deeper into using events as your source of truth
- [CQRS](../advanced/cqrs.md): Learn about separating read and write operations with events

By mastering domain events, you unlock powerful architectural patterns that lead to more maintainable, scalable, and loosely coupled systems.
