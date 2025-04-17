# Working with Domain Services in domaindrivenjs

Domain Services are a fundamental building block in Domain-Driven Design (DDD). This guide explains how to create and use domain services effectively in your domain model with domaindrivenjs.

## What are Domain Services?

In Domain-Driven Design, domain services represent operations, processes, or transformations in your domain that don't naturally belong to a specific entity or value object. They encapsulate domain logic that spans multiple domain objects or represents stateless operations.

Key characteristics:

- **Stateless operations** - They don't maintain their own state
- **Domain logic that spans multiple objects** - Operations that work across aggregates
- **Process-oriented** - Represent activities rather than things
- **Named after domain processes** - Use verbs or noun-verb combinations
- **Part of the domain model** - Not application or infrastructure concerns

## Creating Domain Services

The core of domaindrivenjs's domain service implementation is the `domainService` factory function:

```javascript
import { domainService } from "domaindrivenjs";

const PaymentProcessor = domainService({
  name: "PaymentProcessor",

  // Dependencies this service requires
  dependencies: {
    accountRepository: null, // Will be injected at runtime
    paymentGateway: null, // Will be injected at runtime
  },

  // Domain service operations
  operations: {
    async transferFunds(sourceAccountId, destinationAccountId, amount) {
      // Get the dependencies
      const { accountRepository } = this.dependencies;

      // Load the aggregates
      const sourceAccount = await accountRepository.findById(sourceAccountId);
      const destinationAccount =
        await accountRepository.findById(destinationAccountId);

      if (!sourceAccount || !destinationAccount) {
        return { success: false, error: "One or both accounts not found" };
      }

      // Execute domain logic
      if (sourceAccount.balance < amount) {
        return { success: false, error: "Insufficient funds" };
      }

      // Update aggregates using their methods (maintaining immutability)
      const updatedSourceAccount = {
        ...sourceAccount,
        balance: sourceAccount.balance - amount,
      };

      const updatedDestinationAccount = {
        ...destinationAccount,
        balance: destinationAccount.balance + amount,
      };

      // Save updated aggregates
      await accountRepository.save(updatedSourceAccount);
      await accountRepository.save(updatedDestinationAccount);

      return {
        success: true,
        data: { transferredAmount: amount },
      };
    },

    calculateFee(amount, accountType) {
      // Pure domain logic
      if (accountType === "PREMIUM") return amount * 0.01;
      return amount * 0.025;
    },
  },
});
```

## Using Domain Services

### Creating Service Instances

Create new service instances using the `create` method and inject required dependencies:

```javascript
const paymentProcessor = PaymentProcessor.create({
  accountRepository: myAccountRepository,
  paymentGateway: myPaymentGateway,
});

// Use the service
const result = await paymentProcessor.transferFunds("acc-123", "acc-456", 100);
if (result.success) {
  console.log(`Transferred amount: ${result.data.transferredAmount}`);
} else {
  console.error(`Transfer failed: ${result.error}`);
}

// Access service metadata
console.log(`Service name: ${paymentProcessor.serviceName}`);
```

### Required vs. Optional Dependencies

Dependencies can be marked as required or optional:

```javascript
const dependencies = {
  required: {}, // Non-null means required
  optional: null, // Null means optional
};
```

When creating a service instance, all required dependencies must be provided:

```javascript
// This will throw an error because 'required' dependency is missing
const service = Service.create({
  optional: {},
});

// This works because all required dependencies are provided
const service = Service.create({
  required: {},
  optional: {},
});
```

### Accessing Dependencies in Operations

Dependencies are available via `this.dependencies` within operations:

```javascript
operations: {
  doSomething() {
    const { dependency1, dependency2 } = this.dependencies;
    // Use dependencies...
  }
}
```

## Extending Domain Services

You can extend existing domain services to create more specialized ones:

```javascript
const BasePaymentProcessor = domainService({
  name: "BasePaymentProcessor",
  dependencies: {
    accountRepository: null,
  },
  operations: {
    calculateFee(amount, accountType) {
      // Standard fee calculation
      return amount * 0.02;
    },
  },
});

const PremiumPaymentProcessor = BasePaymentProcessor.extend({
  name: "PremiumPaymentProcessor",
  dependencies: {
    promotionService: null, // Additional dependency
  },
  operations: {
    calculateFee(amount, accountType) {
      // Override with special premium logic
      return amount * 0.01;
    },

    applyPromotion(accountId, amount) {
      // New operation
      const { promotionService } = this.dependencies;
      return promotionService.applyDiscount(accountId, amount);
    },
  },
});
```

The extended service includes all dependencies and operations from the base service, plus any additional ones.

## Integration with Other Domain Components

### Working with Aggregates

Domain services often work with aggregates:

```javascript
const OrderProcessor = domainService({
  name: "OrderProcessor",
  dependencies: {
    orderRepository: null,
    paymentService: null,
    inventoryService: null,
  },
  operations: {
    async processOrder(orderId) {
      const { orderRepository, paymentService, inventoryService } =
        this.dependencies;

      // Get the order aggregate
      const order = await orderRepository.findById(orderId);
      if (!order) {
        return { success: false, error: "Order not found" };
      }

      // Check inventory
      const inventoryResult = await inventoryService.checkAvailability(
        order.items,
      );
      if (!inventoryResult.success) {
        return inventoryResult;
      }

      // Process payment
      const paymentResult = await paymentService.processPayment(
        order.customerId,
        order.total,
      );
      if (!paymentResult.success) {
        return paymentResult;
      }

      // Update the order aggregate using its methods
      const processedOrder = order.markAsPaid();

      // Save the updated aggregate
      await orderRepository.save(processedOrder);

      // Allocate inventory
      await inventoryService.allocateInventory(order.id, order.items);

      return { success: true, data: { order: processedOrder } };
    },
  },
});
```

### Emitting Domain Events

Domain services can emit domain events through aggregates:

```javascript
const OrderProcessor = domainService({
  name: "OrderProcessor",
  dependencies: {
    orderRepository: null,
    // ...other dependencies
  },
  operations: {
    async cancelOrder(orderId, reason) {
      const { orderRepository } = this.dependencies;

      // Get the order aggregate
      const order = await orderRepository.findById(orderId);
      if (!order) {
        return { success: false, error: "Order not found" };
      }

      // Cancel the order - this will emit a domain event
      const cancelledOrder = order.cancel(reason);

      // Save the order, which will publish the events
      await orderRepository.save(cancelledOrder);

      return { success: true, data: { order: cancelledOrder } };
    },
  },
});
```

## Error Handling

Domain services should use meaningful error responses:

```javascript
// Structured error responses
return {
  success: false,
  error: "Insufficient inventory",
  details: { missingItems },
};

// Using the DomainServiceError for exceptional cases
throw new DomainServiceError("Payment gateway connection failed", error, {
  orderId,
  amount,
});
```

## Best Practices

1. **Focus on Domain Processes** - Name services after processes in your domain (e.g., PaymentProcessor, OrderFulfillment).

2. **Keep Services Stateless** - Domain services should not maintain state between operations.

3. **Enforce Domain Rules** - Services should enforce business rules that span multiple domain objects.

4. **Use Explicit Dependencies** - Declare all dependencies upfront for clarity and testability.

5. **Return Rich Results** - Return structured results with success/error indicators and relevant data.

6. **Work with Aggregates Properly** - Use aggregate methods to modify state rather than changing properties directly.

7. **Respect Aggregate Boundaries** - Services often coordinate between aggregates but should respect their boundaries.

8. **Use Domain Events** - Let aggregates emit domain events that services can coordinate.

9. **Express Domain Concepts** - Use the ubiquitous language in service and operation names.

10. **Keep Operations Focused** - Each operation should perform a single domain process.

By following these principles, you'll create domain services that effectively express complex domain processes while maintaining a clean separation of concerns in your domain model.
