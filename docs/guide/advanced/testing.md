# Testing Domain-Driven Design Applications

Testing is a critical aspect of Domain-Driven Design applications. A well-designed DDD application naturally supports testability through clear separation of concerns, explicit boundaries, and well-defined interfaces. This guide provides comprehensive strategies for testing different aspects of your DDD application using DomainDrivenJS.

## Why Testing is Crucial in DDD

Domain-Driven Design applications benefit from a rigorous testing approach for several reasons:

- **Complex business rules**: DDD applications often model complex domains with intricate business rules
- **Evolving models**: As your understanding of the domain evolves, tests validate that changes don't break existing functionality
- **Multiple stakeholders**: Tests help ensure the application meets the expectations of different stakeholders
- **Long-term maintenance**: Well-tested code is easier to maintain and enhance over time
- **Confidence in refactoring**: Strong test coverage allows for confident refactoring of domain models

## Testing Pyramid for DDD

When testing DDD applications, follow a balanced testing pyramid approach:

```
    ▲
   ╱ ╲     E2E Tests
  ╱   ╲    (Minimal, focus on critical flows)
 ╱     ╲
╱       ╲  Integration Tests
╱         ╲ (Bounded contexts, repositories, services)
╱───────────╲
╱             ╲
╱               ╲ Unit Tests
╱                 ╲ (Domain objects, specifications, services)
╱───────────────────╲
```

- **Unit Tests**: Fast, isolated tests for individual domain objects
- **Integration Tests**: Verify components work together correctly within bounded contexts
- **End-to-End Tests**: Validate that complete business processes function as expected

## Unit Testing Domain Objects

Unit tests verify that individual domain objects behave correctly in isolation.

### Testing Entities

Entities should be tested for correctness of identity, state, and behavior:

```javascript
import { expect, describe, it } from 'vitest';
import { User } from '../src/domain/user/User.js';

describe('User Entity', () => {
  it('should create a valid user', () => {
    const user = User.create({
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      status: 'ACTIVE'
    });
    
    expect(user.id).toBe('123');
    expect(user.email).toBe('test@example.com');
    expect(user.name).toBe('Test User');
    expect(user.status).toBe('ACTIVE');
  });
  
  it('should validate email format', () => {
    expect(() => {
      User.create({
        id: '123',
        email: 'invalid-email',
        name: 'Test User',
        status: 'ACTIVE'
      });
    }).toThrow('Invalid email format');
  });
  
  it('should update name correctly', () => {
    const user = User.create({
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      status: 'ACTIVE'
    });
    
    const updatedUser = user.updateName('New Name');
    
    expect(updatedUser.id).toBe('123'); // identity stays the same
    expect(updatedUser.name).toBe('New Name');
    expect(user.name).toBe('Test User'); // original is immutable
  });
  
  it('should check equality based on ID', () => {
    const user1 = User.create({
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      status: 'ACTIVE'
    });
    
    const user2 = User.create({
      id: '123',
      email: 'different@example.com',
      name: 'Different Name',
      status: 'INACTIVE'
    });
    
    const user3 = User.create({
      id: '456',
      email: 'test@example.com',
      name: 'Test User',
      status: 'ACTIVE'
    });
    
    expect(user1.equals(user2)).toBe(true); // Same ID = same entity
    expect(user1.equals(user3)).toBe(false); // Different ID = different entity
  });
});
```

### Testing Value Objects

Value objects should be tested for immutability, equality based on attributes, and validation:

```javascript
import { expect, describe, it } from 'vitest';
import { Money } from '../src/domain/money/Money.js';

describe('Money Value Object', () => {
  it('should create a valid money object', () => {
    const money = Money.create({ amount: 100, currency: 'USD' });
    
    expect(money.amount).toBe(100);
    expect(money.currency).toBe('USD');
  });
  
  it('should validate the amount is positive', () => {
    expect(() => {
      Money.create({ amount: -50, currency: 'USD' });
    }).toThrow('Amount must be positive');
  });
  
  it('should check equality based on amount and currency', () => {
    const money1 = Money.create({ amount: 100, currency: 'USD' });
    const money2 = Money.create({ amount: 100, currency: 'USD' });
    const money3 = Money.create({ amount: 200, currency: 'USD' });
    const money4 = Money.create({ amount: 100, currency: 'EUR' });
    
    expect(money1.equals(money2)).toBe(true);
    expect(money1.equals(money3)).toBe(false);
    expect(money1.equals(money4)).toBe(false);
  });
  
  it('should add money with same currency', () => {
    const money1 = Money.create({ amount: 100, currency: 'USD' });
    const money2 = Money.create({ amount: 50, currency: 'USD' });
    
    const result = money1.add(money2);
    
    expect(result.amount).toBe(150);
    expect(result.currency).toBe('USD');
    expect(money1.amount).toBe(100); // Original is immutable
    expect(money2.amount).toBe(50); // Original is immutable
  });
  
  it('should throw error when adding different currencies', () => {
    const money1 = Money.create({ amount: 100, currency: 'USD' });
    const money2 = Money.create({ amount: 50, currency: 'EUR' });
    
    expect(() => {
      money1.add(money2);
    }).toThrow('Cannot add money with different currencies');
  });
});
```

