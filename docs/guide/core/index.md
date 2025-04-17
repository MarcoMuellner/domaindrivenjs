# Core Domain-Driven Design Concepts

Domain-Driven Design provides a set of powerful building blocks to express your domain model in code. Domainify makes these concepts easy to implement with a modern, functional approach tailored to JavaScript.

<!-- DIAGRAM: A layered or connected diagram showing how the different DDD building blocks relate to each other, with value objects and entities at the foundation, aggregates grouping them, and repositories, services, and events connecting to them -->

## Quick Reference

| Concept | Purpose | Example |
|---------|---------|---------|
| [Value Objects](#value-objects) | Immutable objects defined by attributes | Money, Email, Address |
| [Entities](#entities) | Objects with identity that can change | User, Order, Product |
| [Aggregates](#aggregates) | Clusters of objects treated as a unit | Order with OrderItems |
| [Domain Events](#domain-events) | Record of something significant happening | OrderPlaced, PaymentReceived |
| [Repositories](#repositories) | Provide access to aggregates | OrderRepository, ProductRepository |
| [Specifications](#specifications) | Encapsulate business rules and queries | ActiveUsers, OverdueOrders |
| [Domain Services](#domain-services) | Operations across multiple objects | PaymentProcessor, InventoryAllocator |

## Value Objects

Value objects are immutable objects defined by their attributes rather than their identity. Two value objects with the same attributes are considered equal, regardless of whether they are the same instance.

[Learn more about Value Objects](./value-objects.md)

```javascript
// Example: Money value object
const price = Money.create({ amount: 29.99, currency: 'USD' });
const tax = Money.create({ amount: 2.40, currency: 'USD' });
const total = price.add(tax); // New Money object with amount = 32.39
```

## Entities

Entities are objects with identity that persists across changes. Unlike value objects, entities are equal only if they have the same identity, even if their attributes differ.

[Learn more about Entities](./entities.md)

```javascript
// Example: User entity
const user = User.create({
  id: 'user-123',
  name: 'John Doe',
  email: 'john@example.com'
});

// Update returns a new instance with same identity
const updatedUser = user.changeName('John Smith');
```

## Aggregates

Aggregates are clusters of entities and value objects treated as a single unit for data changes. Each aggregate has a root entity that controls access to all members within the boundary.

[Learn more about Aggregates](./aggregates.md)

```javascript
// Example: Order aggregate with line items
const order = Order.create({
  id: 'order-456',
  customerId: 'customer-789',
  items: [],
  status: 'DRAFT'
});

// Add item to the order
const updatedOrder = order.addItem(product, 2); 
```

## Domain Events

Domain events represent significant occurrences within your domain that other parts of the system might be interested in. They record what happened, enabling loosely coupled communication between components.

[Learn more about Domain Events](./domain-events.md)

```javascript
// Example: Emitting an event when order is placed
const placedOrder = order.placeOrder().emitEvent(OrderPlaced, {
  orderId: order.id,
  customerId: order.customerId,
  orderTotal: order.getTotal(),
  placedAt: new Date()
});

// Handling the event
eventBus.on(OrderPlaced, async (event) => {
  await notificationService.sendOrderConfirmation(event.customerId);
});
```

## Repositories

Repositories provide a collection-like interface for accessing and persisting aggregates. They hide the details of data access, allowing your domain model to remain focused on business logic.

[Learn more about Repositories](./repositories.md)

```javascript
// Example: Saving and retrieving orders
await orderRepository.save(order);
const retrievedOrder = await orderRepository.findById('order-456');
const draftOrders = await orderRepository.findAll({ status: 'DRAFT' });
```

## Specifications

Specifications encapsulate business rules and query logic into reusable, composable objects. They can be used for both validation and selection of domain objects.

[Learn more about Specifications](./specifications.md)

```javascript
// Example: Finding active premium customers
const ActiveCustomer = specification({
  name: 'ActiveCustomer',
  isSatisfiedBy: customer => customer.status === 'ACTIVE'
});

const PremiumPlan = specification({
  name: 'PremiumPlan',
  isSatisfiedBy: customer => customer.plan === 'PREMIUM'
});

// Composing specifications
const ActivePremiumCustomer = ActiveCustomer.and(PremiumPlan);
const premiumCustomers = await customerRepository.findAll(ActivePremiumCustomer);
```

## Domain Services

Domain services encapsulate operations that don't conceptually belong to any entity or value object. They're used for operations that involve multiple domain objects or more complex business logic.

[Learn more about Domain Services](./domain-services.md)

```javascript
// Example: Payment processing service
const paymentResult = await paymentService.processPayment({
  orderId: order.id,
  amount: order.getTotal(),
  paymentMethod: customer.preferredPaymentMethod
});
```

## How Everything Fits Together

In a typical domain model:

1. **Value objects** and **entities** form the building blocks of your model
2. **Aggregates** group related entities and value objects into consistency boundaries
3. **Repositories** store and retrieve aggregates
4. **Specifications** help find the right aggregates
5. **Domain events** communicate changes between aggregates
6. **Domain services** coordinate operations across multiple aggregates

By using these patterns together, you can build a rich, expressive domain model that captures the complexity of your business domain while keeping your code maintainable and flexible.

## Next Steps

Ready to dive deeper? Choose a concept to explore from the list above, or check out our [Quick Start Guide](/guide/quick-start.md) to see these concepts in action.
