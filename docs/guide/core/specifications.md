# Working with Specifications

Specifications are a powerful pattern in Domain-Driven Design that allows you to encapsulate business rules and queries in reusable, composable objects. They help separate the logic of what you're looking for from how you find or validate it.

## What is a Specification?

A specification is an object that encapsulates a business rule or query criterion, determining whether a given object satisfies specific criteria. Think of it as a "filter" or "predicate" that can be applied to domain objects to test if they meet certain conditions.

Key characteristics:
- Encapsulates a predicate (a yes/no question) about an object
- Can be combined with other specifications using logical operators (and, or, not)
- Can be used for both validation and querying
- Captures business rules in an explicit, named way
- Translates between domain rules and query implementations

## Why Use Specifications?

Specifications offer several benefits:

- **Reusability**: Define business rules once and use them in multiple places
- **Expressiveness**: Give meaningful names to complex rules
- **Composability**: Combine simple rules to create complex ones
- **Separation of concerns**: Separate what (business rule) from how (implementation)
- **Optimization opportunities**: Storage-specific optimizations can be applied by repositories
- **Improved readability**: Specifications with clear names make your code self-documenting
- **Maintainability**: When business rules change, you only need to update them in one place

## How Specifications Work

Specifications have two main responsibilities:

1. **Validation**: Check if a domain object satisfies a business rule (`isSatisfiedBy` method)
2. **Querying**: Translate the business rule into a query that repositories can use (`toQuery` method)

This dual nature allows you to use the same business rule both to filter in-memory objects and to query the database:

```
┌─────────────────────────┐
│                         │
│     Specification       │
│                         │
│  ┌─────────────────┐    │
│  │                 │    │
│  │  isSatisfiedBy  │────┼───► In-memory filtering
│  │                 │    │
│  └─────────────────┘    │
│                         │
│  ┌─────────────────┐    │
│  │                 │    │
│  │     toQuery     │────┼───► Database querying
│  │                 │    │
│  └─────────────────┘    │
│                         │
└─────────────────────────┘
```

## Creating Specifications with Domainify

Domainify provides a flexible way to create specifications:

```javascript
import { specification } from 'domainify';

// Create a specification for in-stock products
const InStock = specification({
  name: 'InStock',
  isSatisfiedBy: (product) => product.stockLevel > 0,
  toQuery: () => ({ stockLevel: { $gt: 0 } })
});

// Create a specification for featured products
const Featured = specification({
  name: 'Featured',
  isSatisfiedBy: (product) => product.featured === true,
  toQuery: () => ({ featured: true })
});

// Create a specification for products in a specific price range
const InPriceRange = specification({
  name: 'InPriceRange',
  parameters: ['min', 'max'],
  isSatisfiedBy: (product, { min, max }) => 
    product.price >= min && product.price <= max,
  toQuery: ({ min, max }) => ({ 
    price: { $gte: min, $lte: max } 
  })
});
```

Let's break down the components:

1. **`name`**: A descriptive name for your specification
2. **`isSatisfiedBy`**: Function that checks if an object satisfies the specification
3. **`toQuery`**: Function that converts the specification to a query for repositories
4. **`parameters`**: Optional array of parameter names for parameterized specifications

## Composing Specifications

The true power of specifications emerges when you compose them to create more complex specifications:

```javascript
// Combine specifications with logical operators
const FeaturedAndInStock = Featured.and(InStock);
const InexpensiveOrFeatured = InPriceRange({ min: 0, max: 25 }).or(Featured);
const NotFeatured = Featured.not();

// Using our composed specifications with an object
const product = {
  id: '123',
  name: 'Wireless Mouse',
  price: 29.99,
  stockLevel: 12,
  featured: true
};

console.log(FeaturedAndInStock.isSatisfiedBy(product)); // true
console.log(InexpensiveOrFeatured.isSatisfiedBy(product)); // true
console.log(NotFeatured.isSatisfiedBy(product)); // false
```

The composed specifications behave just like atomic specifications, with both `isSatisfiedBy` and `toQuery` methods. This allows you to build complex business rules from simple, reusable building blocks.

## Using Specifications with Repositories

Specifications shine when used with repositories for querying data:

```javascript
// Use a specification to query the repository
const inStockProducts = await productRepository.findAll(InStock);

// Use a composed specification
const featuredInStockProducts = await productRepository.findAll(
  Featured.and(InStock)
);

// Use a parameterized specification
const affordableProducts = await productRepository.findAll(
  InPriceRange({ min: 0, max: 50 })
);

// Combine parameterized and regular specifications
const affordableFeaturedProducts = await productRepository.findAll(
  InPriceRange({ min: 0, max: 50 }).and(Featured)
);
```

The repository uses the `toQuery()` method of a specification to convert it to a storage-specific query:

```javascript
class MongoProductRepository {
  constructor(collection) {
    this.collection = collection;
  }
  
  async findAll(specification) {
    // Convert the specification to a MongoDB query
    const query = specification.toQuery();
    
    // Use the query to find products
    const products = await this.collection.find(query).toArray();
    
    // Convert the results to domain objects
    return products.map(data => Product.create(data));
  }
}
```

## Specification Types

### Simple Specifications

Basic specifications that check a single condition:

```javascript
const IsActive = specification({
  name: 'IsActive',
  isSatisfiedBy: (user) => user.status === 'ACTIVE',
  toQuery: () => ({ status: 'ACTIVE' })
});

const HasVerifiedEmail = specification({
  name: 'HasVerifiedEmail',
  isSatisfiedBy: (user) => user.emailVerified === true,
  toQuery: () => ({ emailVerified: true })
});
```

### Parameterized Specifications

Specifications that take parameters to customize their behavior:

```javascript
const OlderThan = specification({
  name: 'OlderThan',
  parameters: ['age'],
  isSatisfiedBy: (person, { age }) => person.age > age,
  toQuery: ({ age }) => ({ age: { $gt: age } })
});

const InCategory = specification({
  name: 'InCategory',
  parameters: ['categoryId'],
  isSatisfiedBy: (product, { categoryId }) => 
    product.categories.includes(categoryId),
  toQuery: ({ categoryId }) => ({ categories: categoryId })
});

// Using parameterized specifications
const adultsSpec = OlderThan({ age: 18 });
const electronicsSpec = InCategory({ categoryId: 'electronics' });
```

### Composite Specifications

Specifications created by combining other specifications:

```javascript
// Active users with verified emails
const ActiveVerifiedUser = IsActive.and(HasVerifiedEmail);

// Products that are either featured or on sale
const Promoted = IsFeatured.or(IsOnSale);

// Products that are in stock but not featured
const InStockNonFeatured = InStock.and(IsFeatured.not());
```

## Common Specification Patterns

### Generic Specifications

Create reusable specifications that can apply to many types of objects:

```javascript
// Generic specification for entities with a 'createdAt' date field
const CreatedAfter = specification({
  name: 'CreatedAfter',
  parameters: ['date'],
  isSatisfiedBy: (entity, { date }) => entity.createdAt > date,
  toQuery: ({ date }) => ({ createdAt: { $gt: date } })
});

// Can be used with any entity that has a createdAt field
const recentOrders = await orderRepository.findAll(
  CreatedAfter({ date: new Date(Date.now() - 86400000) }) // Orders from the last 24 hours
);

const newProducts = await productRepository.findAll(
  CreatedAfter({ date: new Date(Date.now() - 7 * 86400000) }) // Products from the last 7 days
);
```

### Business Rule Specifications

Capture complex business rules in specifications:

```javascript
// Check if an order is eligible for express shipping
const EligibleForExpressShipping = specification({
  name: 'EligibleForExpressShipping',
  isSatisfiedBy: (order) => {
    // Must have been placed within business hours
    const placedAt = order.placedAt;
    const isBusinessHours = 
      placedAt.getHours() >= 9 && 
      placedAt.getHours() < 17 &&
      placedAt.getDay() >= 1 && 
      placedAt.getDay() <= 5;
    
    // All items must be in stock and ready to ship
    const allItemsReady = order.items.every(item => 
      item.status === 'READY_TO_SHIP'
    );
    
    // Shipping address must be in an eligible country
    const eligibleCountries = ['US', 'CA', 'MX'];
    const isEligibleCountry = eligibleCountries.includes(
      order.shippingAddress.country
    );
    
    return isBusinessHours && allItemsReady && isEligibleCountry;
  },
  toQuery: () => ({
    placedAt: { 
      $gte: /* business hours calculation */ 
    },
    'items.status': 'READY_TO_SHIP',
    'shippingAddress.country': { $in: ['US', 'CA', 'MX'] }
  })
});

// Use it to filter orders
const ordersForExpressShipping = allOrders.filter(
  order => EligibleForExpressShipping.isSatisfiedBy(order)
);
```

