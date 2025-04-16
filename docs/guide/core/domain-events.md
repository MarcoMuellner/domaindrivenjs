# Working with Domain Events

Domain events are a fundamental pattern in Domain-Driven Design that helps model and communicate significant happenings within your domain. They enable loosely coupled, event-driven architectures that are both powerful and flexible.

## What are Domain Events?

A domain event:
- Represents something significant that happened in the domain
- Is expressed in the past tense (e.g., OrderPlaced, PaymentReceived)
- Contains all relevant information about what happened
- Is immutable and represents a fact that occurred at a specific point in time

## Why Use Domain Events?

Domain events offer several benefits:
- **Loose coupling**: Systems can react to events without the event source knowing about them
- **Better auditability**: Events create a clear record of what happened and when
- **Distributed processing**: Different systems can process events independently
- **Temporal modeling**: Events naturally capture time-sequenced behavior
- **Event sourcing**: Enable storing state as a sequence of events rather than snapshots

## Creating Domain Events with Domainify

Domainify makes it easy to create and work with domain events:

```javascript
import { z } from 'zod';
import { domainEvent, aggregate } from 'domainify';

// Define our events
const OrderPlaced = domainEvent({
  name: 'OrderPlaced',
  schema: z.object({
    orderId: z.string().uuid(),
    customerId: z.string().uuid(),
    orderTotal: z.number().positive(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
      price: z.number().positive()
    })),
    placedAt: z.date()
  })
});

const OrderShipped = domainEvent({
  name: 'OrderShipped',
  schema: z.object({
    orderId: z.string().uuid(),
    trackingNumber: z.string(),
    shippedAt: z.date()
  })
});

// Order aggregate that emits events
const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
      price: z.number().positive()
    })),
    status: z.enum(['DRAFT', 'PLACED', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    total: z.number().nonnegative(),
    createdAt: z.date(),
    updatedAt: z.date()
  }),
  identity: 'id',
  methods: {
    place() {
      if (this.status !== 'DRAFT') {
        throw new Error(`Cannot place an order with status: ${this.status}`);
      }
      
      if (this.items.length === 0) {
        throw new Error('Cannot place an empty order');
      }
      
      return Order.update(this, { 
        status: 'PLACED',
        updatedAt: new Date()
      }).emitEvent(OrderPlaced.create({
        orderId: this.id,
        customerId: this.customerId,
        orderTotal: this.total,
        items: this.items,
        placedAt: new Date()
      }));
    },
    
    ship(trackingNumber) {
      if (this.status !== 'PAID') {
        throw new Error(`Cannot ship an order with status: ${this.status}`);
      }
      
      return Order.update(this, {
        status: 'SHIPPED',
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

Let's break down the components:

1. **`name`**: A descriptive name for your event
2. **`schema`**: A Zod schema that defines the structure and validation rules for the event data
3. **`emitEvent`**: Method on aggregates to create and publish events

## Event Handling

Once you've defined your events, you can set up handlers to react to them:

```javascript
import { EventBus } from 'domainify';

// Create an event bus
const eventBus = new EventBus();

// Register handlers for specific events
eventBus.subscribe(OrderPlaced, async (event) => {
  console.log(`Order ${event.orderId} was placed at ${event.placedAt}`);
  
  // Notify the inventory service
  await inventoryService.reserveItems(event.items);
  
  // Notify the customer
  await notificationService.sendOrderConfirmation(event.customerId, event.orderId);
});

eventBus.subscribe(OrderShipped, async (event) => {
  console.log(`Order ${event.orderId} was shipped with tracking number ${event.trackingNumber}`);
  
  // Update shipping status
  await shippingService.trackShipment(event.orderId, event.trackingNumber);
  
  // Notify the customer
  await notificationService.sendShippingNotification(event.orderId, event.trackingNumber);
});

// Register a handler for all events
eventBus.subscribeToAll(async (event) => {
  // Log all events
  await auditLogger.logEvent(event);
  
  // Persist all events
  await eventStore.saveEvent(event);
});
```

## Working with the Event Bus

The event bus provides a central place to publish and subscribe to events:

```javascript
// Manually publishing an event
eventBus.publish(OrderPlaced.create({
  orderId: 'order-123',
  customerId: 'customer-456',
  orderTotal: 99.99,
  items: [/* ... */],
  placedAt: new Date()
}));

// Connect the event bus to your aggregates
const orderWithBus = Order.withEventBus(eventBus);

// Now when you use your aggregates, events will be published automatically
const order = orderWithBus.create({
  id: 'order-123',
  customerId: 'customer-456',
  items: [/* ... */],
  status: 'DRAFT',
  total: 99.99,
  createdAt: new Date(),
  updatedAt: new Date()
});

// This will automatically publish the OrderPlaced event to the bus
const placedOrder = order.place();
```

## Event Sourcing

Domain events can be used as the primary source of truth in your system with event sourcing:

```javascript
import { EventSourcedAggregate } from 'domainify';

