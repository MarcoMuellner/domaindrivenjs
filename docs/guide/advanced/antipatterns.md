# Domain-Driven Design Anti-Patterns

This guide explores common anti-patterns that can emerge when implementing Domain-Driven Design, compromising the benefits of a clean domain model. Learning to recognize and avoid these patterns will help you build more maintainable systems.

## Anemic Domain Model

An anemic domain model is one of the most prevalent anti-patterns in DDD, where entities and value objects lack behavior and are reduced to data containers.

### Symptoms

- Domain objects contain only getters and setters
- Business logic is located in service classes rather than domain objects
- Domain objects have no invariants or validation rules

### Example

```javascript
// L Anemic domain model (avoid this)
const Order = entity({
  name: 'Order',
  schema: z.object({
    id: z.string(),
    customerId: z.string(),
    status: z.string(),
    items: z.array(OrderItem.schema)
  }),
  identity: 'id',
  methods: {
    // Only getters and setters
    getId() { return this.id; },
    getCustomerId() { return this.customerId; },
    getStatus() { return this.status; },
    getItems() { return this.items; }
  }
});

// Business logic separated in a service
class OrderService {
  placeOrder(order) {
    // Logic that should be in the domain model
    if (order.getItems().length === 0) {
      throw new Error('Order must have at least one item');
    }
    
    const newOrder = Order.create({
      ...order,
      status: 'PLACED'
    });
    
    return newOrder;
  }
}
```

### Better Approach

```javascript
//  Rich domain model with behavior
const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string(),
    customerId: z.string(),
    status: z.enum(['DRAFT', 'PLACED', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    items: z.array(OrderItem.schema)
  }),
  identity: 'id',
  invariants: [
    {
      name: 'order-must-have-items',
      check: (order) => order.items.length > 0,
      message: 'Order must have at least one item'
    }
  ],
  methods: {
    // Business methods that enforce rules
    place() {
      if (this.status !== 'DRAFT') {
        throw new Error('Only draft orders can be placed');
      }
      
      return Order.create({
        ...this,
        status: 'PLACED',
        placedAt: new Date()
      });
    },
    
    cancel(reason) {
      if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(this.status)) {
        throw new Error('Cannot cancel an order that is shipped, delivered, or already cancelled');
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

// The service now coordinates but doesn't contain domain logic
class OrderApplicationService {
  constructor(orderRepository, eventBus) {
    this.orderRepository = orderRepository;
    this.eventBus = eventBus;
  }
  
  async placeOrder(orderId) {
    const order = await this.orderRepository.findById(orderId);
    const placedOrder = order.place();
    await this.orderRepository.save(placedOrder);
    await this.eventBus.publishEvents(placedOrder.domainEvents);
    return placedOrder;
  }
}
```

## God Objects

God objects try to model too much behavior and state in a single aggregate, leading to complexity and tight coupling.

### Symptoms

- Extremely large aggregates containing many entities and value objects
- An aggregate that knows too much about other parts of the system
- Complex dependencies between aggregates
- Difficulty in testing due to the size and complexity

### Example

```javascript
// L God object anti-pattern (avoid this)
const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string(),
    customer: Customer.schema,         // L Entire customer embedded
    items: z.array(OrderItem.schema),
    payment: Payment.schema,           // L Payment belongs in its own aggregate
    shipping: ShippingInfo.schema,     // L Shipping details could be separate
    invoices: z.array(Invoice.schema), // L Invoices belong in billing context
    returns: z.array(Return.schema),   // L Returns could be separate
    // Many more fields...
  }),
  identity: 'id',
  methods: {
    // Too many methods covering too many concerns
    updateCustomerDetails() { /* ... */ },
    processPayment() { /* ... */ },
    generateInvoice() { /* ... */ },
    trackShipment() { /* ... */ },
    initiateReturn() { /* ... */ },
    // Many more methods...
  }
});
```

### Better Approach

