# Tactical Design in Domain-Driven Design

While strategic design helps organize your system at a high level, tactical design provides the patterns and building blocks to implement your domain model in code. These patterns give you a language for expressing complex business concepts and rules in a maintainable way.

<!-- DIAGRAM: Visualization showing tactical design building blocks (value objects, entities, aggregates, etc.) and how they relate to each other in layers/groups -->

## Why Tactical Design Matters

Tactical design helps you:

1. **Express domain concepts directly in code** - Close the gap between business language and implementation
2. **Make implicit concepts explicit** - Surface hidden assumptions as named constructs
3. **Enforce business rules consistently** - Encapsulate validation and constraints in the right places
4. **Organize domain logic** - Provide clear homes for behavior and state
5. **Avoid anemic models** - Create rich, behavior-focused models rather than data structures

## Building Blocks Overview

Domain-Driven Design provides a set of building blocks that work together to express your domain model:

### Core Building Blocks

<!-- DIAGRAM: Hexagon or circular diagram showing the relationship between building blocks with arrows indicating relationships -->

- **Value Objects** - Immutable objects defined by their attributes
- **Entities** - Objects with identity that can change over time
- **Aggregates** - Clusters of objects treated as a cohesive unit
- **Domain Events** - Record of something significant that happened
- **Repositories** - Provide access to aggregates
- **Domain Services** - Operations that don't belong to a single object
- **Factories** - Create complex objects or object graphs

Let's explore each building block in detail.

## Value Objects

Value objects are immutable objects defined by their attributes, not by an identity.

### Key Characteristics

- **Immutable** - Never change after creation
- **Attribute-based equality** - Two value objects with the same attributes are equal
- **No identity** - Interchangeable if attributes are the same
- **Self-validating** - Ensure their values are always valid
- **Rich behavior** - Encapsulate operations related to what they represent

### Classic Examples

- Money (amount + currency)
- Date ranges
- Addresses
- Geographical coordinates
- Email addresses
- Colors (RGB values)

### Implementation with Domainify

```javascript
import { z } from 'zod';
import { valueObject } from 'domainify';

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
    },
    
    format(locale = 'en-US') {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: this.currency
      }).format(this.amount);
    }
  }
});

// Usage
const price = Money.create({ amount: 29.99, currency: 'USD' });
const tax = Money.create({ amount: 2.40, currency: 'USD' });
const total = price.add(tax);
console.log(total.format()); // "$32.39"
```

### Best Practices for Value Objects

1. **Make them truly immutable** - Operations should return new instances
2. **Keep them focused** - Each value object should represent one concept
3. **Include validation** - Ensure they can never be in an invalid state
4. **Use value objects for all domain values** - Avoid primitive obsession
5. **Consider creating value object collections** - Collections of value objects can themselves be value objects

## Entities

Entities are objects with identity that persists as they change state over time.

### Key Characteristics

- **Identity-based equality** - Two entities with the same ID are equal even if attributes differ
- **Mutable** - Can change state while maintaining the same identity
- **Continuity** - Tracked across state changes throughout their lifecycle
- **Business identifiers** - Often have natural business keys like order numbers
- **Lifecycle stages** - May pass through various states representing real-world stages

### Classic Examples

- User accounts
- Orders
- Products
- Reservations
- Financial accounts
- Vehicles

### Implementation with Domainify

```javascript
import { z } from 'zod';
import { entity } from 'domainify';

const Customer = entity({
  name: 'Customer',
  schema: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    email: z.string().email(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']),
    createdAt: z.date()
  }),
  identity: 'id',
  methods: {
    activate() {
      if (this.status === 'BLOCKED') {
        throw new Error('Cannot activate a blocked customer');
      }
      return Customer.update(this, { status: 'ACTIVE' });
    },
    
    deactivate() {
      return Customer.update(this, { status: 'INACTIVE' });
    },
    
    block() {
      return Customer.update(this, { status: 'BLOCKED' });
    },
    
    updateEmail(email) {
      return Customer.update(this, { email });
    }
  }
});

// Usage
const customer = Customer.create({
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Jane Smith',
  email: 'jane@example.com',
  status: 'ACTIVE',
  createdAt: new Date()
});

const updatedCustomer = customer.updateEmail('jane.smith@example.com');
```

### Best Practices for Entities

1. **Choose meaningful identifiers** - Use natural business identifiers when possible
2. **Encapsulate state changes** - Provide methods for all valid state transitions
3. **Express lifecycle in code** - Use states, state transitions, and validation to model lifecycle
4. **Consider using value objects for attributes** - Replace primitive types with rich value objects
5. **Keep entities focused** - Each entity should represent a single concept

