# domainify: A Composition-Based Domain-Driven Design Library

## Design Document

### Version 0.1.0
### Date: April 12, 2025

---

## 1. Vision

domainify is a javascript library that empowers developers to implement Domain-Driven Design principles using a modern, composition-based approach. Rather than relying on inheritance hierarchies and javascript interfaces, domainify leverages Zod for schema validation and type inference, providing both runtime validation and compile-time type safety.

### Core Principles

1. **Composition over Inheritance** - Prefer functional composition to class hierarchies
2. **Runtime Validation with Static Types** - Leverage Zod for both validation and javascript types
3. **Immutability by Default** - Encourage immutable domain objects for safer state management
4. **Minimal Boilerplate** - Provide intuitive, concise APIs that reduce ceremony
5. **Framework Agnostic** - Work with any javascript project or framework
6. **Extensible Architecture** - Allow for easy customization and extension
7. **Developer Experience First** - Prioritize clear error messages, debugging, and documentation

---

## 2. Architecture Overview

domainify is built as a modular collection of core domain building blocks with a clean separation of concerns. Each module focuses on a specific DDD concept while maintaining a consistent API pattern.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        domainify Core                     │
├─────────┬─────────┬─────────┬─────────┬─────────┬──────────┤
│  Value  │ Entity  │Aggregate│ Domain  │ Specifi-│  Bounded │
│ Objects │         │         │ Events  │ cations │ Contexts │
└─────────┴─────────┴─────────┴─────────┴─────────┴──────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                      │
├─────────┬─────────┬─────────┬─────────┬─────────┬──────────┤
│   Use   │ Command │  Query  │ Process │ Policies│  Sagas   │
│  Cases  │ Handlers│ Handlers│ Managers│         │          │
└─────────┴─────────┴─────────┴─────────┴─────────┴──────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                     │
├─────────┬─────────┬─────────┬─────────┬─────────┬──────────┤
│Repository│  Event  │   Unit  │  Query  │  Cache  │Persistence│
│ Adapters │   Bus   │ of Work │ Builders│ Adapters│  Adapters │
└─────────┴─────────┴─────────┴─────────┴─────────┴──────────┘
```

### Package Structure

The library will be organized as a monorepo with a core package and separate adapter packages:

- `@domainify/core`: Core DDD building blocks
- `@domainify/mongodb`: MongoDB repository adapter
- `@domainify/prisma`: Prisma repository adapter
- `@domainify/redis`: Redis repository adapter
- `@domainify/eventstore`: Event sourcing implementation
- `@domainify/testing`: Testing utilities

---

## 3. Core Components

### 3.1 Value Objects

Value objects are immutable objects defined by their attributes rather than identity.

```javascript
import { z } from 'zod';
import { valueObject } from '@domainify/core';

const MoneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().length(3)
});

export const Money = valueObject({
  name: 'Money',
  schema: MoneySchema,
  methods: {
    add(other) {
      if (this.currency !== other.currency) {
        throw new Error('Cannot add money with different currencies');
      }
      return Money.create({ 
        amount: this.amount + other.amount, 
        currency: this.currency 
      });
    },
    multiply(factor) {
      return Money.create({ 
        amount: this.amount * factor, 
        currency: this.currency 
      });
    },
    equals(other) {
      return this.amount === other.amount && 
             this.currency === other.currency;
    }
  }
});

// Usage
const price = Money.create({ amount: 10.99, currency: 'USD' });
const tax = Money.create({ amount: 0.55, currency: 'USD' });
const total = price.add(tax); // Returns a new Money instance
```

**Implementation Details:**
- Factory function generates an immutable object with the provided methods
- Validation runs on creation
- javascript types are inferred from the Zod schema
- Error messages for validation failures include context

### 3.2 Entities

Entities are objects with identity that persists across state changes.

```javascript
import { z } from 'zod';
import { entity } from '@domainify/core';

const CustomerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  address: AddressSchema
});

export const Customer = entity({
  name: 'Customer',
  schema: CustomerSchema,
  identity: 'id',
  methods: {
    updateEmail(email) {
      return Customer.update(this, { email });
    },
    changeName(name) {
      return Customer.update(this, { name });
    },
    moveToAddress(address) {
      return Customer.update(this, { address });
    }
  }
});