```javascript
//  Properly sized aggregates with focused responsibilities
const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string(),
    customerId: z.string(),          //  Just a reference to customer
    customerSnapshot: CustomerSnapshotVO.schema, // Immutable value object with required customer info
    items: z.array(OrderItem.schema),
    status: z.enum(['DRAFT', 'PLACED', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    // Only order-specific fields
  }),
  identity: 'id',
  methods: {
    // Focused methods related to order lifecycle
    place() { /* ... */ },
    pay(paymentDetails) { /* ... */ },
    ship(trackingInfo) { /* ... */ },
    // Only order-specific behavior
  }
});

const Payment = aggregate({
  name: 'Payment',
  schema: z.object({
    id: z.string(),
    orderId: z.string(),             //  Reference to order
    amount: Money.schema,
    method: z.enum(['CREDIT_CARD', 'PAYPAL', 'BANK_TRANSFER']),
    status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']),
    // Payment-specific fields
  }),
  identity: 'id',
  methods: {
    // Payment-specific methods
    complete() { /* ... */ },
    refund() { /* ... */ }
  }
});

// And so on for other aggregates...

// Coordinate the workflow in application services
class OrderFulfillmentService {
  constructor(orderRepository, paymentRepository, shipmentRepository) {
    this.orderRepository = orderRepository;
    this.paymentRepository = paymentRepository;
    this.shipmentRepository = shipmentRepository;
  }
  
  async processOrder(orderId) {
    // Coordinate across aggregates for a specific use case
    // ...
  }
}
```

## Active Record Misuse

Mixing domain logic with persistence concerns violates the separation of concerns principle.

### Symptoms

- Domain objects have save/load/delete methods
- Direct database access in domain entities
- Tight coupling between domain model and database schema

### Example

```javascript
// L Active Record anti-pattern (avoid this)
const Customer = entity({
  name: 'Customer',
  schema: customerSchema,
  identity: 'id',
  methods: {
    // Domain methods mixed with persistence methods
    changeName(newName) {
      return Customer.create({
        ...this,
        name: newName
      });
    },
    
    // Direct database operations in entity
    async save() {
      // Direct database access
      await db.collection('customers').updateOne(
        { id: this.id },
        { $set: this.toJSON() }
      );
      return this;
    },
    
    async delete() {
      await db.collection('customers').deleteOne({ id: this.id });
    }
  }
});

// Usage mixes domain and persistence concerns
const customer = await Customer.findById('123');
const updatedCustomer = customer.changeName('New Name');
await updatedCustomer.save(); // L Persistence logic in domain object
```

### Better Approach

```javascript
//  Separation of domain model and persistence
const Customer = entity({
  name: 'Customer',
  schema: customerSchema,
  identity: 'id',
  methods: {
    // Only domain behavior
    changeName(newName) {
      return Customer.create({
        ...this,
        name: newName
      });
    }
  }
});

// Repository handles persistence concerns
const CustomerRepository = repository({
  name: 'CustomerRepository',
  entity: Customer,
  methods: {
    async findByEmail(email) {
      return this.findOne({ email });
    }
  }
});

// Usage with proper separation of concerns
const customerRepository = CustomerRepository.create(new MongoAdapter(db));
const customer = await customerRepository.findById('123');
const updatedCustomer = customer.changeName('New Name');
await customerRepository.save(updatedCustomer); //  Persistence outside domain object
```

## Transaction Script in Disguise

Using service-oriented design instead of a true domain model, even with DDD terminology.

### Symptoms

- Services contain all the business logic
- Domain objects have little to no behavior
- Logic flows procedurally through service methods

### Example