## Aggregates

Aggregates are clusters of entities and value objects treated as a single unit for data changes, with a designated root entity.

### Key Characteristics

- **Consistency boundary** - Maintains invariants across multiple objects
- **Transactional boundary** - Updated in a single transaction
- **Root entity** - Single entry point controlling access to members
- **References by identity** - References other aggregates by ID, not direct object reference
- **Deletion boundary** - When root is deleted, all members are deleted

### Classic Examples

- Order (root) with OrderItems
- User (root) with Addresses and Preferences
- Product (root) with Variants and Attributes
- Invoice (root) with LineItems and Payments

### Implementation with Domainify

```javascript
import { z } from 'zod';
import { aggregate } from 'domainify';

const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    items: z.array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive(),
      })
    ),
    status: z.enum(['DRAFT', 'PLACED', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED']),
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
      if (this.status !== 'DRAFT') {
        throw new Error('Cannot modify a placed order');
      }
      
      // Check for existing product
      const existingItemIndex = this.items.findIndex(
        item => item.productId === product.id
      );
      
      let updatedItems;
      if (existingItemIndex >= 0) {
        // Update quantity of existing item
        const existingItem = this.items[existingItemIndex];
        const updatedItem = {
          ...existingItem,
          quantity: existingItem.quantity + quantity
        };
        
        updatedItems = [
          ...this.items.slice(0, existingItemIndex),
          updatedItem,
          ...this.items.slice(existingItemIndex + 1)
        ];
      } else {
        // Add new item
        updatedItems = [
          ...this.items,
          {
            productId: product.id,
            quantity,
            unitPrice: product.price
          }
        ];
      }
      
      return Order.update(this, { items: updatedItems });
    },
    
    placeOrder() {
      if (this.status !== 'DRAFT') {
        throw new Error('Order can only be placed when in draft status');
      }
      
      return Order.update(this, { 
        status: 'PLACED' 
      }).emitEvent('OrderPlaced', {
        orderId: this.id,
        customerId: this.customerId,
        totalAmount: this.getTotalAmount(),
        placedAt: new Date()
      });
    },
    
    getTotalAmount() {
      return this.items.reduce(
        (total, item) => total + (item.quantity * item.unitPrice),
        0
      );
    }
  }
});

// Usage
let order = Order.create({
  id: '123e4567-e89b-12d3-a456-426614174000',
  customerId: '123e4567-e89b-12d3-a456-426614174001',
  items: [],
  status: 'DRAFT'
});

// Add items
order = order.addItem({ id: 'prod-1', price: 29.99 }, 2);
order = order.addItem({ id: 'prod-2', price: 49.99 }, 1);

// Place order
order = order.placeOrder();
```

### Best Practices for Aggregates

1. **Keep aggregates small** - Include only objects that must be consistent together
2. **Design for eventual consistency between aggregates** - Use domain events for cross-aggregate updates
3. **Reference other aggregates by ID** - Never include other aggregate roots as direct objects
4. **Enforce invariants** - Use explicit checks to maintain business rules
5. **One transaction per aggregate** - Update only one aggregate per transaction

## Domain Events

Domain events represent significant occurrences in the domain that other parts of the system might be interested in.

### Key Characteristics

- **Immutable** - Never changed after creation
- **Named in past tense** - Represents something that has happened
- **Contain essential information** - Include all relevant details about what occurred
- **Time-stamped** - Record when the event occurred
- **Published after state changes** - Emitted after an operation completes successfully

### Classic Examples

- OrderPlaced
- PaymentReceived
- ShipmentDelivered
- AccountCreated
- PasswordChanged
- InventoryReduced

### Implementation with Domainify

```javascript
import { z } from 'zod';
import { domainEvent, eventBus } from 'domainify';

// Define an event type
const OrderPlaced = domainEvent({
  name: 'OrderPlaced',
  schema: z.object({
    orderId: z.string().uuid(),
    customerId: z.string().uuid(),
    totalAmount: z.number().positive(),
    items: z.array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive()
      })
    ),
    placedAt: z.date()
  })
});

// Handle the event
eventBus.on(OrderPlaced, async (event) => {
  console.log(`Order ${event.orderId} was placed at ${event.placedAt}`);
  
  // Notify inventory system to reserve items
  await inventoryService.reserveItems(event.items);
  
  // Send confirmation email
  await emailService.sendOrderConfirmation(event.customerId, event.orderId);
});

// Emitting events from aggregates
const placedOrder = order.placeOrder(); // This emits the OrderPlaced event

// When saving the aggregate, events are published
await orderRepository.save(placedOrder);
```

