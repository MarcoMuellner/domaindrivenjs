# Domain-Driven Design Best Practices

This guide covers best practices for implementing Domain-Driven Design with DomainDrivenJS. These practices will help you create maintainable, flexible, and business-aligned domain models.

## Domain Modeling Best Practices

### Focus on Business Language

Always model your domain using terminology from the business domain (ubiquitous language):

```javascript
// L Poor naming (technical/generic)
const DataProcessor = entity({
  name: 'DataProcessor',
  // ...
});

//  Good naming (domain-specific)
const PaymentProcessor = entity({
  name: 'PaymentProcessor',
  // ...
});
```

### Distinguish Value Objects and Entities Properly

Use value objects for concepts defined by their attributes and entities for objects with identity:

```javascript
//  Value object (defined by attributes)
const Address = valueObject({
  name: 'Address',
  schema: z.object({
    street: z.string(),
    city: z.string(),
    postalCode: z.string(),
    country: z.string()
  })
});

//  Entity (defined by identity)
const Customer = entity({
  name: 'Customer',
  schema: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    billingAddress: Address.schema.optional()
  }),
  identity: 'id'
});
```

### Design for Invariants

Identify and enforce business rules within aggregates:

```javascript
const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    items: z.array(OrderItem.schema),
    status: z.enum(['NEW', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    totalAmount: Money.schema
  }),
  identity: 'id',
  invariants: [
    {
      name: 'orders-must-have-items',
      check: (order) => order.items.length > 0,
      message: 'Orders must have at least one item'
    },
    {
      name: 'total-must-match-items',
      check: (order) => {
        const calculatedTotal = order.items.reduce(
          (sum, item) => sum + (item.price * item.quantity),
          0
        );
        return order.totalAmount.amount === calculatedTotal;
      },
      message: 'Order total must match sum of item prices'
    }
  ],
  methods: {
    // Domain behaviors...
  }
});
```

### Model Behavior, Not Just Data

Implement domain operations as methods on domain objects:

```javascript
// L Data structure with external operations
const Order = aggregate({
  name: 'Order',
  schema: orderSchema,
  identity: 'id'
});

// External operations (procedural style)
function confirmOrder(order) {
  if (order.status !== 'NEW') {
    throw new Error('Only new orders can be confirmed');
  }
  return { ...order, status: 'CONFIRMED' };
}

//  Rich domain model with behavior
const Order = aggregate({
  name: 'Order',
  schema: orderSchema,
  identity: 'id',
  methods: {
    confirm() {
      if (this.status !== 'NEW') {
        throw new Error('Only new orders can be confirmed');
      }
      return Order.create({
        ...this,
        status: 'CONFIRMED'
      });
    },
    
    cancel(reason) {
      if (['DELIVERED', 'CANCELLED'].includes(this.status)) {
        throw new Error('Cannot cancel delivered or already cancelled orders');
      }
      return Order.create({
        ...this,
        status: 'CANCELLED',
        cancellationReason: reason,
        cancelledAt: new Date()
      });
    },
    
    // More domain operations...
  }
});

// Usage
const confirmedOrder = order.confirm();
```

### Keep Aggregates Small and Focused

Design aggregates around true consistency boundaries:

```javascript
// L Large aggregate with too many responsibilities
const OrderAggregate = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string(),
    // ... order fields
    customer: Customer.schema,              // L Including entire customer
    paymentTransactions: z.array(Payment.schema), // L Including payment history
    shipments: z.array(Shipment.schema)     // L Including shipments
  }),
  // ...
});

//  Properly sized aggregates with references
const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string(),
    customerId: z.string(),               //  Reference to customer
    status: z.enum(['NEW', 'CONFIRMED', 'PAID', 'SHIPPED', 'DELIVERED']),
    items: z.array(OrderItem.schema),
    // ...
  }),
  // ...
});

const Payment = aggregate({
  name: 'Payment',
  schema: z.object({
    id: z.string(),
    orderId: z.string(),                  //  Reference to order
    amount: Money.schema,
    method: z.enum(['CREDIT_CARD', 'PAYPAL', 'BANK_TRANSFER']),
    status: z.enum(['PENDING', 'COMPLETED', 'FAILED']),
    // ...
  }),
  // ...
});

const Shipment = aggregate({
  name: 'Shipment',
  schema: z.object({
    id: z.string(),
    orderId: z.string(),                  //  Reference to order
    trackingNumber: z.string().optional(),
    status: z.enum(['PENDING', 'SHIPPED', 'DELIVERED']),
    // ...
  }),
  // ...
});
```

## Architectural Best Practices

### Layered Architecture