```javascript
// L Transaction Script disguised as DDD (avoid this)
// Entities without real behavior
const Order = entity({
  name: 'Order',
  schema: orderSchema,
  identity: 'id'
  // No methods or invariants
});

const Payment = entity({
  name: 'Payment',
  schema: paymentSchema,
  identity: 'id'
  // No methods or invariants
});

// Service with all the business logic
class OrderProcessingService {
  constructor(orderRepository, paymentRepository, emailService) {
    this.orderRepository = orderRepository;
    this.paymentRepository = paymentRepository;
    this.emailService = emailService;
  }
  
  async processOrder(orderId, paymentDetails) {
    // Procedural flow with all business logic in the service
    const order = await this.orderRepository.findById(orderId);
    
    // Validation logic that should be in domain model
    if (order.status !== 'NEW') {
      throw new Error('Only new orders can be processed');
    }
    
    // Business logic that should be in domain model
    const paymentAmount = order.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );
    
    // Create payment
    const payment = Payment.create({
      id: generateId(),
      orderId: order.id,
      amount: paymentAmount,
      method: paymentDetails.method,
      status: 'PENDING'
    });
    
    // More business logic in service
    const processedPayment = await this.processPayment(payment, paymentDetails);
    
    // Update order status
    const updatedOrder = Order.create({
      ...order,
      status: processedPayment.status === 'COMPLETED' ? 'PAID' : 'PAYMENT_FAILED'
    });
    
    // Save changes
    await this.orderRepository.save(updatedOrder);
    await this.paymentRepository.save(processedPayment);
    
    // Side effect in service
    await this.emailService.sendPaymentConfirmation(
      order.customerEmail,
      order.id,
      processedPayment
    );
    
    return { order: updatedOrder, payment: processedPayment };
  }
  
  async processPayment(payment, details) {
    // Payment processing logic that should be in domain
    // ...
  }
}
```

### Better Approach

```javascript
//  True domain model with rich behavior
const Order = aggregate({
  name: 'Order',
  schema: orderSchema,
  identity: 'id',
  methods: {
    calculateTotal() {
      return this.items.reduce(
        (sum, item) => sum + item.unitPrice.multiply(item.quantity).amount,
        0
      );
    },
    
    markAsPaid(paymentId) {
      if (this.status !== 'PLACED') {
        throw new Error('Only placed orders can be marked as paid');
      }
      
      const paidOrder = Order.create({
        ...this,
        status: 'PAID',
        paymentId,
        paidAt: new Date()
      });
      
      paidOrder.addDomainEvent({
        type: 'OrderPaid',
        payload: {
          orderId: this.id,
          paymentId,
          amount: this.calculateTotal()
        }
      });
      
      return paidOrder;
    }
  }
});

const Payment = aggregate({
  name: 'Payment',
  schema: paymentSchema,
  identity: 'id',
  methods: {
    process(paymentGateway) {
      if (this.status !== 'PENDING') {
        throw new Error('Only pending payments can be processed');
      }
      
      // Domain logic for payment processing
      const result = paymentGateway.processPayment({
        amount: this.amount,
        method: this.method,
        // Other required details
      });
      
      const processedPayment = Payment.create({
        ...this,
        status: result.success ? 'COMPLETED' : 'FAILED',
        gatewayReference: result.reference,
        processedAt: new Date()
      });
      
      processedPayment.addDomainEvent({
        type: result.success ? 'PaymentSucceeded' : 'PaymentFailed',
        payload: {
          paymentId: this.id,
          orderId: this.orderId,
          amount: this.amount
        }
      });
      
      return processedPayment;
    }
  }
});

// Service coordinates across aggregates but doesn't contain domain logic
class OrderProcessingService {
  constructor(orderRepository, paymentRepository, paymentGateway) {
    this.orderRepository = orderRepository;
    this.paymentRepository = paymentRepository;
    this.paymentGateway = paymentGateway;
  }
  
  async processOrderPayment(orderId, paymentDetails) {
    const order = await this.orderRepository.findById(orderId);
    
    const payment = Payment.create({
      id: generateId(),
      orderId: order.id,
      amount: order.calculateTotal(),
      method: paymentDetails.method,
      status: 'PENDING'
    });
    
    // Process the payment
    const processedPayment = payment.process(this.paymentGateway);
    await this.paymentRepository.save(processedPayment);
    
    if (processedPayment.status === 'COMPLETED') {
      const paidOrder = order.markAsPaid(processedPayment.id);
      await this.orderRepository.save(paidOrder);
      
      // Return the updated state
      return { order: paidOrder, payment: processedPayment };
    }
    
    return { order, payment: processedPayment };
  }
}

// Event handler for side effects
eventBus.subscribe('PaymentSucceeded', async (event) => {
  await emailService.sendPaymentConfirmation(
    event.payload.orderId,
    event.payload.amount
  );
});
```