// Usage
const customer = Customer.create({
  id: 'cust-123',
  name: 'John Doe',
  email: 'john@example.com',
  address: { street: '123 Main St', city: 'Anytown' }
});

const updatedCustomer = customer.updateEmail('john.doe@example.com');
```

**Implementation Details:**
- Entities maintain identity while allowing attribute changes
- `update` methods create new instances (immutability)
- Identity-based equality checking
- Methods preserve immutability by returning new instances

### 3.3 Aggregates

Aggregates are clusters of objects treated as a single unit with a root entity.

```javascript
import { z } from 'zod';
import { aggregate } from '@domainify/core';

const OrderItemSchema = z.object({
  productId: z.string().uuid(),
  name: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: MoneySchema
});

const OrderSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  items: z.array(OrderItemSchema),
  status: z.enum(['DRAFT', 'PLACED', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED']),
  placedAt: z.date().optional(),
  total: MoneySchema.optional()
});

export const Order = aggregate({
  name: 'Order',
  schema: OrderSchema,
  identity: 'id',
  // Business invariants that must be satisfied
  invariants: [
    {
      name: 'Order must have at least one item when placed',
      check: order => 
        order.status === 'DRAFT' || order.items.length > 0
    },
    {
      name: 'Completed order cannot be modified',
      check: order => 
        !['COMPLETED', 'CANCELLED'].includes(order.status)
    }
  ],
  methods: {
    addItem(product, quantity) {
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
        (sum, item) => sum.add(
          item.unitPrice.multiply(item.quantity)
        ),
        Money.create({ amount: 0, currency: 'USD' })
      );
      
      return Order.update(this, { 
        items: newItems,
        total
      });
    },
    
    placeOrder() {
      // Will validate invariants automatically
      return Order.update(this, {
        status: 'PLACED',
        placedAt: new Date()
      }).emitEvent('OrderPlaced', {
        orderId: this.id,
        customerId: this.customerId,
        items: this.items,
        total: this.total
      });
    },
    
    cancelOrder() {
      if (this.status === 'SHIPPED' || this.status === 'COMPLETED') {
        throw new Error('Cannot cancel shipped or completed orders');
      }
      
      return Order.update(this, {
        status: 'CANCELLED'
      }).emitEvent('OrderCancelled', {
        orderId: this.id,
        reason: 'Customer requested cancellation'
      });
    }
  }
});

// Usage
let order = Order.create({
  id: 'order-123',
  customerId: 'cust-456',
  items: [],
  status: 'DRAFT'
});

order = order.addItem(product, 2);
order = order.placeOrder(); // Validates invariants, emits event
```

**Implementation Details:**
- Aggregates enforce invariants on every state change
- Events can be attached to state changes with `.emitEvent`
- Immutability is preserved through the update mechanism
- Validation errors include context about which invariant failed

### 3.4 Domain Events

Domain events represent meaningful occurrences within the domain.

```javascript
import { z } from 'zod';
import { domainEvent, eventBus } from '@domainify/core';

const OrderPlacedSchema = z.object({
  orderId: z.string().uuid(),
  customerId: z.string().uuid(),
  items: z.array(OrderItemSchema),
  total: MoneySchema,
  timestamp: z.date().default(() => new Date())
});

export const OrderPlaced = domainEvent({
  name: 'OrderPlaced',
  schema: OrderPlacedSchema
});

// Event handler registration
eventBus.on(OrderPlaced, async (event) => {
  console.log(`Order ${event.orderId} was placed with total ${event.total}`);
  // Handle the event...
});

// Publishing events
const order = await orderRepository.findById('order-123');
const placedOrder = order.placeOrder(); // Attaches events
await orderRepository.save(placedOrder); // Publishes events automatically
```

**Implementation Details:**
- Events are defined with schemas like other domain objects
- The event bus provides a pub/sub mechanism
- Repository implementations automatically publish events
- Events can be attached to aggregates for transactional publishing

### 3.5 Specifications

Specifications encapsulate business rules that can be combined and reused.

```javascript
import { specification } from '@domainify/core';

const PremiumProduct = specification({
  name: 'PremiumProduct',
  test: product => product.price.amount >= 100,
  // Optional - for repository query optimization
  toQuery: () => ({ 'price.amount': { $gte: 100 } })
});

const InStockProduct = specification({
  name: 'InStockProduct',
  test: product => product.stockLevel > 0,
  toQuery: () => ({ stockLevel: { $gt: 0 } })
});