### Testing Aggregates

Aggregates should be tested for enforcing invariants and coordination of child entities:

```javascript
import { expect, describe, it } from 'vitest';
import { Order } from '../src/domain/order/Order.js';
import { OrderLine } from '../src/domain/order/OrderLine.js';
import { Money } from '../src/domain/money/Money.js';

describe('Order Aggregate', () => {
  it('should create a valid order', () => {
    const order = Order.create({
      id: 'order-123',
      customerId: 'customer-456',
      status: 'NEW',
      orderLines: []
    });
    
    expect(order.id).toBe('order-123');
    expect(order.customerId).toBe('customer-456');
    expect(order.status).toBe('NEW');
    expect(order.orderLines).toHaveLength(0);
  });
  
  it('should add order lines', () => {
    const order = Order.create({
      id: 'order-123',
      customerId: 'customer-456',
      status: 'NEW',
      orderLines: []
    });
    
    const orderLine = OrderLine.create({
      productId: 'product-789',
      quantity: 2,
      unitPrice: Money.create({ amount: 25, currency: 'USD' })
    });
    
    const updatedOrder = order.addOrderLine(orderLine);
    
    expect(updatedOrder.orderLines).toHaveLength(1);
    expect(updatedOrder.orderLines[0].productId).toBe('product-789');
    expect(updatedOrder.orderLines[0].quantity).toBe(2);
    expect(updatedOrder.orderLines[0].unitPrice.amount).toBe(25);
    expect(order.orderLines).toHaveLength(0); // Original is immutable
  });
  
  it('should calculate total amount', () => {
    const order = Order.create({
      id: 'order-123',
      customerId: 'customer-456',
      status: 'NEW',
      orderLines: [
        OrderLine.create({
          productId: 'product-1',
          quantity: 2,
          unitPrice: Money.create({ amount: 25, currency: 'USD' })
        }),
        OrderLine.create({
          productId: 'product-2',
          quantity: 1,
          unitPrice: Money.create({ amount: 50, currency: 'USD' })
        })
      ]
    });
    
    expect(order.calculateTotal().amount).toBe(100); // (2 * 25) + (1 * 50)
  });
  
  it('should enforce minimum order amount invariant', () => {
    const order = Order.create({
      id: 'order-123',
      customerId: 'customer-456',
      status: 'NEW',
      orderLines: [
        OrderLine.create({
          productId: 'product-1',
          quantity: 1,
          unitPrice: Money.create({ amount: 5, currency: 'USD' })
        })
      ]
    });
    
    expect(() => {
      order.place();
    }).toThrow('Order minimum amount not reached');
    
    const orderWithSufficientAmount = Order.create({
      id: 'order-123',
      customerId: 'customer-456',
      status: 'NEW',
      orderLines: [
        OrderLine.create({
          productId: 'product-1',
          quantity: 5,
          unitPrice: Money.create({ amount: 20, currency: 'USD' })
        })
      ]
    });
    
    const placedOrder = orderWithSufficientAmount.place();
    expect(placedOrder.status).toBe('PLACED');
  });
});
```

## Testing Specifications

Specifications should be thoroughly tested to ensure they correctly implement business rules:

```javascript
import { expect, describe, it } from 'vitest';
import { ActiveUserSpecification } from '../src/domain/user/specifications/ActiveUserSpecification.js';
import { PremiumUserSpecification } from '../src/domain/user/specifications/PremiumUserSpecification.js';
import { User } from '../src/domain/user/User.js';

describe('User Specifications', () => {
  const activeUserSpec = ActiveUserSpecification;
  const premiumUserSpec = PremiumUserSpecification;
  
  it('should identify active users', () => {
    const activeUser = User.create({
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      status: 'ACTIVE'
    });
    
    const inactiveUser = User.create({
      id: '456',
      email: 'inactive@example.com',
      name: 'Inactive User',
      status: 'INACTIVE'
    });
    
    expect(activeUserSpec.isSatisfiedBy(activeUser)).toBe(true);
    expect(activeUserSpec.isSatisfiedBy(inactiveUser)).toBe(false);
  });
  
  it('should identify premium users', () => {
    const premiumUser = User.create({
      id: '123',
      email: 'premium@example.com',
      name: 'Premium User',
      status: 'ACTIVE',
      accountType: 'PREMIUM'
    });
    
    const regularUser = User.create({
      id: '456',
      email: 'regular@example.com',
      name: 'Regular User',
      status: 'ACTIVE',
      accountType: 'REGULAR'
    });
    
    expect(premiumUserSpec.isSatisfiedBy(premiumUser)).toBe(true);
    expect(premiumUserSpec.isSatisfiedBy(regularUser)).toBe(false);
  });
  
  it('should compose specifications', () => {
    const activePremiumUserSpec = activeUserSpec.and(premiumUserSpec);
    
    const activePremiumUser = User.create({
      id: '123',
      email: 'premium@example.com',
      name: 'Active Premium User',
      status: 'ACTIVE',
      accountType: 'PREMIUM'
    });
    
    const inactivePremiumUser = User.create({
      id: '456',
      email: 'inactive@example.com',
      name: 'Inactive Premium User',
      status: 'INACTIVE',
      accountType: 'PREMIUM'
    });
    
    const activeRegularUser = User.create({
      id: '789',
      email: 'regular@example.com',
      name: 'Active Regular User',
      status: 'ACTIVE',
      accountType: 'REGULAR'
    });
    
    expect(activePremiumUserSpec.isSatisfiedBy(activePremiumUser)).toBe(true);
    expect(activePremiumUserSpec.isSatisfiedBy(inactivePremiumUser)).toBe(false);
    expect(activePremiumUserSpec.isSatisfiedBy(activeRegularUser)).toBe(false);
  });
  
  it('should generate correct query from specification', () => {
    const activeUserQuery = activeUserSpec.toQuery();
    expect(activeUserQuery).toEqual({ status: 'ACTIVE' });
    
    const premiumUserQuery = premiumUserSpec.toQuery();
    expect(premiumUserQuery).toEqual({ accountType: 'PREMIUM' });
    
    const activePremiumUserQuery = activeUserSpec.and(premiumUserSpec).toQuery();
    expect(activePremiumUserQuery).toEqual({
      $and: [
        { status: 'ACTIVE' },
        { accountType: 'PREMIUM' }
      ]
    });
  });
});
```

## Testing Domain Services

Domain services should be tested for business logic and coordination of entities:

```javascript
import { expect, describe, it, vi } from 'vitest';
import { FundsTransferService } from '../src/domain/banking/FundsTransferService.js';
import { Account } from '../src/domain/banking/Account.js';
import { Money } from '../src/domain/money/Money.js';

describe('FundsTransferService', () => {
  it('should transfer funds between accounts', () => {
    // Arrange
    const sourceAccount = Account.create({
      id: 'account-1',
      balance: Money.create({ amount: 100, currency: 'USD' }),
      status: 'ACTIVE'
    });
    
    const destinationAccount = Account.create({
      id: 'account-2',
      balance: Money.create({ amount: 50, currency: 'USD' }),
      status: 'ACTIVE'
    });
    
    const amount = Money.create({ amount: 25, currency: 'USD' });
    const description = 'Test transfer';
    
    const fundsTransferService = FundsTransferService.create();
    
    // Act
    const result = fundsTransferService.transfer(
      sourceAccount,
      destinationAccount,
      amount,
      description
    );
    
    // Assert
    expect(result.sourceAccount.balance.amount).toBe(75);
    expect(result.destinationAccount.balance.amount).toBe(75);
    expect(result.transfer.amount.amount).toBe(25);
    expect(result.transfer.sourceAccountId).toBe('account-1');
    expect(result.transfer.destinationAccountId).toBe('account-2');
    expect(result.transfer.description).toBe('Test transfer');
  });
  
  it('should throw error for insufficient funds', () => {
    // Arrange
    const sourceAccount = Account.create({
      id: 'account-1',
      balance: Money.create({ amount: 20, currency: 'USD' }),
      status: 'ACTIVE'
    });
    
    const destinationAccount = Account.create({
      id: 'account-2',
      balance: Money.create({ amount: 50, currency: 'USD' }),
      status: 'ACTIVE'
    });
    
    const amount = Money.create({ amount: 25, currency: 'USD' });
    const description = 'Test transfer';
    
    const fundsTransferService = FundsTransferService.create();
    
    // Act & Assert
    expect(() => {
      fundsTransferService.transfer(
        sourceAccount,
        destinationAccount,
        amount,
        description
      );
    }).toThrow('Insufficient funds');
  });
  
  it('should handle dependencies and optional services', async () => {
    // Arrange
    const order = { id: 'order-123', status: 'PAID' };
    
    // Define mock services using DomainDrivenJS's domain service pattern
    const MockInventoryService = domainService({
      name: 'MockInventoryService',
      methods: {
        allocateInventory: vi.fn().mockResolvedValue({ isComplete: true })
      }
    });
    
    const MockShippingService = domainService({
      name: 'MockShippingService',
      methods: {
        createShipment: vi.fn().mockResolvedValue({
          trackingNumber: 'TRACK123'
        })
      }
    });
    
    const MockNotificationService = domainService({
      name: 'MockNotificationService',
      methods: {
        notifyCustomer: vi.fn()
      }
    });
    
    // Create service instances
    const mockInventoryService = MockInventoryService.create();
    const mockShippingService = MockShippingService.create();
    const mockNotificationService = MockNotificationService.create();
    
    // Create domain service with dependencies
    const OrderFulfillmentService = domainService({
      name: 'OrderFulfillmentService',
      dependencies: {
        inventoryService: 'required',
        shippingService: 'required',
        notificationService: 'optional'
      },
      methods: {
        async fulfillOrder(order, { inventoryService, shippingService, notificationService }) {
          // Implementation...
          await inventoryService.allocateInventory(order);
          const shipment = await shippingService.createShipment(order.id, {}, []);
          if (notificationService) {
            await notificationService.notifyCustomer();
          }
          return { 
            order: { ...order, status: 'SHIPPED', trackingNumber: shipment.trackingNumber },
            shipment 
          };
        }
      }
    });
    
    const orderFulfillmentService = OrderFulfillmentService.create({
      inventoryService: mockInventoryService,
      shippingService: mockShippingService,
      notificationService: mockNotificationService
    });
    
    // Act
    const result = await orderFulfillmentService.fulfillOrder(order);
    
    // Assert
    expect(mockInventoryService.allocateInventory).toHaveBeenCalledWith(order);
    expect(mockShippingService.createShipment).toHaveBeenCalled();
    expect(mockNotificationService.notifyCustomer).toHaveBeenCalled();
    expect(result.order.status).toBe('SHIPPED');
  });
});
```

## Testing Repositories

Repositories should be tested with mock adapters to verify query and persistence logic:

```javascript
import { expect, describe, it, beforeEach } from 'vitest';
import { UserRepository } from '../src/domain/user/UserRepository.js';
import { User } from '../src/domain/user/User.js';
import { InMemoryAdapter } from 'domaindrivenjs/adapters';

describe('UserRepository', () => {
  let userRepository;
  
  beforeEach(() => {
    // Create a fresh in-memory repository for each test
    userRepository = UserRepository.create(new InMemoryAdapter());
  });
  
  it('should save and retrieve a user', async () => {
    // Arrange
    const user = User.create({
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      status: 'ACTIVE'
    });
    
    // Act
    await userRepository.save(user);
    const retrievedUser = await userRepository.findById('123');
    
    // Assert
    expect(retrievedUser).not.toBeNull();
    expect(retrievedUser.id).toBe('123');
    expect(retrievedUser.email).toBe('test@example.com');
  });
  
  it('should find users by criteria', async () => {
    // Arrange
    const activeUser = User.create({
      id: '123',
      email: 'active@example.com',
      name: 'Active User',
      status: 'ACTIVE'
    });
    
    const inactiveUser = User.create({
      id: '456',
      email: 'inactive@example.com',
      name: 'Inactive User',
      status: 'INACTIVE'
    });
    
    await userRepository.save(activeUser);
    await userRepository.save(inactiveUser);
    
    // Act
    const activeUsers = await userRepository.findMany({ status: 'ACTIVE' });
    
    // Assert
    expect(activeUsers).toHaveLength(1);
    expect(activeUsers[0].id).toBe('123');
  });
  
  it('should work with specifications', async () => {
    // Arrange
    const activeUser = User.create({
      id: '123',
      email: 'active@example.com',
      name: 'Active User',
      status: 'ACTIVE'
    });
    
    const inactiveUser = User.create({
      id: '456',
      email: 'inactive@example.com',
      name: 'Inactive User',
      status: 'INACTIVE'
    });
    
    await userRepository.save(activeUser);
    await userRepository.save(inactiveUser);
    
    const activeUserSpec = ActiveUserSpecification;
    
    // Act
    const activeUsers = await userRepository.findMany(activeUserSpec);
    
    // Assert
    expect(activeUsers).toHaveLength(1);
    expect(activeUsers[0].id).toBe('123');
  });
  
  it('should update a user', async () => {
    // Arrange
    const user = User.create({
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      status: 'ACTIVE'
    });
    
    await userRepository.save(user);
    
    // Act
    await userRepository.update('123', { name: 'Updated Name' });
    const updatedUser = await userRepository.findById('123');
    
    // Assert
    expect(updatedUser.name).toBe('Updated Name');
    expect(updatedUser.email).toBe('test@example.com'); // Other fields unchanged
  });
  
  it('should delete a user', async () => {
    // Arrange
    const user = User.create({
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      status: 'ACTIVE'
    });
    
    await userRepository.save(user);
    
    // Act
    await userRepository.delete('123');
    const deletedUser = await userRepository.findById('123');
    
    // Assert
    expect(deletedUser).toBeNull();
  });
});
```

