# Working with Specifications

Specifications are a powerful pattern in Domain-Driven Design that allows you to encapsulate business rules and queries in reusable, composable objects. They help separate the logic of what you're looking for from how you find or validate it.

## What are Specifications?

A specification:
- Encapsulates a predicate (a yes/no question) about an object
- Can be combined with other specifications using logical operators (and, or, not)
- Can be used for both validation and querying
- Captures business rules in an explicit, named way

## Why Use Specifications?

Specifications offer several benefits:
- **Reusability**: Define business rules once and use them in multiple places
- **Expressiveness**: Give meaningful names to complex rules
- **Composability**: Combine simple rules to create complex ones
- **Separation of concerns**: Separate the what (business rule) from the how (implementation)
- **Optimization opportunities**: Storage-specific optimizations can be applied by repositories

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

One of the most powerful features of specifications is that they can be composed:

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

The repository can use the `toQuery()` method of a specification to convert it to a storage-specific query:

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
  }
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

## Best Practices

1. **Name specifications clearly**: Use names that reflect the business concept
2. **Keep specifications focused**: Each specification should represent one rule or concept
3. **Prefer composition**: Build complex specifications by composing simpler ones
4. **Implement `toQuery`**: Always provide a query implementation for repository use
5. **Reuse specifications**: Define specifications in a central place and reuse them
6. **Document business rules**: Use specifications to document complex business rules
7. **Test specifications**: Write tests for your specifications to ensure they work correctly

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

## Next Steps

Now that you understand specifications, learn about [Domain Services](./domain-services.md) - operations that don't conceptually belong to any entity or value object.