// Composable specifications
const PremiumInStockProduct = PremiumProduct.and(InStockProduct);

// Usage with objects
const isPremiumInStock = PremiumInStockProduct.isSatisfiedBy(product);

// Usage with repositories
const premiumInStockProducts = await productRepository.findAll(
  PremiumInStockProduct
);
```

**Implementation Details:**
- Specifications are predicates that can be composed
- Repository adapters can use the `toQuery` method for optimization
- Common logical operators: `and`, `or`, `not`
- Can be used for filtering, validation, and selection

### 3.6 Repositories

Repositories provide a collection-like interface for accessing and persisting aggregates.

```javascript
import { repository } from '@domainify/core';
import { createMongoAdapter } from '@domainify/mongodb';

const OrderRepository = repository({
  aggregate: Order,
  adapter: createMongoAdapter({
    collectionName: 'orders',
    url: process.env.MONGO_URL,
    // Optional custom serialization/deserialization
    serialize: (order) => ({
      // Map domain object to DB representation
      _id: order.id,
      // ... other mappings
    }),
    deserialize: (doc) => ({
      // Map DB document to domain object
      id: doc._id,
      // ... other mappings
    })
  })
});

// Usage
const order = await OrderRepository.findById('order-123');
const orders = await OrderRepository.findAll({ customerId: 'cust-456' });
const premiumOrders = await OrderRepository.findAll(
  specification((order) => order.total.amount > 1000)
);

// Save with automatic event publishing
const updatedOrder = order.addItem(product, 1);
await OrderRepository.save(updatedOrder);
```

**Implementation Details:**
- Repository factory takes an aggregate type and adapter
- Adapters handle the persistence details
- Specifications can be used for filtering
- Automatic event publishing on save
- All operations maintain aggregate invariants

### 3.7 Bounded Contexts

Bounded contexts establish explicit boundaries between different domain models.

```javascript
import { boundedContext } from '@domainify/core';

const SalesContext = boundedContext({
  name: 'Sales',
  description: 'Handles customer orders and product catalog',
  // Register domain objects in this context
  valueObjects: [Money, Address, ProductId],
  entities: [Customer, Product],
  aggregates: [Order],
  // Optional context mapping
  mapping: {
    toShipping: {
      Order: (order) => ({
        orderId: order.id,
        deliveryAddress: order.shippingAddress,
        items: order.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      })
    }
  }
});

// Usage
// Get translated representation for the Shipping context
const shippingOrder = SalesContext.mapping.toShipping.Order(order);
```

**Implementation Details:**
- Contexts can register domain objects for documentation
- Context mappings translate between contexts
- Helps maintain model boundaries
- Documentation generation for the ubiquitous language

---

## 4. Application Layer Components

### 4.1 Use Cases

Use cases encapsulate application-specific operations and orchestration.

```javascript
import { z } from 'zod';
import { useCase } from '@domainify/core';

const PlaceOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive()
  }))
});

export const PlaceOrderUseCase = useCase({
  name: 'PlaceOrder',
  input: PlaceOrderSchema,
  // Injected dependencies
  dependencies: {
    orderRepository: OrderRepository,
    productRepository: ProductRepository,
    customerRepository: CustomerRepository
  },
  // Implementation
  execute: async (input, deps) => {
    const { customerId, items } = input;
    const { orderRepository, productRepository, customerRepository } = deps;
    
    // Validate customer exists
    const customer = await customerRepository.findById(customerId);
    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }
    
    // Create order
    let order = Order.create({
      id: generateId(),
      customerId,
      items: [],
      status: 'DRAFT'
    });
    
    // Add items to order
    for (const item of items) {
      const product = await productRepository.findById(item.productId);
      if (!product) {
        return { 
          success: false, 
          error: `Product ${item.productId} not found` 
        };
      }
      
      order = order.addItem(product, item.quantity);
    }
    
    // Place order
    order = order.placeOrder();
    
    // Save and emit events
    await orderRepository.save(order);
    
    return { 
      success: true, 
      data: { orderId: order.id } 
    };
  }
});

// Usage
const result = await PlaceOrderUseCase.execute({
  customerId: 'cust-123',
  items: [{ productId: 'prod-456', quantity: 2 }]
}, {
  orderRepository: OrderRepository,
  productRepository: ProductRepository,
  customerRepository: CustomerRepository
});

