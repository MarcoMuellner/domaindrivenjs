# Working with Repositories in domainify

Repositories are a fundamental building block in Domain-Driven Design (DDD). This guide explains how to create and use repositories effectively in your domain model with domainify.

## What are Repositories?

In Domain-Driven Design, repositories mediate between the domain and data mapping layers, acting like collections of domain objects in memory. They:

1. **Provide Collection-Like Interface** - Methods like `findById()`, `findAll()`, and `save()`
2. **Abstract Persistence** - Hide the details of how aggregates are stored
3. **Encapsulate Query Logic** - Separate query construction from domain objects
4. **Focus on Aggregates** - Work with aggregate roots, not individual entities
5. **Support Domain Events** - Publish events when aggregates are saved

The repository pattern ensures that your domain model remains focused on business logic, not persistence concerns.

## Creating Repositories

The core of domainify's repository implementation is the `repository` factory function:

```javascript
import { z } from "zod";
import { aggregate, repository, createInMemoryAdapter } from "domainify";

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
  }),
  identity: "id",
  // ... methods and invariants
});

// Create a repository for the Order aggregate
const OrderRepository = repository({
  aggregate: Order,
  adapter: createInMemoryAdapter({
    identity: "id",
    initialData: [], // Optional initial data
  }),
  events: {
    publishOnSave: true, // Auto-publish events when saving
    clearAfterPublish: true, // Clear events after publishing
  },
});
```

## Repository Adapters

Domainify provides adapters for different storage technologies to keep your domain model independent of persistence details.

### In-Memory Adapter

The in-memory adapter is useful for testing or simple applications:

```javascript
import { createInMemoryAdapter } from "domainify";

const inMemoryAdapter = createInMemoryAdapter({
  identity: "id",
  initialData: [
    { id: "order-123", customerId: "cust-456", items: [], status: "DRAFT" },
  ],
});
```

### Prisma Adapter

The Prisma adapter connects to databases using Prisma ORM:

```javascript
import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "domainify";

const prisma = new PrismaClient();

const prismaAdapter = createPrismaAdapter({
  prisma,
  model: "order", // Prisma model name
  identity: "id",
  // Optional custom serialization
  serialize: (aggregate) => {
    // Convert domain object to database model
    return {
      id: aggregate.id,
      customerId: aggregate.customerId,
      items: JSON.stringify(aggregate.items),
      status: aggregate.status,
    };
  },
  // Optional custom deserialization
  deserialize: (data) => {
    // Convert database model to domain object
    return Order.create({
      id: data.id,
      customerId: data.customerId,
      items: JSON.parse(data.items),
      status: data.status,
    });
  },
});
```

## Repository Methods

Domainify repositories provide a comprehensive set of methods for working with aggregates:

### Core Methods

- **findById(id)** - Find an aggregate by its ID
- **findByIds(ids)** - Find multiple aggregates by their IDs
- **findAll(filter)** - Find all aggregates matching optional filter
- **findOne(filter)** - Find the first aggregate matching filter
- **findBySpecification(spec)** - Find aggregates using a specification
- **save(aggregate)** - Save an aggregate (create or update)
- **saveAll(aggregates)** - Save multiple aggregates in a batch
- **delete(id)** - Delete an aggregate by its ID

### Utility Methods

- **exists(id)** - Check if an aggregate with the given ID exists
- **count(filter)** - Count aggregates matching optional filter

## Using Repositories

Repositories provide a collection-like interface for working with aggregates:

### Finding Aggregates

```javascript
// Find by ID
const order = await OrderRepository.findById("order-123");
if (order) {
  console.log(`Found order: ${order.id}`);
} else {
  console.log("Order not found");
}

// Find by multiple IDs
const ordersMap = await OrderRepository.findByIds(["order-123", "order-456"]);
const order123 = ordersMap.get("order-123");

// Find all matching a filter
const draftOrders = await OrderRepository.findAll({ status: "DRAFT" });
console.log(`Found ${draftOrders.length} draft orders`);

// Find one matching a filter
const customerOrder = await OrderRepository.findOne({
  customerId: "cust-789",
  status: "PLACED",
});

// Check if an aggregate exists
if (await OrderRepository.exists("order-123")) {
  console.log("Order exists");
}

// Count aggregates
const placedOrderCount = await OrderRepository.count({ status: "PLACED" });
console.log(`There are ${placedOrderCount} placed orders`);
```

### Using Specifications

Specifications provide a powerful way to express complex queries:

