# Working with Domain Events in domaindrivenjs

Domain Events are a fundamental building block in Domain-Driven Design (DDD). This guide explains how to create and use domain events effectively in your application with domaindrivenjs.

## What are Domain Events?

Domain Events represent something meaningful that happened in your domain that domain experts care about. They are named using past-tense verbs (e.g., `OrderPlaced`, `PaymentReceived`) because they describe something that has already occurred.

Key characteristics:

- **Immutable** - Once created, events cannot be changed
- **Self-descriptive** - Named using past-tense verbs to indicate what happened
- **Timestamped** - Events record when they occurred
- **Carriers of relevant data** - Include all necessary information about what happened
- **Distributable** - Can be published to interested subscribers

Domain events serve several important purposes:

- Recording state changes for auditing and traceability
- Enabling decoupled communication between domain components
- Supporting eventual consistency across aggregates
- Facilitating integration between bounded contexts

## Creating Domain Events

The core of domaindrivenjs's domain event implementation is the `domainEvent` factory function:

```javascript
import { z } from "zod";
import { domainEvent } from "domaindrivenjs";

// Define an OrderPlaced event
const OrderPlaced = domainEvent({
  name: "OrderPlaced", // Past-tense verb describing what happened
  schema: z.object({
    // Schema for validation
    orderId: z.string().uuid(),
    customerId: z.string().uuid(),
    items: z.array(
      z.object({
        productId: z.string().uuid(),
        name: z.string(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive(),
      }),
    ),
    total: z.number().positive(),
    // timestamp is automatically added to all events
  }),
  metadata: {
    // Optional metadata about the event
    version: "1.0",
    audience: ["fulfillment", "billing"],
  },
});

// Create an event instance
const orderPlacedEvent = OrderPlaced.create({
  orderId: "order-123",
  customerId: "cust-456",
  items: [
    {
      productId: "prod-789",
      name: "Premium Widget",
      quantity: 2,
      unitPrice: 29.99,
    },
  ],
  total: 59.98,
});
```

## Event Bus

The Event Bus is the central mechanism for publishing events and subscribing to them:

```javascript
import { eventBus } from "domaindrivenjs";

// Subscribe to an event
const subscription = eventBus.on(OrderPlaced, (event) => {
  console.log(`Order ${event.orderId} was placed with total ${event.total}`);
  // Handle the event
});

// Subscribe for a single occurrence
eventBus.once(OrderPlaced, (event) => {
  console.log(`One-time handler for order ${event.orderId}`);
});

// Publish an event
await eventBus.publish(orderPlacedEvent);

// Unsubscribe when no longer needed
subscription.unsubscribe();
```

## Emitting Events from Aggregates

Aggregates are the primary source of domain events. Events represent significant state changes within an aggregate:

```javascript
import { z } from "zod";
import { aggregate, domainEvent } from "domaindrivenjs";

// Define an OrderPlaced event
const OrderPlaced = domainEvent({
  name: "OrderPlaced",
  schema: z.object({
    orderId: z.string().uuid(),
    customerId: z.string().uuid(),
    total: z.number().positive(),
  }),
});

// Define an Order aggregate
const Order = aggregate({
  name: "Order",
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    items: z.array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive(),
      }),
    ),
    status: z.enum([
      "DRAFT",
      "PLACED",
      "PAID",
      "SHIPPED",
      "COMPLETED",
      "CANCELLED",
    ]),
    total: z.number().nonnegative().optional(),
  }),
  identity: "id",
  methods: {
    addItem(product, quantity) {
      // Existing implementation...
      return Order.update(this, {
        items: newItems,
        total,
      });
    },

    placeOrder() {
      if (this.items.length === 0) {
        throw new Error("Cannot place an empty order");
      }

      // Update aggregate state
      const placedOrder = Order.update(this, {
        status: "PLACED",
        placedAt: new Date(),
      });

      // Emit domain event
      return placedOrder.emitEvent(OrderPlaced, {
        orderId: this.id,
        customerId: this.customerId,
        total: this.total,
      });
    },
  },
});

// Using the aggregate and emitting events
const order = Order.create({
  id: "order-123",
  customerId: "cust-456",
  items: [],
  status: "DRAFT",
});

// Add items
const withItems = order.addItem(product, 2);

// Place order (will emit an OrderPlaced event)
const placedOrder = withItems.placeOrder();

// The event is now stored in the aggregate but not yet published
console.log(placedOrder.getDomainEvents()); // [OrderPlaced event]
```