## Smart UI Anti-Pattern

Skipping the domain model entirely by putting business logic directly in the UI or controller layer.

### Symptoms

- Business logic embedded in UI components or controllers
- Direct database operations from UI layer
- No clear separation between presentation and domain logic

### Example

```javascript
// L Smart UI anti-pattern (avoid this)
// In a React component or Express controller
app.post('/api/orders/:orderId/process-payment', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentMethod, cardDetails } = req.body;
    
    // Direct database access
    const order = await db.collection('orders').findOne({ id: orderId });
    
    // Business logic in controller
    if (order.status !== 'NEW') {
      return res.status(400).json({ error: 'Only new orders can be processed' });
    }
    
    // More business logic
    const total = order.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );
    
    // Payment processing directly in controller
    const paymentResult = await paymentGateway.processPayment({
      amount: total,
      method: paymentMethod,
      cardDetails
    });
    
    // Update database directly
    await db.collection('orders').updateOne(
      { id: orderId },
      { 
        $set: { 
          status: paymentResult.success ? 'PAID' : 'PAYMENT_FAILED',
          paidAt: new Date()
        } 
      }
    );
    
    // Create payment record
    await db.collection('payments').insertOne({
      id: generateId(),
      orderId,
      amount: total,
      method: paymentMethod,
      status: paymentResult.success ? 'COMPLETED' : 'FAILED',
      gatewayReference: paymentResult.reference,
      createdAt: new Date()
    });
    
    // Send email directly from controller
    if (paymentResult.success) {
      await sendEmail(order.customerEmail, 'Payment Successful', 
        `Your payment for order ${orderId} was successful.`);
    }
    
    return res.json({ success: paymentResult.success });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Better Approach

```javascript
//  Proper separation with domain model and application services
// Define domain models with behavior (as shown in previous examples)

// Application service to coordinate the use case
class PaymentService {
  constructor(orderRepository, paymentRepository, paymentGateway, eventBus) {
    this.orderRepository = orderRepository;
    this.paymentRepository = paymentRepository;
    this.paymentGateway = paymentGateway;
    this.eventBus = eventBus;
  }
  
  async processOrderPayment(orderId, paymentDetails) {
    // Application logic coordinates the domain objects
    const order = await this.orderRepository.findById(orderId);
    
    if (!order) {
      throw new ApplicationError('Order not found', 404);
    }
    
    const payment = Payment.create({
      id: generateId(),
      orderId: order.id,
      amount: order.calculateTotal(),
      method: paymentDetails.method,
      status: 'PENDING'
    });
    
    const processedPayment = payment.process(this.paymentGateway);
    await this.paymentRepository.save(processedPayment);
    
    if (processedPayment.status === 'COMPLETED') {
      const paidOrder = order.markAsPaid(processedPayment.id);
      await this.orderRepository.save(paidOrder);
      await this.eventBus.publishEvents([...paidOrder.domainEvents, ...processedPayment.domainEvents]);
    } else {
      await this.eventBus.publishEvents(processedPayment.domainEvents);
    }
    
    return { 
      success: processedPayment.status === 'COMPLETED',
      order,
      payment: processedPayment
    };
  }
}