## Testing Domain Events

Domain events should be tested for correct behavior and handling:

```javascript
import { expect, describe, it, vi } from 'vitest';
import { Order } from '../src/domain/order/Order.js';
import { eventBus } from '../src/infrastructure/eventBus.js';

describe('Order Domain Events', () => {
  it('should emit OrderPlaced event when order is placed', () => {
    // Arrange
    const orderPlacedHandler = vi.fn();
    eventBus.subscribe('OrderPlaced', orderPlacedHandler);
    
    const order = Order.create({
      id: 'order-123',
      customerId: 'customer-456',
      status: 'NEW',
      orderLines: [
        OrderLine.create({
          productId: 'product-1',
          quantity: 5,
          unitPrice: Money.create({ amount: 20, currency: 'USD' })
        })
      ]
    });
    
    // Act
    const placedOrder = order.place();
    eventBus.publishEvents(placedOrder.domainEvents);
    
    // Assert
    expect(orderPlacedHandler).toHaveBeenCalledTimes(1);
    expect(orderPlacedHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'OrderPlaced',
        payload: expect.objectContaining({
          orderId: 'order-123',
          customerId: 'customer-456',
          total: expect.any(Object)
        })
      })
    );
  });
  
  it('should not emit events for failed operations', () => {
    // Arrange
    const orderPlacedHandler = vi.fn();
    eventBus.subscribe('OrderPlaced', orderPlacedHandler);
    
    const order = Order.create({
      id: 'order-123',
      customerId: 'customer-456',
      status: 'NEW',
      orderLines: [
        OrderLine.create({
          productId: 'product-1',
          quantity: 1,
          unitPrice: Money.create({ amount: 5, currency: 'USD' })
        })
      ]
    });
    
    // Act & Assert
    expect(() => {
      order.place(); // Should fail due to minimum order amount
    }).toThrow('Order minimum amount not reached');
    
    expect(orderPlacedHandler).not.toHaveBeenCalled();
  });
});
```

## Integration Testing

Integration tests verify that components work together correctly:

```javascript
import { expect, describe, it, beforeEach } from 'vitest';
import { domainService } from 'domaindrivenjs';
import { OrderRepository } from '../src/domain/order/OrderRepository.js';
import { ProductRepository } from '../src/domain/product/ProductRepository.js';
import { CustomerRepository } from '../src/domain/customer/CustomerRepository.js';
import { InMemoryAdapter } from 'domaindrivenjs/adapters';

describe('Order Service Integration', () => {
  let orderRepository;
  let productRepository;
  let customerRepository;
  let orderService;
  
  beforeEach(async () => {
    // Set up repositories with in-memory adapters
    orderRepository = OrderRepository.create(new InMemoryAdapter());
    productRepository = ProductRepository.create(new InMemoryAdapter());
    customerRepository = CustomerRepository.create(new InMemoryAdapter());
    
    // Set up products
    await productRepository.save(Product.create({
      id: 'product-1',
      name: 'Test Product',
      price: Money.create({ amount: 50, currency: 'USD' }),
      stockLevel: 100
    }));
    
    // Set up customer
    await customerRepository.save(Customer.create({
      id: 'customer-1',
      name: 'Test Customer',
      email: 'customer@example.com',
      status: 'ACTIVE'
    }));
    
    // Create service with DomainDrivenJS domain service pattern
    const OrderService = domainService({
      name: 'OrderService',
      dependencies: {
        orderRepository: 'required',
        productRepository: 'required',
        customerRepository: 'required'
      },
      methods: {
        async placeOrder(orderData, { orderRepository, productRepository, customerRepository }) {
          // Implementation for placing an order
          const { customerId, orderLines } = orderData;
          
          // Verify customer exists
          const customer = await customerRepository.findById(customerId);
          if (!customer) {
            throw new Error('Customer not found');
          }
          
          // Verify products and stock
          for (const line of orderLines) {
            const product = await productRepository.findById(line.productId);
            if (!product || product.stockLevel < line.quantity) {
              throw new Error(`Insufficient stock for ${line.productId}`);
            }
          }
          
          // Create order
          const order = Order.create({
            id: generateId(),
            customerId,
            orderLines: orderLines.map(line => OrderLine.create({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: (await productRepository.findById(line.productId)).price
            })),
            status: 'PLACED',
            placedAt: new Date()
          });
          
          // Save order
          await orderRepository.save(order);
          
          // Update product stock
          for (const line of orderLines) {
            const product = await productRepository.findById(line.productId);
            await productRepository.update(line.productId, {
              stockLevel: product.stockLevel - line.quantity
            });
          }
          
          return order;
        }
      }
    });
    
    orderService = OrderService.create({
      orderRepository,
      productRepository,
      customerRepository
    });
  });
  
  it('should place an order for a customer', async () => {
    // Arrange
    const orderData = {
      customerId: 'customer-1',
      orderLines: [
        { productId: 'product-1', quantity: 2 }
      ]
    };
    
    // Act
    const orderResult = await orderService.placeOrder(orderData);
    
    // Assert
    expect(orderResult.id).toBeDefined();
    expect(orderResult.status).toBe('PLACED');
    
    // Verify order was saved
    const savedOrder = await orderRepository.findById(orderResult.id);
    expect(savedOrder).not.toBeNull();
    expect(savedOrder.customerId).toBe('customer-1');
    expect(savedOrder.orderLines).toHaveLength(1);
    expect(savedOrder.orderLines[0].productId).toBe('product-1');
    expect(savedOrder.orderLines[0].quantity).toBe(2);
    
    // Verify stock was updated
    const updatedProduct = await productRepository.findById('product-1');
    expect(updatedProduct.stockLevel).toBe(98);
  });
  
  it('should reject an order when product is out of stock', async () => {
    // Arrange
    await productRepository.update('product-1', { stockLevel: 1 });
    
    const orderData = {
      customerId: 'customer-1',
      orderLines: [
        { productId: 'product-1', quantity: 2 }
      ]
    };
    
    // Act & Assert
    await expect(
      orderService.placeOrder(orderData)
    ).rejects.toThrow('Insufficient stock for product-1');
    
    // Verify no order was created
    const allOrders = await orderRepository.findMany({});
    expect(allOrders).toHaveLength(0);
    
    // Verify stock wasn't changed
    const product = await productRepository.findById('product-1');
    expect(product.stockLevel).toBe(1);
  });
});
```

## Testing Bounded Contexts

Test how different bounded contexts interact through anti-corruption layers:

```javascript
import { expect, describe, it } from 'vitest';
import { domainService } from 'domaindrivenjs';
import { ShippingRepository } from '../src/shipping/domain/ShippingRepository.js';
import { InMemoryAdapter } from 'domaindrivenjs/adapters';

describe('Shipping and Order Context Integration', () => {
  it('should create shipment based on order data', async () => {
    // Arrange
    const shippingRepository = ShippingRepository.create(new InMemoryAdapter());
    
    // Mock order context facade using DomainDrivenJS domain service
    const OrderFacade = domainService({
      name: 'OrderFacade',
      methods: {
        async getOrderDetails(orderId) {
          return {
            id: orderId,
            customerAddress: {
              street: '123 Main St',
              city: 'Anytown',
              state: 'CA',
              postalCode: '94000',
              country: 'US'
            },
            items: [
              { productId: 'product-1', name: 'Test Product', quantity: 2 }
            ],
            status: 'PAID'
          };
        }
      }
    });
    
    // Create the shipping service using DomainDrivenJS domain service
    const ShippingService = domainService({
      name: 'ShippingService',
      dependencies: {
        shippingRepository: 'required',
        orderFacade: 'required'
      },
      methods: {
        async createShipmentForOrder(orderId, { shippingRepository, orderFacade }) {
          // Get order details from the order context
          const orderDetails = await orderFacade.getOrderDetails(orderId);
          
          // Create a shipment in the shipping context
          const shipment = Shipment.create({
            id: generateId(),
            orderId: orderDetails.id,
            address: ShippingAddress.create(orderDetails.customerAddress),
            items: orderDetails.items.map(item => ShipmentItem.create({
              productId: item.productId,
              productName: item.name,
              quantity: item.quantity
            })),
            status: 'PENDING',
            createdAt: new Date()
          });
          
          // Save the shipment
          await shippingRepository.save(shipment);
          
          return shipment;
        }
      }
    });
    
    const orderFacade = OrderFacade.create();
    const shippingService = ShippingService.create({
      shippingRepository,
      orderFacade
    });
    
    // Act
    const shipment = await shippingService.createShipmentForOrder('order-123');
    
    // Assert
    expect(shipment.id).toBeDefined();
    expect(shipment.orderId).toBe('order-123');
    expect(shipment.address.street).toBe('123 Main St');
    expect(shipment.items).toHaveLength(1);
    expect(shipment.status).toBe('PENDING');
    
    // Verify shipment was saved
    const savedShipment = await shippingRepository.findById(shipment.id);
    expect(savedShipment).not.toBeNull();
  });
});
```