```javascript
// Define a specification
const HighValueOrderSpecification = {
  isSatisfiedBy: (order) => {
    return order.total > 1000;
  },
  // Optional optimization for database queries
  toQuery: () => ({
    total: { $gt: 1000 },
  }),
};

// Use the specification
const highValueOrders = await OrderRepository.findBySpecification(
  HighValueOrderSpecification,
);

// You can also use a simple predicate function
const priorityOrders = await OrderRepository.findBySpecification(
  (order) => order.isExpedited && order.status === "PLACED",
);
```

### Saving Aggregates

```javascript
// Create a new order
const newOrder = Order.create({
  id: "order-456",
  customerId: "cust-789",
  items: [],
  status: "DRAFT",
});

// Add items to the order
const updatedOrder = newOrder.addItem(product, 2);

// Place the order, which attaches OrderPlaced domain event
const placedOrder = updatedOrder.placeOrder();

// Save the order and publish domain events
await OrderRepository.save(placedOrder);

// Save multiple orders in a batch
await OrderRepository.saveAll([order1, order2, order3]);
```

### Deleting Aggregates

```javascript
// Delete an order
await OrderRepository.delete("order-123");
```

## Domain Events Integration

Repositories can automatically publish domain events when aggregates are saved:

```javascript
// Define an order placed event handler
eventBus.on("OrderPlaced", async (event) => {
  console.log(`Order ${event.orderId} was placed with total ${event.total}`);
  await emailService.sendOrderConfirmation(event.customerId, event.orderId);
});

// When an order is placed and saved, the event is published
const order = await OrderRepository.findById("order-123");
const placedOrder = order.placeOrder(); // Attaches OrderPlaced event
await OrderRepository.save(placedOrder); // Automatically publishes the event
```

## Creating Custom Repository Implementations

You can create custom repository methods for specific domain queries:

```javascript
// Extend the repository with custom methods
const OrderRepository = {
  ...repository({
    aggregate: Order,
    adapter: prismaAdapter,
    events: { publishOnSave: true },
  }),

  // Custom methods
  async findByCustomer(customerId) {
    return this.findAll({ customerId });
  },

  async findPendingOrders() {
    return this.findAll({
      status: { in: ["PLACED", "PAID"] },
    });
  },

  async markAsShipped(orderId) {
    const order = await this.findById(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const shippedOrder = order.ship();
    await this.save(shippedOrder);
    return shippedOrder;
  },
};
```

## Creating Custom Adapters

You can create custom adapters for other storage technologies by implementing the required interface:

```javascript
function createCustomAdapter(options) {
  // Required methods
  return {
    async findById(id) {
      // Implementation
    },

    async findAll(filter) {
      // Implementation
    },

    async save(aggregate) {
      // Implementation
    },

    async delete(id) {
      // Implementation
    },

    // Optional methods for optimization
    async findByIds(ids) {
      // Implementation
    },

    async saveAll(aggregates) {
      // Implementation
    },

    async count(filter) {
      // Implementation
    },

    async findBySpecification(specification) {
      // Implementation
    },
  };
}
```

## Testing with Repositories

The in-memory adapter is particularly useful for testing:

```javascript
// Set up test repository
const testRepository = repository({
  aggregate: Order,
  adapter: createInMemoryAdapter({
    identity: "id",
    initialData: [
      {
        id: "order-test-1",
        customerId: "cust-test",
        items: [],
        status: "DRAFT",
      },
    ],
  }),
});

// Test finding an order
const order = await testRepository.findById("order-test-1");
expect(order).not.toBeNull();
expect(order.id).toBe("order-test-1");

// Test updating an order
const placedOrder = order.placeOrder();
await testRepository.save(placedOrder);

// Verify the update
const updated = await testRepository.findById("order-test-1");
expect(updated.status).toBe("PLACED");

// Test additional methods
const exists = await testRepository.exists("order-test-1");
expect(exists).toBe(true);

const count = await testRepository.count({ status: "PLACED" });
expect(count).toBe(1);
```

## Best Practices

1. **One Repository Per Aggregate** - Each aggregate type should have its own repository
2. **Use Repositories for Persistence Only** - Don't put domain logic in repositories
3. **Keep Query Logic Separate** - Use specifications for complex queries
4. **Consider Transaction Boundaries** - Repositories should align with aggregate boundaries
5. **Handle Not Found Gracefully** - Return null rather than throwing exceptions for missing aggregates
6. **Use Domain Events** - Let repositories handle event publishing
7. **Abstract Storage Details** - Use adapters to isolate the persistence mechanism
8. **Test with In-Memory Repositories** - Makes tests faster and more focused
9. **Use Batch Operations** - Use `saveAll` and `findByIds` for better performance
10. **Consider Aggregate Size** - Larger aggregates may need pagination or streaming

By following these principles, you'll build a clean domain model where persistence concerns are properly separated from domain logic, making your application more maintainable and testable.