Maintain clear separation between layers:

```
                                       
                                       
           User Interface              
                                       
                   ,                   
                    
                    �
                                       
                                       
          Application Layer            
                                       
                   ,                   
                    
                    �
                                       
                                       
            Domain Layer               
                                       
                   ,                   
                    
                    �
                                       
                                       
        Infrastructure Layer           
                                       
                                       
```

Example project structure:

```
src/
   domain/                  # Domain layer
      order/
         Order.js         # Order aggregate
         OrderItem.js     # Value object
         OrderRepository.js
         specifications/
      customer/
         Customer.js      # Customer aggregate
         CustomerRepository.js
      shared/
          Money.js         # Shared value object

   application/             # Application layer
      OrderService.js      # Application service
      CustomerService.js   # Application service

   infrastructure/          # Infrastructure layer
      persistence/
         MongoOrderRepository.js
         MongoCustomerRepository.js
      messaging/
         RabbitMQEventBus.js
      services/
          EmailNotificationService.js

   ui/                      # User interface layer
       api/
          OrderController.js
          CustomerController.js
       web/
           components/
```

### Dependency Rule

Dependencies should point inward, with domain layer having no dependencies on outer layers:

```javascript
// L Bad: Domain object depends on infrastructure
import { db } from '../../infrastructure/database.js';

const Order = aggregate({
  name: 'Order',
  // ...
  methods: {
    async save() {
      // Direct database access from domain layer
      await db.collection('orders').updateOne(
        { id: this.id },
        { $set: this.toJSON() }
      );
    }
  }
});

//  Good: Domain object has no external dependencies
const Order = aggregate({
  name: 'Order',
  // ...
  methods: {
    confirm() {
      return Order.create({
        ...this,
        status: 'CONFIRMED'
      });
    }
  }
});

// Repository in infrastructure layer handles persistence
class MongoOrderRepository {
  constructor(db) {
    this.collection = db.collection('orders');
  }
  
  async save(order) {
    await this.collection.updateOne(
      { id: order.id },
      { $set: order.toJSON() }
    );
  }
}
```

### Application Services for Use Cases

Implement application services to orchestrate domain operations for specific use cases:

```javascript
// Application service coordinates domain operations
const OrderApplicationService = domainService({
  name: 'OrderApplicationService',
  dependencies: {
    orderRepository: 'required',
    customerRepository: 'required',
    productRepository: 'required',
    paymentService: 'required',
    eventBus: 'required'
  },
  methods: {
    async placeOrder(orderData, { orderRepository, customerRepository, productRepository, paymentService, eventBus }) {
      // Fetch necessary data
      const customer = await customerRepository.findById(orderData.customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }
      
      // Validate product availability
      const orderItems = [];
      for (const item of orderData.items) {
        const product = await productRepository.findById(item.productId);
        if (!product || product.stockLevel < item.quantity) {
          throw new Error(`Product ${item.productId} not available in requested quantity`);
        }
        
        orderItems.push(OrderItem.create({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: product.price
        }));
      }
      
      // Create domain object
      const order = Order.create({
        id: generateId(),
        customerId: customer.id,
        items: orderItems,
        status: 'NEW',
        placedAt: new Date()
      });
      
      // Save and publish events
      await orderRepository.save(order);
      await eventBus.publishEvents(order.domainEvents);
      
      return order;
    }
  }
});
```

## Implementation Best Practices

### Use Immutability

Keep your domain objects immutable to prevent accidental state changes:

```javascript
// L Mutable entity
const customer = Customer.create({
  id: '123',
  name: 'John Doe',
  email: 'john@example.com'
});

// Direct mutation
customer.name = 'Jane Doe'; // L Avoid this!

//  Immutable entity with explicit state transitions
const customer = Customer.create({
  id: '123',
  name: 'John Doe',
  email: 'john@example.com'
});

// Create new instance with updated state
const updatedCustomer = Customer.create({
  ...customer,
  name: 'Jane Doe'
});

// Or better, use a domain method
const updatedCustomer = customer.updateName('Jane Doe');
```

DomainDrivenJS helps enforce immutability by freezing objects using `Object.freeze()`.

### Use Domain Events for Side Effects

Use domain events to decouple effects from operations:

```javascript
const Order = aggregate({
  name: 'Order',
  schema: orderSchema,
  identity: 'id',
  methods: {
    ship(trackingCode) {
      if (this.status !== 'PAID') {
        throw new Error('Only paid orders can be shipped');
      }
      
      const shippedOrder = Order.create({
        ...this,
        status: 'SHIPPED',
        trackingCode,
        shippedAt: new Date()
      });
      
      // Record domain event
      shippedOrder.addDomainEvent({
        type: 'OrderShipped',
        payload: {
          orderId: this.id,
          trackingCode,
          shippedAt: new Date()
        }
      });
      
      return shippedOrder;
    }
  }
});

// Application service publishes events
async function shipOrder(orderId, trackingCode) {
  const order = await orderRepository.findById(orderId);
  const shippedOrder = order.ship(trackingCode);
  await orderRepository.save(shippedOrder);
  await eventBus.publishEvents(shippedOrder.domainEvents);
}

// Event handlers implement side effects
eventBus.subscribe('OrderShipped', async (event) => {
  await notificationService.notifyCustomer(
    event.payload.orderId,
    `Your order has shipped with tracking code ${event.payload.trackingCode}`
  );
  
  await analyticsService.recordShipment(event.payload);
});
```

### Leverage Specifications for Complex Queries

Use specifications to encapsulate complex business rules and queries:

```javascript
// Define specifications
const ActiveCustomer = specification({
  name: 'ActiveCustomer',
  isSatisfiedBy: (customer) => customer.status === 'ACTIVE',
  toQuery: () => ({ status: 'ACTIVE' })
});

const PremiumCustomer = specification({
  name: 'PremiumCustomer',
  isSatisfiedBy: (customer) => customer.tier === 'PREMIUM',
  toQuery: () => ({ tier: 'PREMIUM' })
});

const HasPendingOrders = specification({
  name: 'HasPendingOrders',
  parameters: ['orderRepository'],
  isSatisfiedBy: async (customer, { orderRepository }) => {
    const pendingOrders = await orderRepository.findMany({
      customerId: customer.id,
      status: { $in: ['NEW', 'CONFIRMED', 'PAID'] }
    });
    return pendingOrders.length > 0;
  },
  toQuery: () => ({
    // This can't be directly translated to a query,
    // so we'll need to use post-filtering
  })
});

// Compose specifications
const ActivePremiumCustomer = ActiveCustomer.and(PremiumCustomer);

// Use in repositories
const premiumCustomers = await customerRepository.findMany(
  PremiumCustomer
);

// Use for runtime validation
if (ActivePremiumCustomer.isSatisfiedBy(customer)) {
  // Apply premium customer business logic
}

// Use with parameters
const customersWithPendingOrders = await customerRepository.findMany(
  HasPendingOrders({ orderRepository })
);
```

### Implement Factories for Complex Object Creation

Use factory methods for complex object creation logic:

```javascript
// Complex creation logic in a factory
const ShoppingCartFactory = {
  createFromProductIds: async (customerType, productIds, productRepository) => {
    const products = await Promise.all(
      productIds.map(id => productRepository.findById(id))
    );
    
    const validProducts = products.filter(p => p && p.isAvailable);
    
    if (validProducts.length === 0) {
      throw new Error('No valid products to add to cart');
    }
    
    const items = validProducts.map(product => {
      const price = customerType === 'WHOLESALE' 
        ? product.wholesalePrice 
        : product.retailPrice;
        
      return CartItem.create({
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: price
      });
    });
    
    return ShoppingCart.create({
      id: generateId(),
      items,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
};
```

### Protect Invariants with Validation

Use validation at multiple levels to protect business rules:

1. **Schema validation** for data structure:
   ```javascript
   const OrderSchema = z.object({
     id: z.string().uuid(),
     customerId: z.string().uuid(),
     status: z.enum(['NEW', 'CONFIRMED', 'PAID', 'SHIPPED', 'DELIVERED']),
     items: z.array(OrderItemSchema).nonempty(),
     total: z.number().positive(),
     createdAt: z.date()
   });
   ```

2. **Attribute-level validation**:
   ```javascript
   const EmailAddress = valueObject({
     name: 'EmailAddress',
     schema: z.string().email(),
     validate: (email) => {
       // Additional custom validation beyond schema
       if (email.endsWith('.test')) {
         throw new Error('Test email domains are not supported');
       }
     }
   });
   ```

3. **Object-level invariants**:
   ```javascript
   const Order = aggregate({
     // ...
     invariants: [
       {
         name: 'items-must-match-total',
         check: (order) => {
           const calculatedTotal = order.items.reduce(
             (sum, item) => sum + (item.unitPrice * item.quantity),
             0
           );
           return Math.abs(calculatedTotal - order.total) < 0.001;
         },
         message: 'Order total must match sum of item prices'
       }
     ]
   });
   ```

