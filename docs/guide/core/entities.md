# Working with Entities

Entities are a fundamental building block in Domain-Driven Design that represent objects with distinct identities that persist over time, even as their attributes change. While value objects are defined by their attributes, entities are defined primarily by their identity and continuity.

<!-- DIAGRAM: Visual comparison showing how an entity maintains its identity despite attribute changes over time, with multiple states of the same entity shown in sequence with the ID remaining constant while properties change -->

## What is an Entity?

An entity is an object that:

- Has a **unique identity** that remains stable throughout its lifecycle
- Can **change its attributes** over time while maintaining the same identity
- Is **tracked** through various state changes
- Often represents a **real-world individual, thing, or concept** with intrinsic identity
- Enforces **business rules** related to its lifecycle and state transitions

Think of an entity as answering the question "which specific one?" rather than just "what?"

### Real-World Examples

Entities are common in everyday life:

- **People** - You remain the same person even as your address, job, or appearance changes
- **Physical objects** - Your car maintains its identity even after repairs or modifications
- **Accounts** - Your bank account stays the same even as the balance changes
- **Orders** - An order keeps its identity even as items are added or its status changes
- **Reservations** - A booking maintains its identity even if the date is changed

### Identity Matters

The key characteristic of entities is that identity matters more than attributes:

```javascript
// Two customers with the same attributes but different IDs are different entities
const customer1 = Customer.create({
  id: 'cust-123',
  name: 'Jane Smith',
  email: 'jane@example.com'
});

const customer2 = Customer.create({
  id: 'cust-456',  // Different ID
  name: 'Jane Smith',  // Same name
  email: 'jane@example.com'  // Same email
});

// These are NOT the same customer
console.log(customer1.equals(customer2)); // false
```

## Creating Entities with DomainDrivenJS

DomainDrivenJS provides a clean, functional approach to creating entities with the `entity` factory function:

```javascript
import { z } from 'zod';
import { entity } from 'domaindrivenjs';

const Product = entity({
  name: 'Product',                     // Name of the entity
  schema: z.object({                   // Zod schema for validation
    id: z.string().uuid(),             // Identity field
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.number().positive(),
    stockLevel: z.number().int().nonnegative(),
    isActive: z.boolean().default(true),
    createdAt: z.date(),
    updatedAt: z.date()
  }),
  identity: 'id',                      // Which field is the identity
  methods: {                           // Methods for behavior
    updatePrice(newPrice) {
      if (newPrice <= 0) {
        throw new Error('Price must be positive');
      }
      return Product.update(this, {
        price: newPrice,
        updatedAt: new Date()
      });
    },
    
    decreaseStock(quantity) {
      if (quantity > this.stockLevel) {
        throw new Error('Not enough stock available');
      }
      return Product.update(this, {
        stockLevel: this.stockLevel - quantity,
        updatedAt: new Date()
      });
    },
    
    increaseStock(quantity) {
      return Product.update(this, {
        stockLevel: this.stockLevel + quantity,
        updatedAt: new Date()
      });
    },
    
    deactivate() {
      return Product.update(this, {
        isActive: false,
        updatedAt: new Date()
      });
    },
    
    activate() {
      return Product.update(this, {
        isActive: true,
        updatedAt: new Date()
      });
    }
  }
});
```

Let's break down the components:

1. **`name`**: A descriptive name for your entity
2. **`schema`**: A Zod schema that defines the structure and validation rules
3. **`identity`**: The property that uniquely identifies this entity
4. **`methods`**: Functions that provide behavior and enforce business rules

## Using Entities

Once defined, entities are used like this:

```javascript
// Create a new Product entity
const product = Product.create({
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Ergonomic Keyboard',
  description: 'A comfortable keyboard for long typing sessions',
  price: 89.99,
  stockLevel: 50,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Update the product's price
const updatedProduct = product.updatePrice(79.99);
console.log(updatedProduct.price); // 79.99
console.log(product.price); // Still 89.99 (original is immutable)

// Process an order
try {
  const productAfterOrder = product.decreaseStock(5);
  console.log(productAfterOrder.stockLevel); // 45
} catch (error) {
  console.error('Order processing failed:', error.message);
}

// Deactivate the product
const deactivatedProduct = product.deactivate();
console.log(deactivatedProduct.isActive); // false
```

## Entity Identity and Equality

Entities are compared by their identity, not by their attributes:

```javascript
const product1 = Product.create({
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Ergonomic Keyboard',
  price: 89.99,
  stockLevel: 50,
  createdAt: new Date(),
  updatedAt: new Date()
});

const product2 = Product.create({
  id: '123e4567-e89b-12d3-a456-426614174000', // Same ID
  name: 'Ergonomic Keyboard Pro', // Different name
  price: 129.99, // Different price
  stockLevel: 25, // Different stock level
  createdAt: new Date(),
  updatedAt: new Date()
});

const product3 = Product.create({
  id: '123e4567-e89b-12d3-a456-426614174001', // Different ID
  name: 'Ergonomic Keyboard', // Same name
  price: 89.99, // Same price
  stockLevel: 50, // Same stock level
  createdAt: new Date(),
  updatedAt: new Date()
});

console.log(product1.equals(product2)); // true - same identity
console.log(product1.equals(product3)); // false - different identity
```

## Immutability with State Changes

A key feature of DomainDrivenJS entities is that they are immutable, but can represent state changes by creating new instances:

```javascript
// Entities are immutable
try {
  product.price = 99.99; // This will throw an error
} catch (error) {
  console.error(error); // Cannot assign to read-only property 'price'
}

// Instead, use update methods that return new instances
const discountedProduct = product.updatePrice(79.99);

// Original remains unchanged
console.log(product.price); // 89.99
console.log(discountedProduct.price); // 79.99

// Chain operations (each returns a new instance)
const readyForSale = product
  .increaseStock(25)  // Now 75 in stock
  .updatePrice(99.99) // Higher price
  .activate();        // Make sure it's active
```

This immutability helps prevent bugs from unexpected state changes and makes your code more predictable.

## Entity Lifecycle

Entities typically have a lifecycle with different states:

<!-- DIAGRAM: State diagram showing typical entity lifecycle stages (e.g., Created → Active → Suspended → Terminated) with transitions between them -->

```javascript
const User = entity({
  name: 'User',
  schema: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED']),
    // Other properties...
  }),
  identity: 'id',
  methods: {
    activate() {
      if (this.status !== 'PENDING') {
        throw new Error(`Cannot activate user with status: ${this.status}`);
      }
      return User.update(this, { status: 'ACTIVE' });
    },
    
    suspend() {
      if (this.status !== 'ACTIVE') {
        throw new Error(`Cannot suspend user with status: ${this.status}`);
      }
      return User.update(this, { status: 'SUSPENDED' });
    },
    
    reinstate() {
      if (this.status !== 'SUSPENDED') {
        throw new Error(`Cannot reinstate user with status: ${this.status}`);
      }
      return User.update(this, { status: 'ACTIVE' });
    },
    
    terminate() {
      if (this.status === 'TERMINATED') {
        throw new Error('User is already terminated');
      }
      return User.update(this, { status: 'TERMINATED' });
    }
  }
});
```

This approach ensures that entity state transitions follow business rules and maintain data integrity.

## History Tracking

Entities can optionally track their state change history:

```javascript
const HistorizedProduct = entity({
  name: 'HistorizedProduct',
  schema: z.object({
    id: z.string().uuid(),
    name: z.string(),
    price: z.number().positive(),
    _history: z.array(z.any()).optional(), // For history entries
  }),
  identity: 'id',
  historize: true, // Enable history tracking
  methods: {
    updatePrice(newPrice) {
      return HistorizedProduct.update(this, { price: newPrice });
    }
  }
});

// Create a product
const product = HistorizedProduct.create({
  id: '123', 
  name: 'Widget',
  price: 10.00
});

// Make some changes
const product1 = product.updatePrice(12.00);
const product2 = product1.updatePrice(11.50);

// View history
console.log(product2._history);
/* Output:
[
  {
    timestamp: [Date],
    changes: [{ field: 'price', from: 10, to: 12, timestamp: [Date] }]
  },
  {
    timestamp: [Date],
    changes: [{ field: 'price', from: 12, to: 11.50, timestamp: [Date] }]
  }
]
*/
```

History tracking can be useful for audit trails, debugging, and understanding the evolution of entities over time.

## Value Objects Within Entities

Entities often contain value objects for complex attributes. DomainDrivenJS makes this integration seamless:

```javascript
import { z } from 'zod';
import { entity, valueObject } from 'domaindrivenjs';

// A value object for addresses
const Address = valueObject({
  name: 'Address',
  schema: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string()
  }),
  methods: {
    format() {
      return `${this.street}, ${this.city}, ${this.state} ${this.zipCode}, ${this.country}`;
    },
    
    isInternational(homeCountry = 'US') {
      return this.country !== homeCountry;
    }
  }
});

// Email value object
const Email = valueObject({
  name: 'Email',
  schema: z.string().email().toLowerCase(),
  methods: {
    getDomain() {
      return this.split('@')[1];
    }
  }
});

// An entity that uses value objects
const Customer = entity({
  name: 'Customer',
  schema: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: Email.schema, // Using the value object schema
    shippingAddress: Address.schema,
    billingAddress: Address.schema.optional()
  }),
  identity: 'id',
  methods: {
    updateEmail(email) {
      return Customer.update(this, { email });
    },
    
    updateShippingAddress(address) {
      return Customer.update(this, { shippingAddress: address });
    },
    
    updateBillingAddress(address) {
      return Customer.update(this, { billingAddress: address });
    },
    
    useShippingAddressForBilling() {
      return Customer.update(this, { 
        billingAddress: this.shippingAddress 
      });
    }
  }
});

// Usage
const customer = Customer.create({
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Jane Smith',
  email: Email.create('jane@example.com'),
  shippingAddress: Address.create({
    street: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    zipCode: '12345',
    country: 'US'
  })
});

// Use value object methods
console.log(customer.email.getDomain()); // 'example.com'
console.log(customer.shippingAddress.format()); // '123 Main St, Anytown, CA 12345, US'

// Update with a new value object
const updatedCustomer = customer.updateEmail(Email.create('jane.smith@example.com'));
```

Using value objects within entities gives you rich, type-safe, and validated attributes rather than primitive values.

## Extending Entities

To create specialized entity types, you can extend existing ones:

```javascript
const User = entity({
  name: 'User',
  schema: z.object({
    id: z.string().uuid(),
    username: z.string().min(3),
    email: z.string().email(),
    createdAt: z.date()
  }),
  identity: 'id',
  methods: {
    updateEmail(email) {
      return User.update(this, { email });
    }
  }
});

// Extended entity with additional properties and methods
const AdminUser = User.extend({
  name: 'AdminUser',
  schema: (baseSchema) => baseSchema.extend({
    role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
    permissions: z.array(z.string()),
    lastLogin: z.date().optional()
  }),
  methods: {
    grantPermission(permission) {
      if (this.permissions.includes(permission)) {
        return this; // Already has this permission
      }
      
      return AdminUser.update(this, {
        permissions: [...this.permissions, permission]
      });
    },
    
    revokePermission(permission) {
      if (!this.permissions.includes(permission)) {
        return this; // Doesn't have this permission
      }
      
      return AdminUser.update(this, {
        permissions: this.permissions.filter(p => p !== permission)
      });
    },
    
    updateLastLogin() {
      return AdminUser.update(this, {
        lastLogin: new Date()
      });
    }
  }
});

// Usage
const adminUser = AdminUser.create({
  id: '123e4567-e89b-12d3-a456-426614174000',
  username: 'admin',
  email: 'admin@example.com',
  createdAt: new Date(),
  role: 'ADMIN',
  permissions: ['users.view', 'users.edit']
});

// Using both base and extended methods
const updatedAdmin = adminUser
  .updateEmail('admin@company.com') // Base method
  .grantPermission('settings.manage') // Extended method
  .updateLastLogin(); // Extended method
```

Extending entities allows you to create specialized types while reusing validation and behavior from the base entity.

## Communicating with Other Entities

Entities often need to communicate with other entities. In DDD, this is typically done indirectly:

1. **Via references** - Store IDs rather than direct object references:

```javascript
// Order entity references Customer by ID, not direct object
const Order = entity({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(), // Reference by ID
    // Other properties...
  }),
  identity: 'id',
  // Methods...
});
```

2. **Via domain events** - Emit events that other entities can react to:

```javascript
placeOrder() {
  // Logic to place the order
  return Order.update(this, { 
    status: 'PLACED',
    placedAt: new Date()
  }).emitEvent('OrderPlaced', {
    orderId: this.id,
    customerId: this.customerId,
    placedAt: new Date()
  });
}
```

3. **Via domain services** - Use services to coordinate between entities:

```javascript
// OrderProcessingService handles operations that span multiple entities
const OrderProcessingService = {
  async fulfillOrder(order, inventory) {
    // Check inventory
    for (const item of order.items) {
      const stock = await inventory.getStockLevel(item.productId);
      if (stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }
    }
    
    // Update inventory
    for (const item of order.items) {
      await inventory.decreaseStock(item.productId, item.quantity);
    }
    
    // Update order status
    return order.markFulfilled();
  }
};
```

## Fetching Entities with Repositories

In practice, entities are typically stored and retrieved using repositories:

```javascript
import { repository, createInMemoryAdapter } from 'domaindrivenjs';

const CustomerRepository = repository({
  aggregate: Customer,
  adapter: createInMemoryAdapter({
    identity: 'id'
  })
});

// Create and save
const customer = Customer.create({
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Jane Smith',
  // Other properties...
});
await CustomerRepository.save(customer);

// Retrieve
const retrievedCustomer = await CustomerRepository.findById('123e4567-e89b-12d3-a456-426614174000');

// Update
const updatedCustomer = retrievedCustomer.updateEmail(Email.create('jane.smith@example.com'));
await CustomerRepository.save(updatedCustomer);
```

See the [Repositories](./repositories.md) guide for more details.

## Common Entity Patterns

### Entity Factory Methods

Factory methods can encapsulate complex creation logic:

```javascript
// Add static factory methods to the entity
const Order = entity({
  name: 'Order',
  // Schema and regular methods...
  methods: {
    // Instance methods...
  }
});

// Add factory methods
Order.createForCustomer = function(customerId, items) {
  return Order.create({
    id: generateId(),
    customerId,
    items,
    status: 'DRAFT',
    createdAt: new Date(),
    updatedAt: new Date()
  });
};

Order.createFromCart = function(cart) {
  return Order.create({
    id: generateId(),
    customerId: cart.customerId,
    items: cart.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price
    })),
    status: 'DRAFT',
    createdAt: new Date(),
    updatedAt: new Date()
  });
};

// Usage
const newOrder = Order.createForCustomer('cust-123', [
  { productId: 'prod-456', quantity: 2, price: 29.99 }
]);
```

### State Pattern

For entities with complex states, consider using an explicit state pattern:

```javascript
const OrderState = {
  DRAFT: {
    canModifyItems: true,
    canCancel: true,
    canPay: false,
    canShip: false,
    nextStates: ['PLACED']
  },
  PLACED: {
    canModifyItems: false,
    canCancel: true,
    canPay: true,
    canShip: false,
    nextStates: ['PAID', 'CANCELLED']
  },
  PAID: {
    canModifyItems: false,
    canCancel: true,
    canPay: false,
    canShip: true,
    nextStates: ['SHIPPED', 'CANCELLED']
  },
  SHIPPED: {
    canModifyItems: false,
    canCancel: false,
    canPay: false,
    canShip: false,
    nextStates: ['DELIVERED']
  },
  DELIVERED: {
    canModifyItems: false,
    canCancel: false,
    canPay: false,
    canShip: false,
    nextStates: []
  },
  CANCELLED: {
    canModifyItems: false,
    canCancel: false,
    canPay: false,
    canShip: false,
    nextStates: []
  }
};

const Order = entity({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    items: z.array(/* ... */),
    status: z.enum(['DRAFT', 'PLACED', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    // Other properties...
  }),
  identity: 'id',
  methods: {
    canTransitionTo(newStatus) {
      const currentState = OrderState[this.status];
      return currentState.nextStates.includes(newStatus);
    },
    
    addItem(item) {
      if (!OrderState[this.status].canModifyItems) {
        throw new Error(`Cannot modify items in ${this.status} status`);
      }
      // Add item implementation...
    },
    
    place() {
      if (!this.canTransitionTo('PLACED')) {
        throw new Error(`Cannot transition from ${this.status} to PLACED`);
      }
      return Order.update(this, { status: 'PLACED' });
    },
    
    // Other state transition methods...
  }
});
```

### Specifications for Entity Filtering

Use specifications to encapsulate complex filtering logic:

```javascript
import { specification } from 'domaindrivenjs';

// Define specifications for filtering orders
const OverdueOrders = specification({
  name: 'OverdueOrders',
  isSatisfiedBy: (order) => {
    if (order.status !== 'PLACED') return false;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return order.placedAt < thirtyDaysAgo;
  },
  toQuery: () => ({
    status: 'PLACED',
    placedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  })
});

const HighValueOrders = specification({
  name: 'HighValueOrders',
  isSatisfiedBy: (order) => order.total > 1000,
  toQuery: () => ({ total: { $gt: 1000 } })
});

// Use with repositories
const overdueHighValueOrders = await orderRepository.findBySpecification(
  OverdueOrders.and(HighValueOrders)
);
```