// Thin controller that delegates to application service
app.post('/api/orders/:orderId/process-payment', async (req, res) => {
  try {
    const { orderId } = req.params;
    const paymentDetails = req.body;
    
    const result = await paymentService.processOrderPayment(orderId, paymentDetails);
    
    return res.json({
      success: result.success,
      orderId: result.order.id,
      status: result.order.status,
      paymentId: result.payment.id
    });
  } catch (error) {
    // Error handling with proper status codes
    if (error instanceof ApplicationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Event handler for side effects
eventBus.subscribe('PaymentSucceeded', async (event) => {
  const order = await orderRepository.findById(event.payload.orderId);
  await emailService.sendPaymentConfirmation(
    order.customerEmail,
    order.id,
    event.payload.amount
  );
});
```

## Repository Misuse

Using repositories incorrectly can lead to performance problems and leaky abstractions.

### Symptoms

- Repositories doing too much (business logic, validation)
- Using repositories for non-aggregate entities
- Inefficient query patterns with N+1 problems
- Too many specialized query methods

### Example

```javascript
// L Repository anti-patterns (avoid these)
const OrderRepository = repository({
  name: 'OrderRepository',
  entity: Order,
  methods: {
    // Too many specific query methods
    async findByCustomerAndStatus(customerId, status) {
      return this.findMany({ customerId, status });
    },
    
    async findByDateRange(start, end) {
      return this.findMany({
        createdAt: { $gte: start, $lte: end }
      });
    },
    
    async findByProduct(productId) {
      return this.findMany({
        'items.productId': productId
      });
    },
    
    // Business logic in repository
    async cancelOrder(orderId, reason) {
      const order = await this.findById(orderId);
      
      // L Business logic belongs in domain model
      if (['SHIPPED', 'DELIVERED'].includes(order.status)) {
        throw new Error('Cannot cancel shipped or delivered orders');
      }
      
      // L Direct updates bypass domain model
      const updatedOrder = Order.create({
        ...order,
        status: 'CANCELLED',
        cancellationReason: reason,
        cancelledAt: new Date()
      });
      
      await this.save(updatedOrder);
      return updatedOrder;
    },
    
    // Repository for a non-aggregate entity
    async findOrderItems(orderId) {
      const order = await this.findById(orderId);
      return order ? order.items : [];
    }
  }
});

// Inefficient querying patterns
async function getCustomerOrderSummary(customerId) {
  const orders = await orderRepository.findByCustomer(customerId);
  
  // N+1 query problem
  const orderDetails = await Promise.all(
    orders.map(async (order) => {
      // L Additional query for each order
      const customer = await customerRepository.findById(order.customerId);
      
      // L More queries for each order
      const payments = await paymentRepository.findByOrderId(order.id);
      const shipments = await shipmentRepository.findByOrderId(order.id);
      
      return {
        order,
        customer,
        payment: payments[0],
        shipment: shipments[0]
      };
    })
  );
  
  return orderDetails;
}
```

### Better Approach

```javascript
//  Proper repository usage
const OrderRepository = repository({
  name: 'OrderRepository',
  entity: Order,
  methods: {
    // Use specifications for queries
    async findBySpecification(specification, options = {}) {
      return this.findMany(specification.toQuery(), options);
    }
  }
});

// Define reusable specifications
const OrdersByCustomer = specification({
  name: 'OrdersByCustomer',
  parameters: ['customerId'],
  isSatisfiedBy: (order, { customerId }) => order.customerId === customerId,
  toQuery: ({ customerId }) => ({ customerId })
});

const OrdersWithStatus = specification({
  name: 'OrdersWithStatus',
  parameters: ['status'],
  isSatisfiedBy: (order, { status }) => order.status === status,
  toQuery: ({ status }) => ({ status })
});

// Domain logic stays in domain model
const Order = aggregate({
  // ...
  methods: {
    cancel(reason) {
      if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(this.status)) {
        throw new Error('Cannot cancel shipped, delivered, or already cancelled orders');
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

// Application service coordinates
class OrderService {
  constructor(orderRepository, customerRepository) {
    this.orderRepository = orderRepository;
    this.customerRepository = customerRepository;
  }
  
  async cancelOrder(orderId, reason) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new ApplicationError('Order not found', 404);
    }
    
    const cancelledOrder = order.cancel(reason);
    await this.orderRepository.save(cancelledOrder);
    return cancelledOrder;
  }
  
  // Efficient querying with joins or pagination
  async getCustomerOrderSummary(customerId, page = 1, pageSize = 10) {
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new ApplicationError('Customer not found', 404);
    }
    
    // Use composition of specifications
    const specification = OrdersByCustomer({ customerId });
    
    // Use proper pagination
    const options = {
      sort: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      limit: pageSize
    };
    
    const orders = await this.orderRepository.findBySpecification(
      specification, 
      options
    );
    
    // Use more efficient batch loading or join queries where available
    return {
      customer,
      orders,
      pagination: {
        page,
        pageSize,
        totalOrders: await this.orderRepository.count(specification.toQuery())
      }
    };
  }
}

// Example usage
const orderService = new OrderService(orderRepository, customerRepository);

// Find active customer orders using specifications
const activeCustomerOrders = await orderRepository.findMany(
  OrdersByCustomer({ customerId: '123' })
    .and(OrdersWithStatus({ status: 'ACTIVE' }))
);
```

## Ignoring Bounded Contexts

Treating your entire application as a single model, ignoring the natural boundaries between different parts of the business.

### Symptoms

- Single, monolithic domain model
- Conflicting terminology and concepts
- Aggregates with inconsistent boundaries
- Difficulty maintaining the model as it grows

### Example

```javascript
// L Single model for everything (avoid this)
// Everything in a single flat structure without boundaries
const User = entity({ /* ... */ });
const Product = entity({ /* ... */ });
const Order = entity({ /* ... */ });
const Payment = entity({ /* ... */ });
const Shipment = entity({ /* ... */ });
const Invoice = entity({ /* ... */ });
const Report = entity({ /* ... */ });
const Notification = entity({ /* ... */ });
// Everything shares the same vocabulary and context
```

### Better Approach

```javascript
//  Proper bounded contexts with clear boundaries

// Sales Context
const salesContext = {
  // Customer has specific meaning in sales context
  Customer: entity({
    name: 'Customer',
    schema: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email(),
      // Sales-specific attributes
      segment: z.enum(['RETAIL', 'WHOLESALE']),
      salesRepId: z.string().optional()
    }),
    // ...
  }),
  
  // Order has sales-specific meaning and behavior
  Order: aggregate({
    name: 'Order',
    schema: z.object({
      id: z.string(),
      customerId: z.string(),
      items: z.array(
        z.object({
          productId: z.string(),
          quantity: z.number(),
          price: z.number(),
          discount: z.number().optional()
        })
      ),
      // Sales-specific concepts
      salesChannel: z.enum(['ONLINE', 'IN_STORE', 'PHONE']),
      // ...
    }),
    // ...
  })
};

// Inventory Context
const inventoryContext = {
  // Product has inventory-specific meaning
  Product: aggregate({
    name: 'Product',
    schema: z.object({
      id: z.string(),
      sku: z.string(),
      name: z.string(),
      // Inventory-specific attributes
      stockLevel: z.number().int().min(0),
      reorderPoint: z.number().int(),
      location: z.string()
    }),
    // Inventory-specific behavior
    methods: {
      reserve(quantity) { /* ... */ },
      restock(quantity) { /* ... */ }
    }
  }),
  
  // StockMovement only exists in inventory context
  StockMovement: entity({
    name: 'StockMovement',
    schema: z.object({
      id: z.string(),
      productId: z.string(),
      type: z.enum(['INBOUND', 'OUTBOUND', 'ADJUSTMENT']),
      quantity: z.number().int(),
      reference: z.string().optional(),
      timestamp: z.date()
    }),
    // ...
  })
};

// Shipping Context
const shippingContext = {
  // Different meaning of customer in shipping context
  DeliveryRecipient: entity({
    name: 'DeliveryRecipient',
    schema: z.object({
      id: z.string(),
      name: z.string(),
      address: ShippingAddress.schema,
      contactPhone: z.string()
      // Shipping-specific attributes
    }),
    // ...
  }),
  
  Shipment: aggregate({
    name: 'Shipment',
    schema: z.object({
      id: z.string(),
      orderReference: z.string(), // Just a reference, not the full order
      status: z.enum(['PENDING', 'PICKED', 'PACKED', 'SHIPPED', 'DELIVERED']),
      carrier: z.string(),
      trackingNumber: z.string().optional(),
      // ...
    }),
    // ...
  })
};

// Anti-corruption layer between contexts
class OrderToShipmentTranslator {
  translateOrderToShipmentRequest(order) {
    return {
      orderReference: order.id,
      recipient: {
        id: order.customerId,
        name: order.shippingAddress.name,
        address: {
          street: order.shippingAddress.street,
          city: order.shippingAddress.city,
          postalCode: order.shippingAddress.postalCode,
          country: order.shippingAddress.country
        },
        contactPhone: order.shippingAddress.phone
      },
      items: order.items.map(item => ({
        productReference: item.productId,
        name: item.name,
        quantity: item.quantity
      }))
    };
  }
}
```

## Over-Engineering

Applying complex DDD patterns when they aren't needed, leading to unnecessary complexity.

### Symptoms

- Complex specifications for simple queries
- Excessive layering and abstraction
- Creating elaborate domain models for simple CRUD operations
- Too many small value objects and entities

### Example

```javascript
// L Over-engineered solution (avoid this)
// Simple email value object with excessive validation
const Email = valueObject({
  name: 'Email',
  schema: z.string().email(),
  validate: (email) => {
    // Overly complex validation
    const emailParts = email.split('@');
    if (emailParts.length !== 2) throw new Error('Invalid email format');
    const [localPart, domain] = emailParts;
    
    if (localPart.length > 64) throw new Error('Local part too long');
    if (domain.length > 255) throw new Error('Domain too long');
    
    // More excessive validation...
  },
  methods: {
    getDomain() {
      return this.value.split('@')[1];
    },
    getLocalPart() {
      return this.value.split('@')[0];
    },
    isGmail() {
      return this.getDomain() === 'gmail.com';
    },
    isYahoo() {
      return this.getDomain() === 'yahoo.com';
    },
    // Many more methods for a simple string
  }
});

// Over-engineered specifications for simple queries
const UserByEmailDomain = specification({
  name: 'UserByEmailDomain',
  parameters: ['domain'],
  isSatisfiedBy: (user, { domain }) => {
    const email = Email.create(user.email);
    return email.getDomain() === domain;
  },
  toQuery: ({ domain }) => ({
    email: { $regex: `@${domain}$` }
  })
});

// Unnecessary service for simple operations
class UserEmailService {
  constructor(userRepository, emailValidationService) {
    this.userRepository = userRepository;
    this.emailValidationService = emailValidationService;
  }
  
  async changeUserEmail(userId, newEmail) {
    const user = await this.userRepository.findById(userId);
    
    // Over-engineered validation process
    const emailValidationResult = await this.emailValidationService.validate(newEmail);
    if (!emailValidationResult.isValid) {
      throw new Error(`Invalid email: ${emailValidationResult.reason}`);
    }
    
    const emailObject = Email.create(newEmail);
    
    // Simple operation with unnecessary complexity
    const updatedUser = user.updateEmail(emailObject);
    await this.userRepository.save(updatedUser);
    
    return updatedUser;
  }
}
```

### Better Approach

```javascript
//  Appropriate level of engineering
// Simple validation using schema
const User = entity({
  name: 'User',
  schema: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    status: z.enum(['ACTIVE', 'INACTIVE'])
  }),
  identity: 'id',
  methods: {
    updateEmail(newEmail) {
      // Simple validation handled by schema
      return User.create({
        ...this,
        email: newEmail,
        updatedAt: new Date()
      });
    }
  }
});

// Simple repository method for common query
const UserRepository = repository({
  name: 'UserRepository',
  entity: User,
  methods: {
    async findByEmail(email) {
      return this.findOne({ email });
    },
    
    async findByEmailDomain(domain) {
      return this.findMany({
        email: { $regex: `@${domain}$` }
      });
    }
  }
});

// Simple use case with appropriate complexity
class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }
  
  async changeUserEmail(userId, newEmail) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if email is already in use
    const existingUser = await this.userRepository.findByEmail(newEmail);
    if (existingUser && existingUser.id !== userId) {
      throw new Error('Email already in use');
    }
    
    const updatedUser = user.updateEmail(newEmail);
    await this.userRepository.save(updatedUser);
    
    return updatedUser;
  }
}
```

## Next Steps

- Learn about [Best Practices](./best-practices.md) to counteract these anti-patterns
- Explore [Testing in DDD](./testing.md) to ensure your domain model works correctly
- Discover how to [Extend Domainify Components](./extending-components.md) for your specific needs