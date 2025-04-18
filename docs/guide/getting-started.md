# Getting Started with DomainDrivenJS

Domain-Driven Design (DDD) is a powerful approach to software development, but it can be challenging to implement effectively. DomainDrivenJS makes DDD more accessible by providing a composition-based toolkit that aligns with JavaScript's strengths.

![challenges](/images/gs_challenges.png)

## What is Domain-Driven Design?

Domain-Driven Design is an approach to software development that:

1. **Centers on the business domain** - Focusing on real-world business concepts rather than technical constructs
2. **Creates a shared language** - Building a common vocabulary (ubiquitous language) between developers and domain experts
3. **Emphasizes a model-driven approach** - Using models to solve complex problems within bounded contexts
4. **Separates strategic and tactical patterns** - Providing both high-level design tools and detailed implementation patterns

### Strategic DDD

Strategic DDD focuses on the big picture:
- **Bounded Contexts** - Defining clear boundaries where models apply
- **Context Maps** - Understanding relationships between different bounded contexts
- **Core Domain** - Identifying the most valuable part of your business
- **Ubiquitous Language** - Developing a shared vocabulary with domain experts

### Tactical DDD

Tactical DDD provides implementation patterns:
- **Value Objects** - Immutable objects defined by their attributes
- **Entities** - Objects with identity that can change over time
- **Aggregates** - Clusters of objects treated as a single unit
- **Domain Events** - Representing significant occurrences in the domain
- **Repositories** - Providing collection-like interfaces for aggregates
- **Services** - Encapsulating domain operations that don't belong to entities

## When to Use DDD

![Decision Flow Chart](/images/gs_decision_flow.png)

Domain-Driven Design is most valuable when:

- **You're dealing with complex domains** - When the business rules and processes are intricate
- **Business logic is central to your application** - When your application's value comes from solving domain problems well
- **The application will evolve over time** - When you need a model that can adapt to changing requirements
- **Multiple stakeholders need to collaborate** - When developers and domain experts must work closely together

DDD might be overkill for:
- Simple CRUD applications
- Temporary or throwaway projects
- Domains that are well-understood and unlikely to change
- Projects where technical complexity outweighs domain complexity

## Why DomainDrivenJS?

DomainDrivenJS brings DDD to JavaScript with a modern approach:

1. **Composition over inheritance** - Using functional factory patterns instead of deep class hierarchies
2. **Runtime validation with static types** - Leveraging Zod for both validation and TypeScript integration
3. **Immutability by default** - Ensuring predictable state management
4. **Developer experience first** - Providing clear, helpful errors and minimal boilerplate
5. **Familiar JavaScript patterns** - Working with the language rather than against it

![DomainDrivenJS](/images/gs_comparison.png)

### Comparison with Other Approaches

| Approach | Pros | Cons |
|----------|------|------|
| **Traditional OOP DDD** | Well-documented, established patterns | Can lead to rigid inheritance hierarchies, less natural in JavaScript |
| **Functional Programming** | Immutability, pure functions | Often requires learning new paradigms, less obvious mapping to domain concepts |
| **CQRS/Event Sourcing** | Audit trail, temporal queries | Added complexity, eventual consistency challenges |
| **Anemic Domain Model** | Simplicity, familiar to many developers | Business logic spread across services, harder to enforce invariants |
| **DomainDrivenJS** | Combines best practices, natural in JS, type-safe | New library, evolving patterns |

## Installation

::: code-tabs
@tab npm
```bash
npm install domaindrivenjs
```
@tab yarn
```bash
yarn add domaindrivenjs
```
@tab pnpm
```bash
pnpm add domaindrivenjs
```
:::

## Basic Concepts

Here's a quick overview of the core building blocks in DomainDrivenJS:

```javascript
import { z } from 'zod';
import { valueObject, entity, aggregate } from 'domaindrivenjs';

// 1. Value Objects - immutable objects defined by their attributes
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

// 2. Entities - objects with identity that can change over time
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

// 3. Aggregates - clusters of objects treated as a single unit
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
      // Implementation...
      return Order.update(this, { /* updates */ });
    },
    placeOrder() {
      return Order.update(this, {
        status: 'PLACED'
      }).emitEvent('OrderPlaced', {
        orderId: this.id,
        customerId: this.customerId,
        timestamp: new Date()
      });
    }
  }
});
```

## Next Steps

Now that you understand what DDD and DomainDrivenJS are about:

1. Check out the [Quick Start guide](/guide/quick-start.html) to build your first domain model
2. Learn more about [DDD fundamentals](/guide/ddd/) to understand the key concepts
3. Explore [example applications](/examples/) to see DomainDrivenJS in action

Or dive straight into core concepts:
- [Value Objects](/guide/core/value-objects.html)
- [Entities](/guide/core/entities.html)
- [Aggregates](/guide/core/aggregates.html)
- [Domain Events](/guide/core/domain-events.html)