4. **Domain operation validations**:
   ```javascript
   const Order = aggregate({
     // ...
     methods: {
       cancel(reason) {
         if (['DELIVERED', 'CANCELLED'].includes(this.status)) {
           throw new Error('Cannot cancel delivered or already cancelled orders');
         }
         
         if (!reason || reason.trim().length < 3) {
           throw new Error('Cancellation reason is required');
         }
         
         return Order.create({
           ...this,
           status: 'CANCELLED',
           cancellationReason: reason,
           cancelledAt: new Date()
         });
       }
     }
   });
   ```

## Evolutionary Design Best Practices

### Start Simple and Refine

Begin with simple models and refine as you learn more about the domain:

1. **Start with key entities and their relationships**
2. **Add behaviors iteratively** as you understand the domain better
3. **Refactor towards deeper insight** when you discover new domain concepts

### Use Bounded Contexts to Manage Complexity

Break large domains into smaller, more manageable bounded contexts:

```javascript
// Order Bounded Context
const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customerInfo: CustomerInfo.schema, // Simplified customer view
    items: z.array(OrderItem.schema),
    // Order-specific fields...
  }),
  // ...
});

// Customer Bounded Context
const Customer = aggregate({
  name: 'Customer',
  schema: z.object({
    id: z.string().uuid(),
    personalInfo: PersonalInfo.schema,
    paymentMethods: z.array(PaymentMethod.schema),
    // Customer-specific fields...
  }),
  // ...
});

// Anti-corruption layer between contexts
class CustomerOrderFacade {
  constructor(customerRepository) {
    this.customerRepository = customerRepository;
  }
  
  async getCustomerInfoForOrder(customerId) {
    const customer = await this.customerRepository.findById(customerId);
    
    // Transform to OrderContext's CustomerInfo
    return CustomerInfo.create({
      id: customer.id,
      name: customer.personalInfo.fullName,
      email: customer.personalInfo.email,
      shippingAddress: customer.defaultShippingAddress
    });
  }
}
```

### Use Context Maps

Document the relationships between bounded contexts to manage integrations:

```javascript
// Context map example (in documentation or code comments)
/*
 * Context Map:
 * 
 *                                        
 *                                        
 *   Order Context �      $ Payment Context
 *                                        
 *        ,                               
 *         
 *          Customer
 *          Anti-Corruption
 *          Layer
 *         �
 *                                        
 *                                        
 * Customer Context�      $Shipping Context
 *                                        
 *                                        
 *
 * Relationships:
 * - Order �� Payment: Partnership (well-defined integration)
 * - Order �� Customer: Customer Context is upstream (provides service)
 * - Customer �� Shipping: Customer Context is upstream
 */
```

## Testing Best Practices

### Use Domain-Focused Tests

Write tests that focus on domain behavior and business rules:

```javascript
import { describe, it, expect } from 'vitest';
import { Order } from './Order.js';
import { OrderItem } from './OrderItem.js';
import { Money } from '../shared/Money.js';

describe('Order', () => {
  it('should calculate correct total amount', () => {
    // Arrange
    const order = Order.create({
      id: '123',
      customerId: '456',
      status: 'NEW',
      items: [
        OrderItem.create({
          productId: 'p1',
          productName: 'Product 1',
          quantity: 2,
          unitPrice: Money.create({ amount: 10, currency: 'USD' })
        }),
        OrderItem.create({
          productId: 'p2',
          productName: 'Product 2',
          quantity: 1,
          unitPrice: Money.create({ amount: 20, currency: 'USD' })
        })
      ]
    });
    
    // Act
    const total = order.calculateTotal();
    
    // Assert
    expect(total.amount).toBe(40); // (2*10) + (1*20)
    expect(total.currency).toBe('USD');
  });
  
  it('should not allow shipping unless paid', () => {
    // Arrange
    const order = Order.create({
      id: '123',
      customerId: '456',
      status: 'CONFIRMED', // Not yet paid
      items: [/* ... */]
    });
    
    // Act & Assert
    expect(() => {
      order.ship('TRACK123');
    }).toThrow('Only paid orders can be shipped');
    
    // Arrange - paid order
    const paidOrder = Order.create({
      ...order,
      status: 'PAID'
    });
    
    // Act - should not throw
    const shippedOrder = paidOrder.ship('TRACK123');
    
    // Assert
    expect(shippedOrder.status).toBe('SHIPPED');
    expect(shippedOrder.trackingCode).toBe('TRACK123');
    expect(shippedOrder.domainEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'OrderShipped',
          payload: expect.objectContaining({
            orderId: '123',
            trackingCode: 'TRACK123'
          })
        })
      ])
    );
  });
});
```

### Test Both Success and Failure Cases