if (result.success) {
  console.log(`Order placed with ID: ${result.data.orderId}`);
} else {
  console.error(`Failed to place order: ${result.error}`);
}
```

**Implementation Details:**
- Use cases validate input with Zod schemas
- Dependencies are explicitly declared and injected
- Results follow a consistent pattern (success/error)
- Acts as the orchestration layer for domain objects

### 4.2 Command and Query Handlers

For more complex applications, separate command and query handlers provide a CQRS approach.

```javascript
import { z } from 'zod';
import { command, query } from '@domainify/core';

// Command
const PlaceOrderCommand = command({
  name: 'PlaceOrder',
  input: PlaceOrderSchema,
  dependencies: { /* repositories */ },
  handler: async (input, deps) => {
    // Similar to use case implementation
  }
});

// Query
const GetOrderDetailsQuery = query({
  name: 'GetOrderDetails',
  input: z.object({
    orderId: z.string().uuid()
  }),
  dependencies: {
    orderRepository: OrderRepository
  },
  handler: async (input, deps) => {
    const order = await deps.orderRepository.findById(input.orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }
    
    return {
      success: true,
      data: {
        id: order.id,
        customer: order.customerId,
        items: order.items,
        status: order.status,
        total: order.total
      }
    };
  }
});

// Usage
const commandBus = createCommandBus([PlaceOrderCommand]);
const queryBus = createQueryBus([GetOrderDetailsQuery]);

await commandBus.dispatch('PlaceOrder', {
  customerId: 'cust-123',
  items: [{ productId: 'prod-456', quantity: 2 }]
});

const orderDetails = await queryBus.dispatch('GetOrderDetails', {
  orderId: 'order-789'
});
```

---

## 5. Infrastructure Components

### 5.1 Repository Adapters

Repository adapters provide the infrastructure implementation for repositories.

```javascript
import { createRepositoryAdapter } from '@domainify/core';

// Generic adapter interface
export interface RepositoryAdapter<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: object | Specification<T>): Promise<T[]>;
  save(aggregate: T): Promise<void>;
  delete(id: string): Promise<void>;
}

// MongoDB adapter implementation
export function createMongoAdapter<T>(options: MongoAdapterOptions<T>): RepositoryAdapter<T> {
  return {
    async findById(id: string) {
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
    }
  };
}
```

**Available Adapters:**
- `@domainify/mongodb`: MongoDB repository adapter
- `@domainify/prisma`: Prisma ORM repository adapter
- `@domainify/redis`: Redis repository adapter
- `@domainify/memory`: In-memory repository adapter for testing

### 5.2 Event Bus Implementations

```javascript
import { createEventBus } from '@domainify/core';

// In-memory event bus (default)
const inMemoryBus = createEventBus();

// Redis event bus
import { createRedisEventBus } from '@domainify/redis';
const redisBus = createRedisEventBus({
  url: process.env.REDIS_URL
});

// Custom implementation
const customBus = createEventBus({
  publish: async (events) => {
    // Custom publishing logic
  },
  subscribe: (eventType, handler) => {
    // Custom subscription logic
  }
});
```

### 5.3 Unit of Work Pattern

```javascript
import { createUnitOfWork } from '@domainify/core';

const unitOfWork = createUnitOfWork({
  repositories: {
    orders: OrderRepository,
    customers: CustomerRepository,
    products: ProductRepository
  }
});

// Usage
await unitOfWork.begin();

try {
  const order = await unitOfWork.orders.findById('order-123');
  const product = await unitOfWork.products.findById('prod-456');
  
  const updatedOrder = order.addItem(product, 1);
  await unitOfWork.orders.save(updatedOrder);
  
  await unitOfWork.commit();
} catch (error) {
  await unitOfWork.rollback();
  throw error;
}
```

---

## 6. Developer Experience Features

### 6.1 Error Handling

domainify provides rich error types that include context about the validation or business rule failure.

```javascript
try {
  const order = order.placeOrder();
} catch (error) {
  if (error instanceof InvariantViolationError) {
    console.error(`Business rule violated: ${error.invariantName}`);
    console.error(`Details: ${error.message}`);
  } else if (error instanceof ValidationError) {
    console.error(`Validation failed: ${error.message}`);
    console.error(`Path: ${error.path}`);
  }
}
```

### 6.2 Debugging Tools

```javascript
import { enableDebugging } from '@domainify/core';