## Testing with Mocks vs. Stubs vs. Fakes

Choose the right testing double for each situation:

- **Mocks**: Use for verifying interactions
  ```javascript
  // Using DomainDrivenJS domain service for mocks
  const MockPaymentGateway = domainService({
    name: 'MockPaymentGateway',
    methods: {
      processPayment: vi.fn().mockResolvedValue({
        success: true,
        reference: 'payment-123'
      })
    }
  });
  
  const mockPaymentGateway = MockPaymentGateway.create();
  ```

- **Stubs**: Use for specific predetermined behavior
  ```javascript
  // Using DomainDrivenJS domain service for stubs
  const StubEventBus = domainService({
    name: 'StubEventBus',
    methods: {
      publishEvents: () => Promise.resolve()
    }
  });
  
  const stubEventBus = StubEventBus.create();
  ```

- **Fakes**: Use for working implementations (like in-memory repositories)
  ```javascript
  const fakeRepository = UserRepository.create(new InMemoryAdapter());
  ```

## Test Fixture Patterns

Create reusable test fixtures for common domain objects:

```javascript
// fixtures/users.js
export const createTestUser = (overrides = {}) => {
  return User.create({
    id: 'test-id',
    email: 'test@example.com',
    name: 'Test User',
    status: 'ACTIVE',
    ...overrides
  });
};

// fixtures/orders.js
export const createTestOrder = (overrides = {}) => {
  return Order.create({
    id: 'test-order',
    customerId: 'test-customer',
    status: 'NEW',
    orderLines: [],
    ...overrides
  });
};

// In your tests
import { createTestUser } from '../fixtures/users.js';
import { createTestOrder } from '../fixtures/orders.js';

describe('UserService', () => {
  it('should update user profile', async () => {
    const user = createTestUser({ name: 'Original Name' });
    // Test with the fixture
  });
});
```

## Snapshot Testing

Use snapshot testing for complex domain objects:

```javascript
import { expect, describe, it } from 'vitest';
import { Order } from '../src/domain/order/Order.js';
import { createTestOrder } from '../fixtures/orders.js';

describe('Order Snapshots', () => {
  it('should match snapshot for new order', () => {
    const order = createTestOrder();
    expect(order).toMatchSnapshot();
  });
  
  it('should match snapshot after adding order lines', () => {
    const order = createTestOrder();
    const updatedOrder = order.addOrderLine(
      OrderLine.create({
        productId: 'product-1',
        quantity: 2,
        unitPrice: Money.create({ amount: 25, currency: 'USD' })
      })
    );
    expect(updatedOrder).toMatchSnapshot();
  });
  
  it('should match snapshot for placed order', () => {
    const order = createTestOrder({
      orderLines: [
        OrderLine.create({
          productId: 'product-1',
          quantity: 5,
          unitPrice: Money.create({ amount: 20, currency: 'USD' })
        })
      ]
    });
    const placedOrder = order.place();
    expect(placedOrder).toMatchSnapshot();
  });
});
```

## Property-Based Testing

Use property-based testing to verify invariants across a range of inputs:

```javascript
import { expect, describe, it } from 'vitest';
import { fc } from 'fast-check';
import { Money } from '../src/domain/money/Money.js';

describe('Money Value Object Properties', () => {
  it('should maintain associativity for addition', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        (a, b, c) => {
          const moneyA = Money.create({ amount: a, currency: 'USD' });
          const moneyB = Money.create({ amount: b, currency: 'USD' });
          const moneyC = Money.create({ amount: c, currency: 'USD' });
          
          // (A + B) + C = A + (B + C)
          const left = moneyA.add(moneyB).add(moneyC);
          const right = moneyA.add(moneyB.add(moneyC));
          
          return left.equals(right);
        }
      )
    );
  });
  
  it('should maintain commutativity for addition', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        (a, b) => {
          const moneyA = Money.create({ amount: a, currency: 'USD' });
          const moneyB = Money.create({ amount: b, currency: 'USD' });
          
          // A + B = B + A
          return moneyA.add(moneyB).equals(moneyB.add(moneyA));
        }
      )
    );
  });
});
```

