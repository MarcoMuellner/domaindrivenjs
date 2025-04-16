# Tactical Design in DDD

Tactical design focuses on the implementation patterns used to create an effective domain model. While [strategic design](./strategic-design.md) deals with the big picture and boundaries, tactical design provides specific building blocks to express your domain concepts in code.

## What is Tactical Design?

Tactical design in Domain-Driven Design provides patterns for:
- Representing domain concepts in code
- Enforcing business rules and invariants
- Managing relationships between domain objects
- Preserving the integrity of the domain model

These patterns help you create a model that's both rich in domain knowledge and practically implementable.

## Building Blocks of Tactical Design

DDD tactical design uses several core building blocks to model domains:

![DDD Building Blocks](../../.vuepress/public/images/ddd-building-blocks.png)

### Value Objects

Value objects are immutable objects defined by their attributes rather than an identity. They represent concepts like:
- Money (amount and currency)
- Address (street, city, zip code)
- Date range (start date and end date)

**Key characteristics**:
- No identity (two value objects with the same attributes are considered equal)
- Immutable (cannot be changed after creation)
- Self-validating (ensures attributes form a valid whole)
- Can have behavior (methods that express domain operations)

Learn more about [Value Objects](../core/value-objects.md).

### Entities

Entities are objects primarily defined by their identity rather than their attributes. They represent concepts like:
- User (with a unique user ID)
- Order (with a unique order number)
- Product (with a unique product code)

**Key characteristics**:
- Has a unique identity that remains constant throughout its lifecycle
- Attributes can change over time
- Equality is based on identity, not attributes
- Often has a lifecycle (created, modified, possibly deleted)

Learn more about [Entities](../core/entities.md).

### Aggregates

Aggregates are clusters of domain objects (entities and value objects) treated as a single unit. Each aggregate has:
- A root entity (the aggregate root) that provides the sole access point to the objects inside
- A boundary that defines what's inside vs. outside
- Invariants (business rules) that must be maintained whenever the aggregate changes

**Key characteristics**:
- Enforces consistency rules across multiple objects
- Provides a transactional boundary
- Can only reference other aggregates by their identity (not direct object references)
- Is the unit of persistence and retrieval from data stores

Learn more about [Aggregates](../core/aggregates.md).

### Domain Events

Domain events represent significant occurrences within a domain that domain experts care about. Examples include:
- OrderPlaced
- PaymentReceived
- ShipmentDelivered

**Key characteristics**:
- Named in the past tense (representing something that has happened)
- Immutable (cannot be changed after creation)
- Contains all relevant information about what happened
- Can trigger reactions from other parts of the system

Learn more about [Domain Events](../core/domain-events.md).

### Repositories

Repositories provide a collection-like interface for accessing domain objects. They:
- Abstract away the persistence mechanism (database, file system, etc.)
- Return fully reconstituted domain objects
- Support filtering and querying
- Often work at the aggregate level (one repository per aggregate type)

**Key characteristics**:
- Provides methods to find, save, and remove objects
- Returns domain objects, not data transfer objects
- Hides query implementation details
- Helps maintain the integrity of the domain model

Learn more about [Repositories](../core/repositories.md).

### Factories

Factories handle the complex creation of domain objects, especially when:
- Creation involves decisions based on parameters
- Multiple objects need to be created and connected
- Creation logic shouldn't be part of the domain object itself

**Key characteristics**:
- Encapsulates object creation logic
- Ensures objects are created in a valid state
- Can create complex object graphs
- Shields clients from creation details

Factories in Domainify are typically implemented as factory functions built into the domain objects themselves.

### Domain Services

Domain services represent operations that don't naturally belong to any single entity or value object. They:
- Coordinate actions across multiple domain objects
- Implement business processes that span multiple objects
- Express significant domain concepts that aren't naturally modeled as objects

**Key characteristics**:
- Stateless operations on domain objects
- Named after domain activities or processes
- Express important domain concepts
- Encapsulate complex business rules that involve multiple objects

Learn more about [Domain Services](../core/domain-services.md).

### Specifications

Specifications encapsulate criteria that an object can satisfy. They are used for:
- Selection (finding objects that match criteria)
- Validation (ensuring objects meet certain rules)
- Creation of new objects that automatically satisfy the criteria

**Key characteristics**:
- Express a single business rule or constraint
- Can be combined using logical operators (and, or, not)
- Support both in-memory and database querying
- Capture business rules in a reusable form

Learn more about [Specifications](../core/specifications.md).

## Implementing Tactical Patterns

### How Patterns Work Together

The building blocks of DDD don't exist in isolation. They form a cohesive system:

1. **Factories** create **Entities**, **Value Objects**, and **Aggregates**
2. **Repositories** store and retrieve **Aggregates**
3. **Aggregates** emit **Domain Events** when they change
4. **Domain Services** coordinate operations across multiple **Aggregates**
5. **Specifications** select **Entities** and validate business rules

### Choosing the Right Pattern

Deciding which pattern to use can be challenging. Here's a simple guide:

- If the concept has a unique identity and changes over time ’ **Entity**
- If the concept is defined by its attributes and is immutable ’ **Value Object**
- If you need to maintain invariants across several objects ’ **Aggregate**
- If you need to represent something significant that happened ’ **Domain Event**
- If an operation involves multiple objects and doesn't fit in one ’ **Domain Service**
- If you need criteria for selecting or validating objects ’ **Specification**
- If you need data storage/retrieval abstraction ’ **Repository**
- If object creation is complex ’ **Factory**

## Implementation with Domainify

Domainify provides a modern, composition-based approach to implementing DDD patterns in JavaScript:

```javascript
import { z } from 'zod';
import { 
  valueObject, 
  entity, 
  aggregate, 
  domainEvent,
  repository,
  domainService,
  specification
} from 'domainify';

// Value Object
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

// Entity
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

// Aggregate
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
    { name: 'Order must have items when placed',
      check: order => order.status !== 'PLACED' || order.items.length > 0 }
  ],
  methods: {
    placeOrder() {
      return Order.update(this, { status: 'PLACED' })
        .emitEvent(OrderPlaced.create({ orderId: this.id }));
    }
  }
});

// Domain Event
const OrderPlaced = domainEvent({
  name: 'OrderPlaced',
  schema: z.object({
    orderId: z.string().uuid(),
    placedAt: z.date().default(() => new Date())
  })
});

// Repository
const OrderRepository = repository({
  name: 'OrderRepository',
  entity: Order,
  methods: {
    async findByCustomerId(customerId) {
      return this.findMany({ customerId });
    }
  }
});

// Domain Service
const OrderProcessingService = domainService({
  name: 'OrderProcessingService',
  methods: {
    async processOrder(order, productRepository) {
      // Check if all items are in stock
      for (const item of order.items) {
        const product = await productRepository.findById(item.productId);
        if (!product || product.stockLevel < item.quantity) {
          throw new Error(`Product ${item.productId} not available in requested quantity`);
        }
      }
      
      // Place the order
      const placedOrder = order.placeOrder();
      
      // Update stock levels
      const updatedProducts = [];
      for (const item of order.items) {
        const product = await productRepository.findById(item.productId);
        updatedProducts.push(
          product.decreaseStock(item.quantity)
        );
      }
      
      return {
        order: placedOrder,
        updatedProducts
      };
    }
  }
});

// Specification
const InStock = specification({
  name: 'InStock',
  isSatisfiedBy: (product) => product.stockLevel > 0,
  toQuery: () => ({ stockLevel: { $gt: 0 } })
});
```

## Challenges in Tactical Design

### Keeping the Model Pure

The domain model should focus on business concepts, not technical concerns. Common challenges include:

- **Technical contamination**: Letting database or UI concerns influence the model
- **Anemic domain model**: Objects with data but no behavior
- **Bloated models**: Trying to put too much in a single object

### Managing Object Relationships

Object relationships can be complex:

- **Bi-directional relationships**: Hard to keep consistent
- **Deep object graphs**: Can cause performance and consistency issues
- **Circular references**: Can create problems with serialization and memory usage

### Handling Complex Business Rules

Some business rules span multiple objects or involve complex conditions:

- **Cross-entity validation**: Rules that involve multiple entities
- **Process-level rules**: Rules that apply to multi-step processes
- **Temporal rules**: Rules that depend on time or sequence

## Best Practices

1. **Focus on behavior over data**: Domain objects should encapsulate both data and behavior
2. **Make implicit concepts explicit**: Convert business rules into explicit code constructs
3. **Use value objects liberally**: They improve clarity and prevent duplication
4. **Keep aggregates small**: Large aggregates lead to performance and concurrency issues
5. **Design for immutability**: Immutable objects are easier to reason about and maintain
6. **Name things in the ubiquitous language**: Use terminology from the domain
7. **Test against business rules**: Verify that your model enforces all business constraints

## Next Steps

Now that you understand the tactical patterns of DDD, you can:

1. Dive deeper into each building block:
   - [Value Objects](../core/value-objects.md)
   - [Entities](../core/entities.md)
   - [Aggregates](../core/aggregates.md)
   - [Domain Events](../core/domain-events.md)
   - [Repositories](../core/repositories.md)
   - [Specifications](../core/specifications.md)
   - [Domain Services](../core/domain-services.md)

2. Explore how these patterns work together in our [example applications](../../examples/).