### Using Specifications for Validation

Specifications can be used for validation, not just querying:

```javascript
// Validate a product before saving
const ValidProduct = specification({
  name: 'ValidProduct',
  isSatisfiedBy: (product) => {
    if (!product.name || product.name.length < 3) return false;
    if (product.price <= 0) return false;
    if (product.stockLevel < 0) return false;
    if (product.categories.length === 0) return false;
    return true;
  }
});

// Use in a service
class ProductService {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }
  
  async createProduct(productData) {
    const product = Product.create(productData);
    
    if (!ValidProduct.isSatisfiedBy(product)) {
      throw new Error('Invalid product data');
    }
    
    return this.productRepository.save(product);
  }
}
```

## Performance Considerations

When specifications are used with repositories, consider performance implications:

```javascript
// Inefficient: Will load all products and filter in memory
const affordableProducts = (await productRepository.findAll())
  .filter(product => InPriceRange({ min: 0, max: 50 }).isSatisfiedBy(product));

// Efficient: Uses the specification's toQuery method to filter at the database level
const affordableProducts = await productRepository.findAll(
  InPriceRange({ min: 0, max: 50 })
);
```

For complex specifications, ensure your repository can translate them efficiently:

```javascript
// Complex specification
const ComplexProductSpec = InStock
  .and(InPriceRange({ min: 10, max: 100 }))
  .and(InCategory({ categoryId: 'electronics' }).or(IsFeatured));

// The repository should translate this to an efficient query
// For MongoDB, it might be something like:
// {
//   $and: [
//     { stockLevel: { $gt: 0 } },
//     { price: { $gte: 10, $lte: 100 } },
//     { $or: [
//       { categories: 'electronics' },
//       { featured: true }
//     ]}
//   ]
// }
```

Some repositories might not fully support all complex query compositions. In such cases, you might need to:

1. Split the query into multiple simpler queries
2. Perform some filtering in memory
3. Create a custom repository method for that specific complex query

## Testing Specifications

Specifications should be thoroughly tested to ensure they correctly implement business rules:

```javascript
describe('InPriceRange Specification', () => {
  const inExpensiveRange = InPriceRange({ min: 0, max: 50 });
  
  test('accepts products within price range', () => {
    const product = { price: 25.99 };
    expect(inExpensiveRange.isSatisfiedBy(product)).toBe(true);
  });
  
  test('rejects products below price range', () => {
    const product = { price: -5 };
    expect(inExpensiveRange.isSatisfiedBy(product)).toBe(false);
  });
  
  test('rejects products above price range', () => {
    const product = { price: 75.50 };
    expect(inExpensiveRange.isSatisfiedBy(product)).toBe(false);
  });
  
  test('generates correct query', () => {
    const query = inExpensiveRange.toQuery();
    expect(query).toEqual({ price: { $gte: 0, $lte: 50 } });
  });
});
```

## Common Pitfalls

1. **Missing `toQuery` implementation**: Forgetting to implement the `toQuery` method makes the specification unusable with repositories
2. **Inconsistent logic**: When `isSatisfiedBy` and `toQuery` don't implement the same business rule
3. **Performance issues**: Complex specifications with inefficient `isSatisfiedBy` implementations
4. **Over-specification**: Creating too many narrow specifications instead of composable ones
5. **Under-specification**: Making specifications too generic, losing domain expressiveness

## Best Practices

1. **Name specifications clearly**: Use names that reflect the business concept
2. **Keep specifications focused**: Each specification should represent one rule or concept
3. **Prefer composition**: Build complex specifications by composing simpler ones
4. **Implement `toQuery`**: Always provide a query implementation for repository use
5. **Reuse specifications**: Define specifications in a central place and reuse them
6. **Document business rules**: Use specifications to document complex business rules
7. **Test specifications**: Write tests for your specifications to ensure they work correctly
8. **Use domain language**: Name specifications using the ubiquitous language of your domain

## Next Steps

Now that you understand specifications, you might want to learn about:

- [Domain Services](./domain-services.md) - Operations that don't conceptually belong to any entity or value object
- [Repositories](./repositories.md) - Using specifications with repositories for efficient querying
- [Testing Specifications](../advanced/testing.md#testing-specifications) - Advanced techniques for testing specifications