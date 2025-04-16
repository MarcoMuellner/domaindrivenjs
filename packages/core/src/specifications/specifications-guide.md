# Working with Specifications in domainify

Specifications are a powerful pattern in Domain-Driven Design that encapsulate business rules as objects. This guide explains how to create and use specifications effectively in your domain model with domainify.

## What are Specifications?

Specifications answer the question: "Does this object satisfy this criteria?" They act as reusable predicates that evaluate objects against business rules and return true or false.

Key characteristics:

- **Encapsulate Business Rules** - Package complex conditions into named objects
- **Reusable** - Can be applied across various contexts in your application
- **Composable** - Can be combined with logical operators (AND, OR, NOT)
- **Optimizable** - Can be translated into database queries for efficient filtering

## Creating Basic Specifications

The core of domainify's specification implementation is the `specification` factory function:

```javascript
import { specification } from "domainify";

const PremiumCustomer = specification({
  name: "PremiumCustomer",

  isSatisfiedBy(customer) {
    return customer.totalSpent > 1000 && customer.orderCount > 10;
  },

  // Optional query translation for repositories
  toQuery() {
    return {
      $and: [{ totalSpent: { $gt: 1000 } }, { orderCount: { $gt: 10 } }],
    };
  },
});

// Usage
const customer = { totalSpent: 1500, orderCount: 12 };
const isPremium = PremiumCustomer.isSatisfiedBy(customer); // true
```

## Composing Specifications

Specifications can be combined using logical operators to create more complex rules:

```javascript
// Individual specifications
const HighValueOrder = specification({
  name: "HighValueOrder",
  isSatisfiedBy: (order) => order.total > 100,
  toQuery: () => ({ total: { $gt: 100 } }),
});

const ExpressShipping = specification({
  name: "ExpressShipping",
  isSatisfiedBy: (order) => order.shippingMethod === "express",
  toQuery: () => ({ shippingMethod: "express" }),
});

const InternationalOrder = specification({
  name: "InternationalOrder",
  isSatisfiedBy: (order) => order.country !== "US",
  toQuery: () => ({ country: { $ne: "US" } }),
});

// Composed specifications
const PriorityOrder = HighValueOrder.and(ExpressShipping);
const HighValueInternational = HighValueOrder.and(InternationalOrder);
const NeedsSpecialAttention = HighValueOrder.or(ExpressShipping);
const DomesticOnly = InternationalOrder.not();

// Usage
const order = { total: 120, shippingMethod: "express", country: "CA" };
const isPriority = PriorityOrder.isSatisfiedBy(order); // true
const isDomestic = DomesticOnly.isSatisfiedBy(order); // false
```

The combined specifications also preserve query capabilities, generating the appropriate database queries.

## Built-in Common Specifications

domainify provides common specifications for frequently used business rules:

### Property Comparison Specifications

```javascript
import {
  propertyEquals,
  propertyGreaterThan,
  propertyLessThan,
  propertyBetween,
  propertyIn,
} from "domainify";

// Check if status is "active"
const ActiveAccount = propertyEquals("status", "active");

// Check if balance is greater than 1000
const HighBalanceAccount = propertyGreaterThan("balance", 1000);

// Check if creation date is within a range
const RecentAccount = propertyBetween(
  "createdAt",
  new Date("2023-01-01"),
  new Date(),
);

// Check if category is one of several values
const PriorityCategory = propertyIn("category", ["A", "B", "Premium"]);
```

### String Content Specifications

```javascript
import { propertyContains, propertyMatches } from "domainify";

// Check if name contains "Smith"
const SmithFamily = propertyContains("name", "Smith");

// Check if email matches a pattern
const CorporateEmail = propertyMatches("email", /^[\w.-]+@company\.com$/);
```

### Null/Existence Specifications

```javascript
import { propertyIsNull, propertyIsNotNull } from "domainify";

// Check if a property is null/undefined
const MissingAddress = propertyIsNull("address");

// Check if a property exists and is not null
const HasPhoneNumber = propertyIsNotNull("phoneNumber");
```

### Special Specifications