// Enable detailed debugging
enableDebugging({
  logValidation: true,
  logEvents: true,
  logRepositoryOperations: true,
  logInvariants: true
});
```

### 6.3 Testing Utilities

```javascript
import { 
  mockRepository, 
  mockEventBus,
  createTestAggregate 
} from '@domainify/testing';

// Mock repository with predefined data
const orderRepo = mockRepository(Order, [
  { id: 'order-1', customerId: 'cust-1', /* ... */ },
  { id: 'order-2', customerId: 'cust-2', /* ... */ }
]);

// Verify events
const eventBus = mockEventBus();
await orderRepository.save(order);
expect(eventBus.published).toContainEvent(OrderPlaced);
```

---

## 7. Extension Points

domainify is designed to be extensible at multiple levels:

### 7.1 Custom Repository Adapters

```javascript
import { createRepositoryAdapter } from '@domainify/core';

const myAdapter = createRepositoryAdapter<Order>({
  findById: async (id) => {
    // Custom implementation
  },
  findAll: async (filter) => {
    // Custom implementation
  },
  save: async (aggregate) => {
    // Custom implementation
  },
  delete: async (id) => {
    // Custom implementation
  }
});

const OrderRepository = repository({
  aggregate: Order,
  adapter: myAdapter
});
```

### 7.2 Custom Event Bus

```javascript
import { createEventBus } from '@domainify/core';

const kafkaEventBus = createEventBus({
  publish: async (events) => {
    // Publish to Kafka
    for (const event of events) {
      await kafkaProducer.send({
        topic: event.constructor.name,
        messages: [{ value: JSON.stringify(event) }]
      });
    }
  },
  subscribe: (eventType, handler) => {
    // Subscribe to Kafka topic
    kafkaConsumer.subscribe([eventType.name]);
    kafkaConsumer.on('message', async (message) => {
      const event = JSON.parse(message.value);
      if (event.type === eventType.name) {
        await handler(event);
      }
    });
    
    return () => {
      // Return unsubscribe function
      kafkaConsumer.unsubscribe([eventType.name]);
    };
  }
});

// Replace default event bus
eventBus.setImplementation(kafkaEventBus);
```

### 7.3 Custom Serialization

```javascript
const OrderRepository = repository({
  aggregate: Order,
  adapter: mongoAdapter({
    // Custom serialization/deserialization
    serialize: (order) => {
      // Convert domain object to DB format
      return {
        _id: order.id,
        customer: order.customerId,
        lineItems: order.items.map(item => ({
          product: item.productId,
          qty: item.quantity,
          price: {
            value: item.unitPrice.amount,
            currency: item.unitPrice.currency
          }
        })),
        status: order.status
      };
    },
    deserialize: (doc) => {
      // Convert DB document to domain object
      return Order.create({
        id: doc._id,
        customerId: doc.customer,
        items: doc.lineItems.map(item => ({
          productId: item.product,
          quantity: item.qty,
          unitPrice: Money.create({
            amount: item.price.value,
            currency: item.price.currency
          })
        })),
        status: doc.status
      });
    }
  })
});
```

---

## 8. Package Structure and Imports

### 8.1 Core Package

```javascript
// Core DDD concepts
import {
  valueObject,
  entity,
  aggregate,
  domainEvent,
  repository,
  specification,
  boundedContext
} from '@domainify/core';

// Application layer
import {
  useCase,
  command,
  query,
  policy,
  saga
} from '@domainify/core';

// Infrastructure
import {
  createEventBus,
  createUnitOfWork,
  createRepositoryAdapter
} from '@domainify/core';
```

### 8.2 Adapter Packages

```javascript
// MongoDB adapter
import { createMongoAdapter } from '@domainify/mongodb';

// Prisma adapter
import { createPrismaAdapter } from '@domainify/prisma';

// Redis adapter
import { 
  createRedisAdapter, 
  createRedisEventBus 
} from '@domainify/redis';

// Testing utilities
import { 
  mockRepository, 
  mockEventBus,
  createTestAggregate 
} from '@domainify/testing';
```

---

## 9. Usage Example: E-Commerce Order System

```javascript
import { z } from 'zod';
import { 
  valueObject, 
  entity, 
  aggregate, 
  domainEvent, 
  repository, 
  useCase 
} from '@domainify/core';
import { createMongoAdapter } from '@domainify/mongodb';

