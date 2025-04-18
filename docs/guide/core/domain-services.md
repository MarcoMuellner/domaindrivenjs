# Working with Domain Services

Domain services are an essential tactical pattern in Domain-Driven Design that encapsulates operations that don't naturally fit within entities or value objects. They represent important processes or business rules involving multiple domain objects.

## What is a Domain Service?

A domain service is a stateless component that implements business logic or operations that don't conceptually belong to any single entity or value object. Think of a domain service as a coordinator or process manager that orchestrates interactions between multiple domain objects to achieve a specific business outcome.

::: tip Real-world Analogy
Think of a wedding planner. The wedding planner doesn't own the venue, isn't part of the catering staff, and isn't one of the people getting married. Instead, the wedding planner coordinates between all these different parties to orchestrate a successful event. Similarly, a domain service doesn't own any particular data, but coordinates between different domain objects to perform operations that don't naturally belong to any single object. Just as a wedding planner handles processes that involve multiple parties (like scheduling, coordinating vendors, and managing timelines), a domain service handles business processes that involve multiple domain objects.
:::

Key characteristics:
- Represents an operation or process in your domain, not a thing
- Coordinates multiple domain objects to perform business logic
- Is stateless (doesn't maintain its own internal state between operations)
- Named using verbs rather than nouns (e.g., `TransferFunds` rather than `FundsTransferer`)
- Implements domain logic that crosses aggregate boundaries
- Expresses important domain concepts that don't fit naturally in entities or value objects

## Why Use Domain Services?

Domain services offer several benefits:

- **Clear responsibility boundaries**: When logic doesn't naturally belong to a single entity, domain services provide a logical home
- **Avoids "God objects"**: Prevents entities from accumulating too many responsibilities
- **Domain-focused design**: Expresses domain concepts and operations explicitly
- **Preserve encapsulation**: Allows entities and value objects to maintain focused responsibilities
- **Simplify complex interactions**: Orchestrates multi-step processes involving multiple domain objects
- **Business rule centralization**: Provides a natural place for cross-entity business rules

## When to Use Domain Services

::: tip Real-world Analogy
Consider a real estate transaction. Neither the buyer nor the seller handles all the complex legal and financial tasks—instead, they work with a neutral third party (escrow service) that coordinates the process. Similarly, domain services handle operations that don't naturally belong to a single entity, providing a neutral space for coordinating complex business processes.
:::

You should use a domain service when:

- An operation involves multiple aggregates
- The operation doesn't conceptually belong to any entity or value object
- Business rules apply to relationships between different domain objects
- The behavior represents an important domain process or transformation
- Placing the logic in an entity would violate single responsibility principle

Common examples include:
- PaymentProcessor (coordinating between Account, Payment, and Transaction)
- OrderFulfillment (coordinating between Order, Inventory, and Shipping)
- RiskAssessor (analyzing Customer, Order history, and Payment method)

## How Domain Services Work

Domain services act as coordinators between multiple domain objects:

```
┌────────────────┐
│                │
│  Domain Service│
│                │
└───────┬────────┘
        │
        │ coordinates
        │
        ▼
┌──────────────────────────────────────┐
│                                      │
│  ┌──────────┐    ┌──────────┐        │
│  │          │    │          │        │
│  │ Entity A │    │ Entity B │        │
│  │          │    │          │        │
│  └──────────┘    └──────────┘        │
│                                      │
│  ┌──────────┐    ┌──────────┐        │
│  │          │    │          │        │
│  │ Value    │    │ Repository│        │
│  │ Object   │    │          │        │
│  └──────────┘    └──────────┘        │
│                                      │
└──────────────────────────────────────┘
```

A domain service:
1. Receives input parameters (which may include domain objects)
2. Applies business rules and logic
3. May use repositories to retrieve or persist domain objects
4. Coordinates operations across multiple domain objects
5. Returns results (often modified domain objects)

## Creating Domain Services with DomainDrivenJS

::: tip Real-world Analogy
Think of domain services like professional specialists (accountants, lawyers, etc.) who perform specific services but don't own any business assets themselves. You bring them information, they apply their expertise and return results, but they maintain no permanent state of their own. Similarly, domain services apply expertise to domain objects without maintaining their own persistent state.
:::

DomainDrivenJS provides a simple way to create domain services:

```javascript
import { domainService } from 'domaindrivenjs';

// Create a transfer service that moves money between accounts
const FundsTransferService = domainService({
  name: 'FundsTransferService',
  methods: {
    async transfer(sourceAccount, destinationAccount, amount, description) {
      // Validate the transfer
      if (amount.amount <= 0) {
        throw new Error('Transfer amount must be positive');
      }
      
      if (sourceAccount.equals(destinationAccount)) {
        throw new Error('Source and destination accounts must be different');
      }
      
      if (!sourceAccount.canWithdraw(amount)) {
        throw new Error('Insufficient funds');
      }
      
      // Perform the transfer
      const updatedSourceAccount = sourceAccount.withdraw(amount);
      const updatedDestinationAccount = destinationAccount.deposit(amount);
      
      // Create transfer record
      const transfer = Transfer.create({
        id: generateId(),
        sourceAccountId: sourceAccount.id,
        destinationAccountId: destinationAccount.id,
        amount,
        description,
        timestamp: new Date()
      });
      
      // Return the results
      return {
        sourceAccount: updatedSourceAccount,
        destinationAccount: updatedDestinationAccount,
        transfer
      };
    }
  }
});
```

Let's break down the components:

1. **`name`**: A descriptive name for your domain service
2. **`methods`**: Functions that implement the service operations

## Using Domain Services

Domain services are typically injected into application services or controllers:

```javascript
// In an application service or controller
class AccountController {
  constructor(
    accountRepository,
    transferRepository,
    fundsTransferService
  ) {
    this.accountRepository = accountRepository;
    this.transferRepository = transferRepository;
    this.fundsTransferService = fundsTransferService;
  }
  
  async transferFunds(sourceAccountId, destinationAccountId, amount, description) {
    // Get the accounts
    const sourceAccount = await this.accountRepository.findById(sourceAccountId);
    const destinationAccount = await this.accountRepository.findById(destinationAccountId);
    
    if (!sourceAccount || !destinationAccount) {
      throw new Error('Account not found');
    }
    
    // Perform the transfer using the domain service
    const { 
      sourceAccount: updatedSourceAccount,
      destinationAccount: updatedDestinationAccount,
      transfer
    } = await this.fundsTransferService.transfer(
      sourceAccount,
      destinationAccount,
      Money.create({ amount, currency: 'USD' }),
      description
    );
    
    // Save the results
    await this.accountRepository.save(updatedSourceAccount);
    await this.accountRepository.save(updatedDestinationAccount);
    await this.transferRepository.save(transfer);
    
    return transfer;
  }
}
```

Notice that:
1. The domain service focuses on core business logic (the transfer rules)
2. The application service handles transaction concerns, persistence, and input/output mapping
3. The domain service returns modified domain objects without persisting them

## Domain Services vs. Application Services

Understanding the difference between domain services and application services is crucial for clean DDD architecture:

| Aspect | Domain Service | Application Service |
|--------|---------------|---------------------|
| **Layer** | Domain layer | Application layer |
| **Focus** | Domain logic | Use case orchestration |
| **Knowledge** | Knows only about domain model | Knows about domain model and other layers |
| **Responsibilities** | Business rules, domain operations | Transaction management, security, input/output mapping |
| **State** | Stateless | May track state for use case |
| **Dependencies** | Other domain objects | Domain services, repositories, infrastructure services |
| **Named after** | Domain processes | User use cases |
| **Examples** | `PaymentProcessor`, `ShippingCalculator` | `ProcessOrderUseCase`, `UserRegistrationService` |

## Types of Domain Services

There are several common types of domain services:

### Process Services

These services implement a business process that involves multiple domain objects:

```javascript
const OrderProcessingService = domainService({
  name: 'OrderProcessingService',
  methods: {
    async processOrder(order, inventory) {
      // Check if all items are available
      for (const item of order.items) {
        const product = await inventory.findProduct(item.productId);
        if (!product || product.stockLevel < item.quantity) {
          throw new Error(`Product ${item.productId} not available in requested quantity`);
        }
      }
      
      // Reserve the inventory
      const updatedProducts = [];
      for (const item of order.items) {
        const product = await inventory.findProduct(item.productId);
        updatedProducts.push(
          product.decreaseStock(item.quantity)
        );
      }
      
      // Process the payment (could call another domain service)
      const payment = await this.paymentService.processPayment(
        order.customerId,
        order.total,
        `Payment for order ${order.id}`
      );
      
      // Update the order status
      const processedOrder = order.markAsPaid(payment.id);
      
      return {
        order: processedOrder,
        products: updatedProducts,
        payment
      };
    }
  }
});
```

### Calculation Services

These services perform complex calculations involving multiple domain objects:

```javascript
const PricingService = domainService({
  name: 'PricingService',
  methods: {
    calculateOrderTotal(order, pricingRules, customerDiscount) {
      // Start with subtotal
      let subtotal = Money.create({ amount: 0, currency: 'USD' });
      
      // Add each item's price
      for (const item of order.items) {
        const itemTotal = item.unitPrice.multiply(item.quantity);
        subtotal = subtotal.add(itemTotal);
      }
      
      // Apply bulk discounts
      for (const rule of pricingRules.bulkDiscounts) {
        if (this.qualifiesForBulkDiscount(order, rule)) {
          subtotal = subtotal.multiply(1 - rule.discountPercentage);
        }
      }
      
      // Apply customer loyalty discount
      if (customerDiscount > 0) {
        subtotal = subtotal.multiply(1 - customerDiscount);
      }
      
      // Calculate tax
      const taxRate = this.getTaxRateForLocation(order.shippingAddress);
      const tax = subtotal.multiply(taxRate);
      
      // Calculate shipping
      const shipping = this.calculateShippingCost(
        order.items,
        order.shippingMethod,
        order.shippingAddress
      );
      
      // Calculate total
      const total = subtotal.add(tax).add(shipping);
      
      return {
        subtotal,
        tax,
        shipping,
        total
      };
    },
    
    // Helper methods for the calculation
    qualifiesForBulkDiscount(order, rule) {
      // Implementation details...
    },
    
    getTaxRateForLocation(address) {
      // Implementation details...
    },
    
    calculateShippingCost(items, method, address) {
      // Implementation details...
    }
  }
});
```

### Coordination Services

These services coordinate between multiple aggregates:

```javascript
const InventoryAllocationService = domainService({
  name: 'InventoryAllocationService',
  methods: {
    async allocateInventoryForOrders(orders, inventory, priorities) {
      // Sort orders by priority
      const sortedOrders = this.prioritizeOrders(orders, priorities);
      
      // Keep track of allocated inventory
      const allocations = new Map();
      const productAllocations = new Map();
      
      // Process each order
      for (const order of sortedOrders) {
        const orderAllocation = [];
        
        // Try to allocate each item
        for (const item of order.items) {
          const availableQuantity = this.getAvailableQuantity(
            item.productId,
            inventory,
            productAllocations
          );
          
          const allocatedQuantity = Math.min(item.quantity, availableQuantity);
          
          if (allocatedQuantity > 0) {
            // Record the allocation
            orderAllocation.push({
              productId: item.productId,
              quantity: allocatedQuantity
            });
            
            // Update the running total
            const currentAllocation = productAllocations.get(item.productId) || 0;
            productAllocations.set(item.productId, currentAllocation + allocatedQuantity);
          }
        }
        
        // Store the allocation for this order
        allocations.set(order.id, orderAllocation);
      }
      
      return allocations;
    },
    
    // Helper methods
    prioritizeOrders(orders, priorities) {
      // Implementation details...
    },
    
    getAvailableQuantity(productId, inventory, allocations) {
      // Implementation details...
    }
  }
});
```

## Domain Services and Dependencies

::: tip Real-world Analogy
Think of domain services with dependencies like specialized hospital departments. A surgical team needs anesthesiology, nursing, and sterilization services to function effectively. These dependencies are explicit, required, and their absence would prevent the surgery from proceeding safely. Similarly, domain services declare what other services they require to perform their operations properly.
:::

Domain services may depend on other domain services:

```javascript
const OrderFulfillmentService = domainService({
  name: 'OrderFulfillmentService',
  dependencies: {
    inventoryService: 'required',
    shippingService: 'required',
    notificationService: 'optional'
  },
  methods: {
    async fulfillOrder(order, { inventoryService, shippingService, notificationService }) {
      // Check if order can be fulfilled
      if (order.status !== 'PAID') {
        throw new Error('Only paid orders can be fulfilled');
      }
      
      // Allocate inventory
      const allocation = await inventoryService.allocateInventory(order);
      
      if (!allocation.isComplete) {
        throw new Error('Cannot fulfill order due to inventory shortage');
      }
      
      // Create shipment
      const shipment = await shippingService.createShipment(
        order.id,
        order.shippingAddress,
        order.items
      );
      
      // Update order status
      const fulfilledOrder = order.markAsShipped(shipment.trackingNumber);
      
      // Notify customer (if notification service is available)
      if (notificationService) {
        await notificationService.notifyCustomer(
          order.customerId,
          'Your order has shipped!',
          `Your order ${order.id} has been shipped. Tracking number: ${shipment.trackingNumber}`
        );
      }
      
      return {
        order: fulfilledOrder,
        shipment
      };
    }
  }
});

// Using the service with dependencies
const fulfillmentService = OrderFulfillmentService.create({
  inventoryService: InventoryService.create(),
  shippingService: ShippingService.create(),
  notificationService: NotificationService.create()
});
```

## Testing Domain Services

Domain services are easy to test because they're stateless and have explicit dependencies:

```javascript
describe('FundsTransferService', () => {
  test('should transfer funds between accounts', () => {
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
    
    const transferService = FundsTransferService.create();
    
    // Act
    const result = transferService.transfer(
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
  
  test('should throw error if source account has insufficient funds', () => {
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
    
    const transferService = FundsTransferService.create();
    
    // Act & Assert
    expect(() => {
      transferService.transfer(sourceAccount, destinationAccount, amount, 'Test');
    }).toThrow('Insufficient funds');
  });
});
```

You can also mock dependencies when testing domain services with dependencies:

```javascript
describe('OrderFulfillmentService', () => {
  test('should fulfill an order when inventory is available', async () => {
    // Arrange
    const order = Order.create({
      id: 'order-1',
      status: 'PAID',
      // other properties...
    });
    
    const mockInventoryService = {
      allocateInventory: jest.fn().mockResolvedValue({ isComplete: true })
    };
    
    const mockShippingService = {
      createShipment: jest.fn().mockResolvedValue({ 
        trackingNumber: 'TRACK123'
      })
    };
    
    const fulfillmentService = OrderFulfillmentService.create({
      inventoryService: mockInventoryService,
      shippingService: mockShippingService
    });
    
    // Act
    const result = await fulfillmentService.fulfillOrder(order);
    
    // Assert
    expect(mockInventoryService.allocateInventory).toHaveBeenCalledWith(order);
    expect(mockShippingService.createShipment).toHaveBeenCalled();
    expect(result.order.status).toBe('SHIPPED');
    expect(result.order.trackingNumber).toBe('TRACK123');
  });
});
```

## Common Pitfalls

1. **Adding state to domain services**: Domain services should be stateless
2. **Including infrastructure concerns**: Domain services should be pure domain logic, not deal with persistence, messaging, etc.
3. **Anemic domain services**: Services that just pass through to repositories without adding domain logic
4. **Too many responsibilities**: Services that try to do too much instead of focusing on a specific domain process
5. **Application logic leaking in**: Including UI, persistence, or other non-domain concerns in domain services

## Best Practices

1. **Name services after domain processes**: Use verbs and domain terminology
2. **Keep services stateless**: Domain services shouldn't have their own state
3. **Focus on a single responsibility**: Each service should represent one concept
4. **Make dependencies explicit**: Clearly define what each service needs to work
5. **Use immutable parameters and return values**: Don't modify input objects
6. **Document business rules**: Document the business rules implemented by the service
7. **Validate inputs**: Ensure all inputs are valid before processing

## Common Domain Service Examples

| Domain Service | Description | Example Methods |
|---------------|-------------|----------------|
| PaymentProcessor | Handles payment processing | processPayment, refundPayment, authorizePayment |
| PricingEngine | Calculates prices based on rules | calculatePrice, applyDiscount, getPriceWithTax |
| InventoryAllocator | Allocates inventory to orders | allocateInventory, releaseInventory, checkAvailability |
| FraudDetector | Analyzes transactions for fraud | assessRisk, flagSuspiciousActivity, verifyIdentity |
| ReservationService | Manages resource reservations | reserveResource, cancelReservation, extendReservation |
| ShippingCalculator | Determines shipping options | calculateShippingCost, getDeliveryEstimate, validateAddress |
| TaxCalculator | Handles tax calculations | calculateTax, determineJurisdiction, applySalesTax |
| WorkflowEngine | Processes business workflows | progressWorkflow, assignTask, completeStep |

## Next Steps

Now that you understand domain services, you might want to learn about:

- [Aggregates](./aggregates.md) - Clusters of domain objects that are treated as a unit
- [Domain Events](./domain-events.md) - Notifications of significant occurrences in the domain
- [Testing Domain Services](../advanced/testing.md#testing-domain-services) - Advanced techniques for testing domain services