```javascript
import { alwaysTrue, alwaysFalse } from "domainify";

// Always returns true - useful as default or placeholder
const AllowAll = alwaysTrue();

// Always returns false - useful for testing
const DenyAll = alwaysFalse();
```

## Parameterized Specifications

Create reusable specification factories for dynamic business rules:

```javascript
import { parameterizedSpecification } from "domainify";

// Create a specification factory for price ranges
const PriceRange = parameterizedSpecification({
  name: (params) => `Price Between ${params.min} and ${params.max}`,

  createPredicate: (params) => {
    return (product) =>
      product.price >= params.min && product.price <= params.max;
  },

  createQuery: (params) => {
    return () => ({
      price: { $gte: params.min, $lte: params.max },
    });
  },
});

// Create concrete specifications with different parameters
const BudgetProducts = PriceRange({ min: 0, max: 20 });
const MidRangeProducts = PriceRange({ min: 20, max: 100 });
const PremiumProducts = PriceRange({ min: 100, max: 1000 });

// Usage
const product = { price: 50 };
const isMidRange = MidRangeProducts.isSatisfiedBy(product); // true
```

## Repository Integration

Specifications integrate seamlessly with repositories to efficiently query collections:

```javascript
// Create a repository for products
const ProductRepository = repository({
  aggregate: Product,
  adapter: mongoAdapter({
    collectionName: "products",
  }),
});

// Find products using specifications
const ActiveProducts = propertyEquals("status", "active");
const HighValueProducts = propertyGreaterThan("price", 100);
const FeaturedHighValueProducts = HighValueProducts.and(
  propertyEquals("featured", true),
);

// Get active products
const activeProducts =
  await ProductRepository.findBySpecification(ActiveProducts);

// Get high-value featured products
const featuredExpensiveProducts = await ProductRepository.findBySpecification(
  FeaturedHighValueProducts,
);
```

The repository will use the `toQuery` method from specifications to create efficient database queries.

## Using Specifications for Validation

Specifications can validate entities before operations:

```javascript
// Check if an order can be placed
const CanBePlaced = specification({
  name: "OrderCanBePlaced",
  isSatisfiedBy: (order) => order.items.length > 0 && order.total > 0,
});

// In a domain service or use case
function placeOrder(order) {
  if (!CanBePlaced.isSatisfiedBy(order)) {
    throw new Error("Order cannot be placed");
  }

  // Proceed with order placement
  return orderRepository.save(order.placeOrder());
}
```

## Using Specifications with Aggregates

Specifications work well with aggregates for enforcing invariants:

```javascript
const Order = aggregate({
  name: "Order",
  schema: orderSchema,
  identity: "id",

  invariants: [
    {
      name: "Must have items when placed",
      check: (order) => order.status !== "PLACED" || order.items.length > 0,
    },
  ],

  methods: {
    canBeCancelled() {
      return OrderCancellable.isSatisfiedBy(this);
    },

    cancel() {
      if (!this.canBeCancelled()) {
        throw new Error("Order cannot be cancelled");
      }

      return Order.update(this, { status: "CANCELLED" });
    },
  },
});

// Define cancellation rules as a specification
const OrderCancellable = specification({
  name: "OrderCancellable",
  isSatisfiedBy: (order) =>
    ["DRAFT", "PLACED"].includes(order.status) && !order.paymentCompleted,
});
```

## Best Practices

1. **Name specifications descriptively** - Use domain language that reflects business concepts.

2. **Keep specifications focused** - Each specification should test a single concern or business rule.

3. **Make them reusable** - Design specifications for reuse across multiple contexts.

4. **Provide query translations** - Implement `toQuery` methods for repository optimizations.

5. **Compose when possible** - Build complex rules from simple specifications.

6. **Test specifications independently** - Verify that specifications correctly implement business rules.

7. **Document business rules** - Use specifications as living documentation of domain rules.

8. **Use with aggregates** - Specifications work well for externally checking aggregate invariants.

9. **Consider performance** - For large collections, ensure queries are optimized.

10. **Apply consistently** - Use specifications throughout your application for a unified approach to business rules.

By following these principles, you'll build a domain model with clear, composable business rules that can be used throughout your application.