## Publishing Events

Events are typically published when an aggregate is saved to a repository:

```javascript
// Define a repository
const OrderRepository = repository({
  aggregate: Order,
  adapter: mongoAdapter({
    collectionName: "orders",
  }),
  // Optional event handling configuration
  events: {
    // Automatically publish events when saving
    publishOnSave: true,
    // Clear events after publishing
    clearAfterPublish: true,
  },
});

// When saving the aggregate, events are automatically published
await OrderRepository.save(placedOrder);

// Events have now been published to all subscribers
// and cleared from the aggregate
```

You can also manually publish events:

```javascript
// Get all domain events from the aggregate
const events = placedOrder.getDomainEvents();

// Publish them
await eventBus.publishAll(events);

// Clear events from the aggregate after publishing
placedOrder.clearDomainEvents();
```

## Handling Events

Event handlers should be focused on their specific responsibilities:

```javascript
// Notification handler
eventBus.on(OrderPlaced, async (event) => {
  await notificationService.sendEmail({
    to: event.customerEmail,
    subject: "Your order has been placed",
    body: `Thank you for your order #${event.orderId}`,
  });
});

// Analytics handler
eventBus.on(OrderPlaced, async (event) => {
  await analyticsService.trackOrder({
    orderId: event.orderId,
    total: event.total,
    timestamp: event.timestamp,
  });
});

// Integration with other bounded contexts
eventBus.on(OrderPlaced, async (event) => {
  await fulfillmentService.createShipment({
    orderId: event.orderId,
    items: event.items,
  });
});
```

## Extending Events

You can extend existing events to create more specialized versions:

```javascript
// Extend the base OrderPlaced event
const InternationalOrderPlaced = OrderPlaced.extend({
  name: "InternationalOrderPlaced",
  schema: (baseSchema) =>
    baseSchema.extend({
      shippingCountry: z.string(),
      customsValue: z.number().nonnegative(),
      hasCustomsDocuments: z.boolean(),
    }),
  metadata: {
    version: "1.0",
    audience: ["international-fulfillment", "customs"],
  },
});

// Create the specialized event
const internationalEvent = InternationalOrderPlaced.create({
  orderId: "order-789",
  customerId: "cust-101",
  total: 129.99,
  shippingCountry: "Germany",
  customsValue: 129.99,
  hasCustomsDocuments: true,
});
```

## Custom Event Bus Adapters

You can create custom adapters for integrating with messaging systems:

```javascript
import { createEventBus } from "domaindrivenjs";

// Create a custom adapter for RabbitMQ
const rabbitMQAdapter = {
  async publish(event) {
    await rabbitConnection.sendToQueue(
      "domain-events",
      Buffer.from(JSON.stringify(event)),
    );
  },

  subscribe(eventType, handler) {
    const consumer = async (msg) => {
      const content = JSON.parse(msg.content.toString());
      if (content.type === eventType) {
        await handler(content);
        channel.ack(msg);
      }
    };

    channel.consume("domain-events", consumer);

    // Return unsubscribe function
    return () => channel.cancel(consumer);
  },
};

// Create event bus with custom adapter
const messagingEventBus = createEventBus({
  adapter: rabbitMQAdapter,
});

// Use the messaging-enabled event bus
messagingEventBus.on(OrderPlaced, (event) => {
  console.log("Received from RabbitMQ:", event);
});

// Or replace the default adapter
eventBus.setAdapter(rabbitMQAdapter);
```

## Pending Events Pattern

For transactional scenarios, you can queue events and publish them atomically:

```javascript
// Add events to the pending queue
eventBus.addPendingEvent(orderPlacedEvent);
eventBus.addPendingEvent(inventoryUpdatedEvent);