## Performance Testing

Test performance-critical parts of your domain model:

```javascript
import { expect, describe, it } from 'vitest';
import { domainService } from 'domaindrivenjs';

describe('InventoryAllocationService Performance', () => {
  it('should allocate inventory efficiently for many orders', async () => {
    // Arrange
    const InventoryAllocationService = domainService({
      name: 'InventoryAllocationService',
      methods: {
        async allocateInventoryForOrders(orders, inventory, priorities) {
          // Implementation...
          // This would be the actual implementation from your domain service
          return new Map(orders.map(order => [order.id, []]));
        }
      }
    });
    
    const inventoryService = InventoryAllocationService.create();
    const orders = generateLargeOrderSet(1000); // Helper to create many orders
    const inventory = createTestInventory();
    const priorities = createTestPriorities();
    
    // Act
    const startTime = performance.now();
    const allocations = await inventoryService.allocateInventoryForOrders(
      orders, inventory, priorities
    );
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Assert
    expect(duration).toBeLessThan(200); // Should complete in under 200ms
    expect(allocations.size).toBe(orders.length);
  });
});
```

## End-to-End Testing

Create minimal end-to-end tests for critical business flows:

```javascript
import { expect, describe, it } from 'vitest';
import { setupTestApp } from '../test-utils/app-setup.js';
import { setupTestDatabase } from '../test-utils/db-setup.js';

describe('E2E: Place Order and Fulfill', () => {
  let app;
  let db;
  let testApiClient;
  
  beforeAll(async () => {
    db = await setupTestDatabase();
    app = await setupTestApp(db);
    testApiClient = createTestApiClient(app);
    
    // Seed necessary data
    await seedTestProducts(db);
    await seedTestCustomers(db);
  });
  
  afterAll(async () => {
    await db.cleanup();
    await app.close();
  });
  
  it('should successfully place and fulfill an order', async () => {
    // 1. Place an order
    const orderResponse = await testApiClient.post('/api/orders', {
      customerId: 'test-customer-1',
      items: [
        { productId: 'test-product-1', quantity: 2 }
      ],
      shippingAddress: {
        street: '123 Test St',
        city: 'Test City',
        country: 'US'
      }
    });
    
    expect(orderResponse.status).toBe(201);
    const orderId = orderResponse.data.id;
    
    // 2. Make payment
    const paymentResponse = await testApiClient.post(`/api/orders/${orderId}/payments`, {
      paymentMethod: 'CREDIT_CARD',
      amount: orderResponse.data.total
    });
    
    expect(paymentResponse.status).toBe(200);
    
    // 3. Verify order status updated
    const orderCheckResponse = await testApiClient.get(`/api/orders/${orderId}`);
    expect(orderCheckResponse.data.status).toBe('PAID');
    
    // 4. Trigger fulfillment
    const fulfillResponse = await testApiClient.post(`/api/orders/${orderId}/fulfill`);
    expect(fulfillResponse.status).toBe(200);
    
    // 5. Verify shipment created
    const shipmentResponse = await testApiClient.get(`/api/shipments?orderId=${orderId}`);
    expect(shipmentResponse.data).toHaveLength(1);
    expect(shipmentResponse.data[0].status).toBe('READY');
    
    // 6. Check final order status
    const finalOrderResponse = await testApiClient.get(`/api/orders/${orderId}`);
    expect(finalOrderResponse.data.status).toBe('FULFILLED');
  });
});
```

## Best Practices

1. **Focus on domain behavior**: Test business rules and domain logic thoroughly
2. **Isolate tests**: Keep unit tests isolated with proper mocking
3. **Use realistic data**: Create test data that resembles real-world scenarios
4. **Test failure cases**: Validate error handling and boundary conditions
5. **Avoid testing implementation details**: Focus on behavior not implementation
6. **Organize tests by domain concepts**: Mirror your domain structure in tests
7. **Use test fixtures**: Create reusable test data builders
8. **Mind performance**: Keep tests fast, especially unit tests
9. **Continuously evolve tests**: Update tests as your domain model evolves

## Next Steps

- Explore [Domain Event Testing](./domain-events.md) for advanced event-driven architectures
- Learn about [Testing Aggregates](./aggregates.md) for complex business rules
- Discover [Performance Testing](./performance.md) for scalable domain models