### Best Practices for Domain Events

1. **Name events in past tense** - They represent things that have already happened
2. **Include all necessary context** - Events should be self-contained
3. **Make events immutable** - Never change an event after creation
4. **Use events for cross-aggregate communication** - Maintain aggregate boundaries
5. **Consider versioning events** - Event schemas may evolve over time

## Repositories

Repositories provide a collection-like interface for accessing and persisting aggregates.

### Key Characteristics

- **Collection abstraction** - Presents aggregates as an in-memory collection
- **Persistence ignorance** - Domain model doesn't know how it's stored
- **Aggregate-focused** - One repository per aggregate type
- **Encapsulates query logic** - Hides data access implementation details
- **Returns fully hydrated aggregates** - Loads complete aggregates, not partial objects

### Implementation with Domainify

```javascript
import { repository, createInMemoryAdapter } from 'domainify';

// Create a repository for the Order aggregate
const OrderRepository = repository({
  aggregate: Order,
  adapter: createInMemoryAdapter({
    identity: 'id'
  }),
  events: {
    publishOnSave: true,
    clearAfterPublish: true
  }
});

// More realistic adapter for production
const OrderRepositoryProd = repository({
  aggregate: Order,
  adapter: createMongoAdapter({
    connectionString: process.env.MONGO_URL,
    collection: 'orders'
  })
});

// Usage
// Create and save
const order = Order.create({/*...*/});
await OrderRepository.save(order);

// Find by ID
const foundOrder = await OrderRepository.findById('123e4567-e89b-12d3-a456-426614174000');

// Find with criteria
const draftOrders = await OrderRepository.findAll({ status: 'DRAFT' });

// Delete
await OrderRepository.delete('123e4567-e89b-12d3-a456-426614174000');
```

### Best Practices for Repositories

1. **One repository per aggregate** - Each aggregate type should have its own repository
2. **Hide storage details** - Repositories should abstract away database concerns
3. **Return fully constructed aggregates** - Never return partial objects
4. **Use specifications for queries** - Encapsulate complex query logic in specification objects
5. **Consider caching strategies** - For performance-critical repositories

## Domain Services

Domain services encapsulate operations that don't naturally belong to a specific entity or value object.

### Key Characteristics

- **Stateless operations** - Don't maintain their own state
- **Multiple participants** - Coordinate between multiple domain objects
- **Process-oriented** - Represent activities rather than things
- **Named after domain processes** - Use verbs or noun-verb combinations
- **Part of the domain model** - Not application or infrastructure concerns

### Classic Examples

- PaymentProcessor (coordinates between Account, Payment, and Transaction)
- FulfillmentService (coordinates between Order, Inventory, and Shipping)
- PricingService (applies pricing rules to products)
- TaxCalculator (determines tax across line items)
- ReservationManager (allocates limited resources)

### Implementation with Domainify

```javascript
import { domainService } from 'domainify';

const PaymentService = domainService({
  name: 'PaymentService',
  dependencies: {
    accountRepository: null,
    paymentGateway: null
  },
  operations: {
    async processPayment(accountId, amount, description) {
      const { accountRepository, paymentGateway } = this.dependencies;
      
      // Get the account
      const account = await accountRepository.findById(accountId);
      if (!account) {
        return { success: false, error: 'Account not found' };
      }
      
      // Check funds availability
      if (!account.hasSufficientFunds(amount)) {
        return { success: false, error: 'Insufficient funds' };
      }
      
      try {
        // Process payment through gateway
        const paymentResult = await paymentGateway.charge({
          accountId,
          amount: amount.amount,
          currency: amount.currency,
          description
        });
        
        if (paymentResult.success) {
          // Update account with transaction
          const updatedAccount = account.recordTransaction({
            type: 'PAYMENT',
            amount: amount.negate(),
            reference: paymentResult.transactionId,
            description
          });
          
          // Save account changes
          await accountRepository.save(updatedAccount);
          
          return {
            success: true,
            transactionId: paymentResult.transactionId
          };
        } else {
          return {
            success: false,
            error: paymentResult.error
          };
        }
      } catch (error) {
        return {
          success: false,
          error: `Payment failed: ${error.message}`
        };
      }
    }
  }
});

// Usage with dependencies
const paymentService = PaymentService.create({
  accountRepository: accountRepo,
  paymentGateway: stripeGateway
});

const result = await paymentService.processPayment(
  'account-123',
  Money.create({ amount: 99.99, currency: 'USD' }),
  'Monthly subscription'
);
```