try {
  // Perform transactional operations
  await db.transaction(async () => {
    await orderRepository.save(order);
    await inventoryRepository.save(inventory);
  });

  // If transaction succeeds, publish all pending events
  await eventBus.publishPendingEvents();
} catch (error) {
  // If transaction fails, clear pending events
  eventBus.clearPendingEvents();
  throw error;
}
```

## Domain Events vs Integration Events

It's important to distinguish between domain events and integration events:

- **Domain Events**: Used within a bounded context, directly related to domain state changes
- **Integration Events**: Used for communication between bounded contexts

You can transform domain events into integration events:

```javascript
// Subscribe to domain events and publish integration events
eventBus.on(OrderPlaced, async (domainEvent) => {
  // Transform to integration event
  const integrationEvent = {
    type: "order.placed",
    payload: {
      order_id: domainEvent.orderId,
      customer_id: domainEvent.customerId,
      total_amount: domainEvent.total,
      currency: "USD",
      timestamp: domainEvent.timestamp.toISOString(),
    },
    version: "1.0",
  };

  // Publish to external system
  await messageQueue.publish("orders", integrationEvent);
});
```

## Events and Entities

In DDD, domain events are typically emitted by Aggregates, not individual Entities. This is because:

1. **Aggregates are consistency boundaries**: They ensure all invariants are satisfied before emitting events.
2. **Aggregates coordinate entities**: They have the complete picture of state changes.
3. **Events often represent cross-entity changes**: Many meaningful domain events involve multiple entities.

If an Entity within an Aggregate needs to trigger an event, it should communicate this to its Aggregate root, which then emits the event. This maintains the proper encapsulation and ensures events are only published when the entire Aggregate is in a consistent state.

In some cases, you might have standalone Entities that aren't part of any Aggregate. In such situations, it can be appropriate to treat these Entities as single-entity Aggregates that can emit their own events.

## Event Sourcing

For more advanced scenarios, domaindrivenjs can be used for event sourcing, where the state of an aggregate is reconstructed from its history of events:

```javascript
// Define events
const OrderCreated = domainEvent({ name: 'OrderCreated', schema: /*...*/ });
const ItemAdded = domainEvent({ name: 'ItemAdded', schema: /*...*/ });
const OrderPlaced = domainEvent({ name: 'OrderPlaced', schema: /*...*/ });

// Apply events to reconstruct aggregate state
function applyEvents(events) {
  let state = {};

  for (const event of events) {
    switch (event.type) {
      case 'OrderCreated':
        state = {
          id: event.orderId,
          customerId: event.customerId,
          items: [],
          status: 'DRAFT'
        };
        break;

      case 'ItemAdded':
        state.items.push({
          productId: event.productId,
          name: event.productName,
          quantity: event.quantity,
          unitPrice: event.unitPrice
        });
        break;

      case 'OrderPlaced':
        state.status = 'PLACED';
        state.placedAt = event.timestamp;
        state.total = event.total;
        break;
    }
  }

  return Order.create(state);
}

// Retrieve events from event store
const events = await eventStore.getEvents('order-123');

// Reconstruct aggregate
const order = applyEvents(events);
```

## Best Practices

1. **Name events in past tense**: Events represent something that has already happened.

2. **Include all relevant data**: Events should be self-contained with all information needed by handlers.

3. **Design for evolution**: Consider versioning and backward compatibility for events.

4. **Keep events focused**: Each event should represent a single, meaningful occurrence.

5. **Separate domain from integration events**: Distinguish between internal domain events and those exposed to other systems.

6. **Be selective about publishing**: Not every state change needs to be an event; focus on changes that are meaningful in your domain.

7. **Design for idempotence**: Event handlers should be able to process the same event multiple times without side effects.

8. **Consider eventual consistency**: Events introduce asynchronicity; design your system to handle temporary inconsistencies.

9. **Document event schemas**: Make event structures part of your domain documentation.

10. **Test event flows**: Ensure events are properly emitted, published, and handled.

By following these principles, you'll build a robust event-driven architecture that enhances your domain model's expressiveness and flexibility.
