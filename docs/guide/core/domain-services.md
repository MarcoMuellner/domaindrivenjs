# Working with Domain Services

Domain services are an essential tactical pattern in Domain-Driven Design that handles operations that don't naturally fit within a single entity or value object. They represent processes or transformations in your domain that involve multiple domain objects.

## What are Domain Services?

A domain service:
- Represents an operation or process in your domain, not a thing
- Typically orchestrates multiple domain objects to perform business logic
- Is stateless (doesn't maintain its own internal state between operations)
- Captures domain concepts that don't fit naturally in entities or value objects
- Is named using domain terminology and verbs that describe actions

## When to Use Domain Services

You should use a domain service when:
- An operation involves multiple aggregates
- The operation doesn't conceptually belong to any single entity or value object
- The behavior represents an important domain process or transformation
- Business rules apply to the relationship between different domain objects

Common examples include:
- PaymentProcessor (coordinating between Account, Payment, and Transaction)
- OrderFulfillment (coordinating between Order, Inventory, and Shipping)
- RiskAssessor (analyzing Customer, Order history, and Payment method)

## Creating Domain Services with Domainify

Domainify provides a simple way to create domain services:

```javascript
import { domainService } from 'domainify';

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

You can use domain services in your application by injecting them where needed:

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

## Domain Services vs. Application Services

It's important to distinguish domain services from application services:

### Domain Services
- Part of the domain layer
- Implement domain logic and business rules
- Work directly with domain objects
- Named using domain terminology
- Can be used by other domain objects or services

### Application Services
- Part of the application layer
- Orchestrate use cases and workflows
- Handle transaction management
- Convert between domain and DTO objects
- Manage permissions and security concerns
- May use one or more domain services

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

Domain services may depend on other domain services or repositories:

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

## Best Practices

1. **Name services after domain processes**: Use verbs and domain terminology
2. **Keep services stateless**: Domain services shouldn't have their own state
3. **Focus on a single responsibility**: Each service should represent one concept
4. **Make dependencies explicit**: Clearly define what each service needs to work
5. **Use immutable parameters and return values**: Inputs and outputs should be immutable
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

Now that you understand domain services, you should explore some of our [Advanced Topics](/guide/advanced/) to learn more about extending Domainify and applying these patterns in complex domains.