### Best Practices for Domain Services

1. **Use for operations that span multiple objects** - Don't force behavior into entities where it doesn't belong
2. **Keep services focused** - Each service should handle one domain concern
3. **Name services using domain language** - Use verbs that domain experts recognize
4. **Make dependencies explicit** - Clearly define what the service needs to operate
5. **Avoid anemic entities** - Don't move all behavior to services; entities should still have behavior

## Factories

Factories encapsulate complex object creation logic, especially for creating aggregates or complex value objects.

### Key Characteristics

- **Encapsulate creation logic** - Hide complicated instantiation details
- **Ensure valid objects** - Create only valid, complete objects
- **Support variations** - Handle different creation scenarios
- **Express intent** - Named methods explain what's being created
- **Hide implementation details** - Abstract construction complexity

### Implementation with Domainify

```javascript
import { z } from 'zod';

// Factory for creating shopping carts in different scenarios
const ShoppingCartFactory = {
  // Create an empty cart for new visitor
  createForVisitor() {
    return ShoppingCart.create({
      id: generateId(),
      items: [],
      status: 'ACTIVE',
      created: new Date()
    });
  },
  
  // Create a cart for a logged-in customer
  createForCustomer(customer) {
    return ShoppingCart.create({
      id: generateId(),
      customerId: customer.id,
      items: [],
      status: 'ACTIVE',
      created: new Date()
    });
  },
  
  // Recreate a saved cart from storage
  recreateFromStorage(storedCart) {
    // Transform stored data into proper value objects
    const items = storedCart.items.map(item => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: Money.create({
        amount: item.price,
        currency: item.currency
      })
    }));
    
    return ShoppingCart.create({
      id: storedCart.id,
      customerId: storedCart.customerId,
      items,
      status: storedCart.status,
      created: new Date(storedCart.created)
    });
  }
};
```

### Best Practices for Factories

1. **Use factories for complex creation** - When creating objects requires more than simple construction
2. **Express intent in factory methods** - Name methods according to their purpose
3. **Ensure complete, valid objects** - Objects should be fully initialized and valid
4. **Keep factories focused** - Each factory should create related objects
5. **Consider factory methods on aggregates** - For creating related entities within an aggregate

## How Building Blocks Work Together

These tactical patterns don't exist in isolation. Here's how they typically interact:

<!-- DIAGRAM: Flow/relationship diagram showing how components interact -->

1. **Entities and Value Objects** form the core of your domain model
2. **Aggregates** group these into consistency boundaries with a root Entity
3. **Repositories** store and retrieve Aggregates
4. **Factories** help create complex Aggregates and Value Objects
5. **Domain Services** coordinate operations across multiple Aggregates
6. **Domain Events** communicate changes between Aggregates

## Implementation Patterns with Domainify

Domainify provides specific implementation patterns for effectively using tactical DDD in JavaScript.

### Immutability

Domainify enforces immutability, requiring a functional style of programming:

```javascript
// Entities and aggregates are immutable
// State changes create new instances
const customer = Customer.create({/*...*/});

// This returns a new instance with updated email
const updatedCustomer = customer.updateEmail('new@example.com');

// The original remains unchanged
console.log(customer.email); // Still the old email
```

### Composition Over Inheritance

Domainify uses a composition-based approach rather than traditional class inheritance:

```javascript
// Create a basic value object
const String = valueObject({
  name: 'String',
  schema: z.string(),
  methods: {
    toUpperCase() {
      return String.create(this.valueOf().toUpperCase());
    }
  }
});

// Extend it with composition
const Email = String.extend({
  name: 'Email',
  schema: (baseSchema) => baseSchema.email().toLowerCase(),
  methods: {
    getDomain() {
      return this.split('@')[1];
    }
  }
});
```

### Validation with Zod

Domainify uses Zod for validation and type enforcement:

```javascript
// Define validation rules with Zod
const productSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3).max(100),
  price: z.number().positive(),
  description: z.string().optional(),
  categories: z.array(z.string()).min(1)
});

// Validation happens automatically during creation
try {
  const product = Product.create({
    id: '123',
    name: 'AB', // Too short!
    price: 29.99,
    categories: []  // Empty array not allowed!
  });
} catch (error) {
  console.error(error.message);
  // "Invalid Product: name must be at least 3 characters, categories must contain at least 1 element"
}
```