## Best Practices

1. **Make identity meaningful** - Use natural identifiers when possible instead of arbitrary ones
2. **Protect entity invariants** - Ensure entities can't be put into invalid states
3. **Express lifecycle in code** - Use explicit methods for state transitions
4. **Use value objects for attributes** - Replace primitive types with domain-specific value objects
5. **Favor rich behavior** - Put business logic in entity methods, not outside
6. **Make state changes explicit** - Use clear method names for operations that change state
7. **Keep entities focused** - Each entity should represent a single concept in the domain
8. **Reference other entities by ID** - Don't create direct object dependencies
9. **Use factory methods** - Encapsulate complex creation logic in factory methods
10. **Test business rules** - Verify that entity methods enforce invariants and business rules

## Common Pitfalls

### 1. Anemic Domain Model

An anemic domain model has entities that are little more than data containers, with all logic in external services:

```javascript
// AVOID: Anemic entity with no methods
const Order = entity({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    status: z.enum(['DRAFT', 'PLACED', 'PAID']),
    // Other properties...
  }),
  identity: 'id'
  // No methods!
});

// Logic lives outside the entity
const OrderService = {
  placeOrder(order) {
    if (order.status !== 'DRAFT') {
      throw new Error('Only draft orders can be placed');
    }
    return Order.update(order, { status: 'PLACED' });
  }
  // Other operations...
};
```

Instead, put behavior in the entity:

```javascript
// BETTER: Rich entity with methods
const Order = entity({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    status: z.enum(['DRAFT', 'PLACED', 'PAID']),
    // Other properties...
  }),
  identity: 'id',
  methods: {
    place() {
      if (this.status !== 'DRAFT') {
        throw new Error('Only draft orders can be placed');
      }
      return Order.update(this, { status: 'PLACED' });
    }
    // Other methods...
  }
});
```

### 2. Feature Envy

Feature envy occurs when a method is more interested in another object's data than its own:

```javascript
// AVOID: Cart is too interested in Product details
const Cart = entity({
  name: 'Cart',
  // Schema...
  identity: 'id',
  methods: {
    calculateItemDiscount(item, product) {
      if (product.category === 'electronics' && product.onSale) {
        return item.price * product.saleDiscountRate;
      } else if (product.category === 'clothing') {
        return item.price * 0.05;
      }
      return 0;
    }
  }
});
```

Instead, let the product calculate its own discount:

```javascript
// BETTER: Product calculates its own discount
const Product = entity({
  name: 'Product',
  // Schema...
  identity: 'id',
  methods: {
    calculateDiscountRate() {
      if (this.category === 'electronics' && this.onSale) {
        return this.saleDiscountRate;
      } else if (this.category === 'clothing') {
        return 0.05;
      }
      return 0;
    }
  }
});

// Cart delegates to Product
const Cart = entity({
  name: 'Cart',
  // Schema...
  identity: 'id',
  methods: {
    calculateItemDiscount(item, product) {
      return item.price * product.calculateDiscountRate();
    }
  }
});
```

### 3. Overusing Entity References

Embedding full entities inside other entities creates problematic dependencies:

```javascript
// AVOID: Embedding full entities
const Order = entity({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customer: Customer.schema, // Full entity embedded
    // Other properties...
  }),
  identity: 'id',
  // Methods...
});
```

Instead, reference by ID and use repositories to load related entities when needed:

```javascript
// BETTER: Reference by ID
const Order = entity({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(), // Just the ID
    // Other properties...
  }),
  identity: 'id',
  // Methods...
});

// Load related entities when needed
async function processOrder(orderId) {
  const order = await orderRepository.findById(orderId);
  const customer = await customerRepository.findById(order.customerId);
  
  // Now you can work with both
}
```

## Next Steps

Now that you understand entities, learn about:

- [Aggregates](./aggregates.md) - Clusters of entities and value objects with a root entity
- [Repositories](./repositories.md) - For persisting and retrieving entities
- [Domain Events](./domain-events.md) - For communication between entities
- [Domain Services](./domain-services.md) - For operations spanning multiple entities