// Create an event-sourced aggregate
const EventSourcedOrder = EventSourcedAggregate({
  name: 'Order',
  events: {
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
    OrderItemAdded: {
      schema: z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
        price: z.number().positive()
      }),
      apply: (state, event) => {
        const newItem = {
          productId: event.productId,
          quantity: event.quantity,
          price: event.price
        };
        const newItems = [...state.items, newItem];
        const newTotal = state.total + (event.price * event.quantity);
        
        return {
          ...state,
          items: newItems,
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
        updatedAt: event.placedAt
      })
    }
    // More event handlers...
  },
  commands: {
    createOrder: (_, { customerId }) => [
      OrderCreated.create({
        customerId,
        createdAt: new Date()
      })
    ],
    addItem: (state, { productId, quantity, price }) => {
      if (state.status !== 'DRAFT') {
        throw new Error('Cannot add items to a non-draft order');
      }
      
      return [
        OrderItemAdded.create({
          productId,
          quantity,
          price
        })
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
        OrderPlaced.create({
          placedAt: new Date()
        })
      ];
    }
    // More command handlers...
  }
});
```

Working with the event-sourced aggregate:

```javascript
// Create a new order
let order = await orderRepository.getById('order-123');
if (!order) {
  order = EventSourcedOrder.createNew('order-123');
  
  // Execute commands which produce events
  order = order.execute('createOrder', { customerId: 'customer-456' });
  order = order.execute('addItem', { productId: 'product-789', quantity: 2, price: 49.99 });
  order = order.execute('placeOrder');
  
  // Save the events
  await orderRepository.save(order);
}
```

## Integration Events vs. Domain Events

There are two types of events that you might work with:

### Domain Events
- Internal to your domain
- Capture business-significant occurrences
- Often consumed by the same bounded context
- Example: `OrderPlaced`, `PaymentReceived`

### Integration Events
- Cross bounded contexts or systems
- Used for communication between separate parts of the system
- Often carry less information than internal domain events
- Example: `OrderPlacedIntegration`, `PaymentReceivedIntegration`

```javascript
// Convert a domain event to an integration event
const OrderPlacedIntegration = domainEvent({
  name: 'OrderPlacedIntegration',
  schema: z.object({
    orderId: z.string().uuid(),
    customerId: z.string().uuid(),
    total: z.number().positive(),
    placedAt: z.date()
  })
});

// In your event handler
eventBus.subscribe(OrderPlaced, async (event) => {
  // Handle internally
  await inventoryService.reserveItems(event.items);
  
  // Publish integration event for other systems
  await integrationEventBus.publish(OrderPlacedIntegration.create({
    orderId: event.orderId,
    customerId: event.customerId,
    total: event.orderTotal,
    placedAt: event.placedAt
  }));
});
```

## Best Practices

1. **Name events in past tense**: Events represent things that have already happened
2. **Include all relevant data**: An event should contain everything needed to understand what happened
3. **Make events immutable**: Once created, an event should never change
4. **Include timestamp information**: When did this event occur?
5. **Consider versioning**: As your system evolves, you might need to version your events
6. **Be mindful of event size**: Very large events can cause performance issues
7. **Design for concurrency**: Events should be processed concurrently when possible

## Common Domain Event Patterns

### Event Notification
Use events to notify other parts of the system about changes:

```javascript
// Order system emits event
orderAggregate.place().emitEvent(OrderPlaced.create({/*...*/}));

// Inventory system listens and acts
eventBus.subscribe(OrderPlaced, async (event) => {
  await inventoryService.reserveItems(event.items);
});

// Notification system also listens and acts
eventBus.subscribe(OrderPlaced, async (event) => {
  await emailService.sendOrderConfirmation(event.customerId, event.orderId);
});
```

### Event Carried State Transfer
Use events to propagate state changes across systems:

```javascript
// Customer system emits events with relevant customer data
customerAggregate.changeAddress(newAddress).emitEvent(
  CustomerAddressChanged.create({
    customerId: this.id,
    newAddress: newAddress.toJSON(),
    changedAt: new Date()
  })
);

// Order system maintains a local copy of customer data
eventBus.subscribe(CustomerAddressChanged, async (event) => {
  await orderService.updateCustomerAddress(
    event.customerId, 
    event.newAddress
  );
});
```

### Event Sourcing with Snapshots
For performance in event-sourced systems, use snapshots:

```javascript
// Load an aggregate from events or snapshot
async function loadOrder(orderId) {
  // Try to get a snapshot first
  const snapshot = await snapshotStore.getLatestSnapshot(orderId);
  
  // Get events after the snapshot
  const events = await eventStore.getEvents(
    orderId, 
    snapshot ? snapshot.version : 0
  );
  
  // Rebuild the aggregate state
  let order;
  if (snapshot) {
    order = EventSourcedOrder.fromSnapshot(snapshot);
  } else {
    order = EventSourcedOrder.createEmpty(orderId);
  }
  
  // Apply events to rebuild current state
  return order.applyEvents(events);
}

// Periodically create snapshots
async function createSnapshot(order) {
  if (order.eventsSinceSnapshot > 100) {
    await snapshotStore.saveSnapshot({
      aggregateId: order.id,
      version: order.version,
      state: order.state,
      timestamp: new Date()
    });
    
    order.resetEventsSinceSnapshot();
  }
}
```

## Next Steps

Now that you understand domain events, learn about [Specifications](./specifications.md) - reusable business rules that can be composed and evaluated against your domain objects.