### Domain Events Integration

Domainify integrates domain events with aggregates and repositories:

```javascript
// Define an event
const OrderShipped = domainEvent({/*...*/});

// Emit from aggregate method
ship(trackingNumber) {
  return Order.update(this, {
    status: 'SHIPPED',
    trackingNumber,
    shippedAt: new Date()
  }).emitEvent(OrderShipped, {
    orderId: this.id,
    trackingNumber,
    shippedAt: new Date()
  });
}

// Events are automatically published when saved
await orderRepository.save(order.ship('TN123456789'));

// Subscribe to events
eventBus.on(OrderShipped, async (event) => {
  await notificationService.notifyCustomer(event.orderId, 'Your order has shipped!');
});
```

## Common Patterns & Anti-patterns

### Effective Patterns

1. **Encapsulate Rules in Value Objects**

```javascript
// Encapsulate validation and behavior
const Password = valueObject({
  name: 'Password',
  schema: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  methods: {
    isStrongEnough() {
      return this.length > 12 && /[^A-Za-z0-9]/.test(this);
    }
  }
});
```

2. **Tell, Don't Ask**

```javascript
// GOOD: Tell the order to cancel itself
const cancelledOrder = order.cancel();

// BAD: Ask for data, make decisions outside, then set state
if (order.status !== 'SHIPPED' && order.status !== 'DELIVERED') {
  order.status = 'CANCELLED'; // Violates immutability!
}
```

3. **Command-Query Separation**

```javascript
// Commands (change state)
const updatedCart = cart.addItem(product, 2);

// Queries (return information without side effects)
const totalPrice = cart.getTotalPrice();
const itemCount = cart.getItemCount();
```

### Anti-patterns to Avoid

1. **Anemic Domain Model**

```javascript
// ANTI-PATTERN: Entities with no behavior
const Customer = entity({
  name: 'Customer',
  schema: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    status: z.string()
  }),
  identity: 'id',
  // No methods!
});

// Using service for all behavior instead
const CustomerService = {
  activate(customer) {
    return Customer.update(customer, { status: 'ACTIVE' });
  },
  deactivate(customer) {
    return Customer.update(customer, { status: 'INACTIVE' });
  }
};
```

2. **Primitive Obsession**

```javascript
// ANTI-PATTERN: Using primitives for domain concepts
const Product = entity({
  name: 'Product',
  schema: z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(), // Just a primitive number!
    // ...
  }),
  // ...
});

// BETTER: Using value objects
const Product = entity({
  name: 'Product',
  schema: z.object({
    id: ProductId.schema,
    name: ProductName.schema,
    price: Money.schema, // Rich value object
    // ...
  }),
  // ...
});
```

3. **Feature Envy**

```javascript
// ANTI-PATTERN: Method more interested in another object than itself
const Order = {
  // ...
  calculateTotalPrice() {
    let total = 0;
    for (const item of this.items) {
      // Lots of logic working with item details
      const itemPrice = item.price * item.quantity;
      if (item.isDiscounted) {
        total += itemPrice * (1 - item.discountRate);
      } else {
        total += itemPrice;
      }
    }
    return total;
  }
};

// BETTER: Let the item calculate its own price
const Order = {
  // ...
  calculateTotalPrice() {
    return this.items.reduce(
      (total, item) => total + item.calculatePrice(),
      0
    );
  }
};
```

## Getting Started with Tactical DDD

If you're new to tactical DDD, follow these steps:

1. **Start with value objects** - Replace primitive values with rich objects
2. **Move behavior to entities** - Make entities responsible for their own state changes
3. **Group into aggregates** - Identify consistency boundaries
4. **Implement repositories** - Create persistence infrastructure
5. **Add domain services** - Only for operations that don't fit elsewhere
6. **Introduce events** - For cross-aggregate communication

## Summary and Next Steps

Tactical design gives you a rich toolkit for implementing domain models that express business concepts directly in code. Domainify simplifies this with composition-based patterns, immutability, validation, and event support.

To learn more about specific building blocks in depth, check out these guides:
- [Value Objects](../core/value-objects.md)
- [Entities](../core/entities.md)
- [Aggregates](../core/aggregates.md)
- [Domain Events](../core/domain-events.md)
- [Repositories](../core/repositories.md)
- [Specifications](../core/specifications.md)
- [Domain Services](../core/domain-services.md)

Ready to start implementing with Domainify? Check out our [Quick Start Guide](../quick-start.md) for a complete example.