// Value Objects
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
    },
    multiply(factor) {
      return Money.create({
        amount: this.amount * factor,
        currency: this.currency
      });
    }
  }
});

// Entities
const Product = entity({
  name: 'Product',
  schema: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    price: Money.schema,
    description: z.string(),
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

// Aggregates
const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      name: z.string(),
      quantity: z.number().int().positive(),
      unitPrice: Money.schema
    })),
    status: z.enum(['DRAFT', 'PLACED', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED']),
    placedAt: z.date().optional(),
    total: Money.schema.optional()
  }),
  identity: 'id',
  invariants: [
    {
      name: 'Order must have items when placed',
      check: order => order.status === 'DRAFT' || order.items.length > 0
    }
  ],
  methods: {
    addItem(product, quantity) {
      // Implementation details omitted for brevity
      return Order.update(this, {
        // Updated state
      });
    },
    placeOrder() {
      return Order.update(this, {
        status: 'PLACED',
        placedAt: new Date()
      }).emitEvent('OrderPlaced', {
        orderId: this.id,
        customerId: this.customerId,
        total: this.total
      });
    }
  }
});

// Domain Events
const OrderPlaced = domainEvent({
  name: 'OrderPlaced',
  schema: z.object({
    orderId: z.string().uuid(),
    customerId: z.string().uuid(),
    total: Money.schema,
    timestamp: z.date().default(() => new Date())
  })
});

// Repositories
const ProductRepository = repository({
  aggregate: Product,
  adapter: createMongoAdapter({
    collectionName: 'products',
    url: process.env.MONGO_URL
  })
});

const OrderRepository = repository({
  aggregate: Order,
  adapter: createMongoAdapter({
    collectionName: 'orders',
    url: process.env.MONGO_URL
  })
});

// Event Handlers
eventBus.on(OrderPlaced, async (event) => {
  // Send confirmation email, update analytics, etc.
});

// Use Case
const PlaceOrderUseCase = useCase({
  name: 'PlaceOrder',
  input: z.object({
    customerId: z.string().uuid(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive()
    }))
  }),
  dependencies: {
    orderRepository: OrderRepository,
    productRepository: ProductRepository
  },
  execute: async (input, deps) => {
    // Implementation details omitted for brevity
    // Create order
    // Add items
    // Check stock
    // Place order
    // Save order
    
    return { success: true, data: { orderId: order.id } };
  }
});

// API or Controller layer
async function handlePlaceOrderRequest(req, res) {
  const result = await PlaceOrderUseCase.execute(req.body, {
    orderRepository: OrderRepository,
    productRepository: ProductRepository
  });
  
  if (result.success) {
    res.status(201).json({ orderId: result.data.orderId });
  } else {
    res.status(400).json({ error: result.error });
  }
}
```

---

## 10. Implementation Roadmap

### Phase 1: Core Components
- [x] Value Objects
- [x] Entities
- [x] Aggregates
- [x] Domain Events
- [x] Basic Specifications
- [x] Basic Repository Interface

### Phase 2: Infrastructure
- [ ] MongoDB Repository Adapter
- [ ] Prisma Repository Adapter
- [ ] In-Memory Event Bus
- [ ] Error Handling
- [ ] Unit of Work

### Phase 3: Application Layer
- [ ] Use Cases
- [ ] Command Handlers
- [ ] Query Handlers
- [ ] Policies

### Phase 4: Advanced Features
- [ ] Event Sourcing
- [ ] Redis Adapter
- [ ] Advanced Specifications
- [ ] Sagas/Process Managers
- [ ] Testing Utilities

### Phase 5: Developer Experience
- [ ] Debugging Tools
- [ ] Documentation Generation
- [ ] VSCode Extension

---

## 11. Conclusion

domainify offers a modern, composable approach to implementing Domain-Driven Design in javascript applications. By leveraging Zod for schema validation and focusing on functional composition rather than inheritance, it provides a flexible foundation for building complex domain models.

The library prioritizes developer experience with clear APIs, comprehensive error handling, and extensive documentation, making it accessible for teams of all experience levels.

With its modular architecture and well-defined extension points, domainify can adapt to the specific needs of your domain while providing enough structure to enforce DDD best practices.

---