Always test both the happy path and error cases:

```javascript
describe('Customer', () => {
  it('should update email successfully when valid', () => {
    // Happy path - valid email update
    const customer = Customer.create({
      id: '123',
      name: 'Test',
      email: 'old@example.com'
    });
    
    const updated = customer.updateEmail('new@example.com');
    
    expect(updated.email).toBe('new@example.com');
  });
  
  it('should reject invalid email formats', () => {
    // Error case - invalid email
    const customer = Customer.create({
      id: '123',
      name: 'Test',
      email: 'old@example.com'
    });
    
    expect(() => {
      customer.updateEmail('invalid-email');
    }).toThrow('Invalid email format');
    
    expect(() => {
      customer.updateEmail('');
    }).toThrow('Email cannot be empty');
  });
});
```

### Use In-Memory Repositories for Testing

Test repositories using in-memory implementations:

```javascript
import { InMemoryAdapter } from 'domaindrivenjs/adapters';

describe('OrderService', () => {
  let orderRepository;
  let productRepository;
  let orderService;
  
  beforeEach(() => {
    // Set up repositories with in-memory adapters
    orderRepository = OrderRepository.create(new InMemoryAdapter());
    productRepository = ProductRepository.create(new InMemoryAdapter());
    
    // Seed test data
    const product1 = Product.create({
      id: 'p1',
      name: 'Test Product',
      price: Money.create({ amount: 10, currency: 'USD' }),
      stockLevel: 5
    });
    
    productRepository.save(product1);
    
    // Create service with repositories
    orderService = OrderService.create({
      orderRepository,
      productRepository
    });
  });
  
  it('should create order successfully', async () => {
    // Test logic...
  });
});
```

## Performance Best Practices

### Optimize Aggregate Design for Loading Performance

Design aggregates to load efficiently:

```javascript
// L Inefficient large aggregate with many child entities
const CustomerWithAllOrders = aggregate({
  name: 'Customer',
  schema: z.object({
    id: z.string().uuid(),
    // ...customer fields
    orders: z.array(Order.schema) // L Loading all orders is inefficient
  }),
  // ...
});

//  Efficient aggregate with references
const Customer = aggregate({
  name: 'Customer',
  schema: z.object({
    id: z.string().uuid(),
    // ...customer fields
    // No orders field - orders are loaded separately
  }),
  // ...
});

// Load only what's needed when needed
async function getCustomerWithRecentOrders(customerId) {
  const customer = await customerRepository.findById(customerId);
  const recentOrders = await orderRepository.findMany(
    { customerId: customer.id },
    { sort: { createdAt: 'desc' }, limit: 5 }
  );
  
  return {
    customer,
    recentOrders
  };
}
```

### Use Lazy Loading for Relationships

Implement lazy loading for related objects when possible:

```javascript
const CustomerService = domainService({
  name: 'CustomerService',
  dependencies: {
    customerRepository: 'required',
    orderRepository: 'required'
  },
  methods: {
    async getCustomerById(customerId, { customerRepository, orderRepository }) {
      const customer = await customerRepository.findById(customerId);
      
      // Attach lazy-loading method but don't load orders yet
      customer.getOrders = async () => {
        return orderRepository.findMany({ customerId: customer.id });
      };
      
      return customer;
    }
  }
});

// Usage
const customer = await customerService.getCustomerById('123');
// Orders loaded only when needed
const orders = await customer.getOrders();
```

### Optimize Query Performance with Specifications

Use specifications to create efficient queries:

```javascript
// Define efficient specifications
const RecentOrders = specification({
  name: 'RecentOrders',
  parameters: ['days'],
  isSatisfiedBy: (order, { days }) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return order.createdAt >= cutoff;
  },
  toQuery: ({ days }) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return { 
      createdAt: { $gte: cutoff }
    };
  }
});

const HighValueOrders = specification({
  name: 'HighValueOrders',
  parameters: ['threshold'],
  isSatisfiedBy: (order, { threshold }) => {
    return order.total.amount > threshold;
  },
  toQuery: ({ threshold }) => ({ 
    'total.amount': { $gt: threshold } 
  })
});

// Use specifications for optimized queries
const recentHighValueOrders = await orderRepository.findMany(
  RecentOrders({ days: 30 }).and(HighValueOrders({ threshold: 1000 }))
);
```

## Next Steps

- Read about [Avoiding Anti-Patterns](./antipatterns.md) to learn what NOT to do
- Explore [Extending DomainDrivenJS Components](./extending-components.md) to customize the framework for your needs
- Learn about [Testing in DDD](./testing.md) for comprehensive testing strategies
