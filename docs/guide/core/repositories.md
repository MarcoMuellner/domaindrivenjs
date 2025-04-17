# Working with Repositories

Repositories are a critical pattern in Domain-Driven Design that provides a clean separation between your domain model and your data storage. They abstract away the details of how objects are persisted and retrieved.

## What is a Repository?

A repository is a collection-like interface that mediates between the domain model and data mapping layers, providing an illusion of an in-memory collection of domain objects. Think of it as a specialized "bookshelf" where your domain objects are stored and retrieved.

Key characteristics:
- Provides a collection-like interface for accessing domain objects
- Abstracts away data storage and retrieval mechanisms 
- Mediates between the domain and data mapping layers
- Enables testability and flexibility in your domain model

## Why Use Repositories?

Repositories offer several benefits:

- **Separation of concerns**: Your domain logic remains pure and focused, without being entangled with database access code
- **Improved testability**: Easily swap real storage with in-memory implementations for testing
- **Simplified domain code**: Domain logic works with repositories, not data access mechanisms
- **Storage flexibility**: Change database technologies without affecting domain code
- **Query optimization**: Repositories can optimize queries based on specific storage technologies
- **Domain focus**: Repositories speak the language of the domain, not the language of the database

## How Repositories Work

Repositories act as a boundary between two very different worlds:

```
┌─────────────────────┐     ┌───────────────┐     ┌─────────────────────┐
│                     │     │               │     │                     │
│   Domain Model      │◄────┤  Repository   ├────►│   Data Storage      │
│  (Entities, etc.)   │     │               │     │  (SQL, NoSQL, etc.) │
│                     │     │               │     │                     │
└─────────────────────┘     └───────────────┘     └─────────────────────┘
```

On one side, the repository accepts and returns domain objects (entities, aggregates). On the other side, it translates these into the data format required by your storage technology.

When a repository saves an object:
1. It receives a domain object
2. It maps the object to the storage format (e.g., SQL table rows, document JSON)
3. It uses the appropriate storage mechanism to persist the data

When a repository retrieves an object:
1. It queries the storage mechanism
2. It maps the raw data back into domain objects
3. It returns fully reconstituted domain objects

## Creating Repositories with Domainify

Domainify provides a straightforward way to create repositories:

```javascript
import { z } from 'zod';
import { entity, repository } from 'domainify';

// First, let's define a simple Product entity
const Product = entity({
  name: 'Product',
  schema: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    price: z.number().positive(),
    stockLevel: z.number().int().nonnegative()
  }),
  identity: 'id'
});

// Now, let's create a repository for our Product entity
const ProductRepository = repository({
  name: 'ProductRepository',
  entity: Product,
  methods: {
    async findByName(name) {
      // This will be implemented by the adapter
      return this.findOne({ name });
    },
    async findInStock() {
      // This will be implemented by the adapter
      return this.findMany({ stockLevel: { $gt: 0 } });
    },
    async updateStock(id, newStockLevel) {
      // This will be implemented by the adapter
      return this.update(id, { stockLevel: newStockLevel });
    }
  }
});
```

Let's break down the components:

1. **`name`**: A descriptive name for your repository
2. **`entity`**: The entity type this repository will manage
3. **`methods`**: Custom query and operation methods specific to this repository

## Repository Adapters

A key strength of the repository pattern is its abstraction of storage details through adapters. Domainify provides adapters for different storage systems:

```javascript
import { InMemoryAdapter, MongoAdapter, SqliteAdapter } from 'domainify/adapters';

// In-memory adapter (great for testing)
const inMemoryProductRepo = ProductRepository.create(
  new InMemoryAdapter()
);

// MongoDB adapter
const mongoProductRepo = ProductRepository.create(
  new MongoAdapter({
    connectionString: 'mongodb://localhost:27017',
    database: 'my-shop',
    collection: 'products'
  })
);

// SQLite adapter
const sqliteProductRepo = ProductRepository.create(
  new SqliteAdapter({
    filename: './my-shop.db',
    table: 'products'
  })
);
```

Each adapter implements the same interface but handles the specific details of its storage technology. This allows you to switch storage technologies with minimal code changes.

## Using Repositories

Once you've connected your repository to an adapter, you can use it to work with your entities:

```javascript
// Create a new product
const newProduct = await productRepo.save(
  Product.create({
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Mechanical Keyboard',
    price: 89.99,
    stockLevel: 50
  })
);

// Find a product by ID
const product = await productRepo.findById('123e4567-e89b-12d3-a456-426614174000');

// Find products by criteria
const inStockProducts = await productRepo.findInStock();
const keyboardProducts = await productRepo.findMany({ name: { $contains: 'Keyboard' } });

// Update a product
await productRepo.updateStock('123e4567-e89b-12d3-a456-426614174000', 45);

// Delete a product
await productRepo.delete('123e4567-e89b-12d3-a456-426614174000');
```

## Standard Repository Methods

All Domainify repositories come with these standard methods:

| Method | Description |
|--------|-------------|
| `findById(id)` | Find an entity by its identifier |
| `findOne(criteria)` | Find a single entity matching criteria |
| `findMany(criteria)` | Find all entities matching criteria |
| `exists(id)` | Check if an entity with the given ID exists |
| `save(entity)` | Create or update an entity |
| `update(id, changes)` | Update an entity by ID with partial changes |
| `delete(id)` | Delete an entity by ID |
| `count(criteria)` | Count entities matching criteria |

## Query Criteria

Domainify repositories support a flexible query criteria syntax:

```javascript
// Basic equality
await productRepo.findMany({ name: 'Mechanical Keyboard' });

// Comparison operators
await productRepo.findMany({ price: { $lt: 100 } });
await productRepo.findMany({ stockLevel: { $gte: 10 } });

// Logical operators
await productRepo.findMany({
  $or: [
    { name: { $contains: 'Keyboard' } },
    { name: { $contains: 'Mouse' } }
  ],
  price: { $lt: 200 }
});

// String operations
await productRepo.findMany({ name: { $startsWith: 'Mech' } });
await productRepo.findMany({ description: { $contains: 'ergonomic' } });
```

## Advanced Repository Patterns

### Specialized Finders

You can create specialized finder methods for common queries:

```javascript
const ProductRepository = repository({
  name: 'ProductRepository',
  entity: Product,
  methods: {
    async findByCategory(categoryId) {
      return this.findMany({ categoryId });
    },
    async findBestSellers() {
      return this.findMany(
        { salesRank: { $lte: 100 } },
        { sort: { salesRank: 'asc' }, limit: 10 }
      );
    }
  }
});
```

### Transaction Support

Repositories can support transactions to ensure data consistency:

```javascript
// Using the transaction manager from your adapter
const { transactionManager } = mongoAdapter;

await transactionManager.runInTransaction(async (session) => {
  // Pass the session to your repository operations
  await productRepo.updateStock('product-1', 45, { session });
  await orderRepo.save(newOrder, { session });
});
```

### Batch Operations

For performance, you can perform batch operations:

```javascript
// Batch insert
await productRepo.saveMany([product1, product2, product3]);

// Batch update
await productRepo.updateMany(
  { category: 'keyboards' },
  { inStock: false }
);

// Batch delete
await productRepo.deleteMany({ expiryDate: { $lt: new Date() } });
```

## Working with Specifications

Repositories can work seamlessly with specifications (see [Specifications](./specifications.md)):

```javascript
// Create a specification
const InStockSpec = specification({
  name: 'InStock',
  isSatisfiedBy: product => product.stockLevel > 0,
  toQuery: () => ({ stockLevel: { $gt: 0 } })
});

// Use it with a repository
const inStockProducts = await productRepo.findMany(InStockSpec);

// Combine specifications
const FeaturedAndInStock = FeaturedSpec.and(InStockSpec);
const featuredInStockProducts = await productRepo.findMany(FeaturedAndInStock);
```

## Repository Composition

You can compose repositories for more complex operations:

```javascript
const OrderService = {
  async placeOrder(cart, customer, productRepo, orderRepo) {
    // Verify all products are in stock
    for (const item of cart.items) {
      const product = await productRepo.findById(item.productId);
      if (!product || product.stockLevel < item.quantity) {
        throw new Error(`Product ${item.productId} not available in requested quantity`);
      }
    }
    
    // Create the order
    const order = Order.create({
      id: generateId(),
      customerId: customer.id,
      items: cart.items,
      status: 'PLACED',
      placedAt: new Date()
    });
    
    // Update product stock
    for (const item of cart.items) {
      await productRepo.updateStock(
        item.productId, 
        (await productRepo.findById(item.productId)).stockLevel - item.quantity
      );
    }
    
    // Save the order
    return orderRepo.save(order);
  }
};
```

## Testing with Repositories

In-memory adapters make testing with repositories simple:

```javascript
import { InMemoryAdapter } from 'domainify/adapters';

describe('ProductService', () => {
  let productRepo;
  
  beforeEach(() => {
    // Create a fresh in-memory repository for each test
    productRepo = ProductRepository.create(new InMemoryAdapter());
  });
  
  test('discounting products decreases their price', async () => {
    // Arrange
    const product = Product.create({
      id: '123',
      name: 'Test Product',
      price: 100,
      stockLevel: 10
    });
    await productRepo.save(product);
    
    // Act
    await ProductService.applyDiscount(productRepo, '123', 0.1);
    
    // Assert
    const updatedProduct = await productRepo.findById('123');
    expect(updatedProduct.price).toBe(90);
  });
});
```

## Common Pitfalls

1. **Repository per table**: Creating repositories that match database tables instead of aggregates
2. **Leaking persistence concerns**: Exposing storage-specific details in the repository interface
3. **Anemic repositories**: Not providing domain-specific query methods, just basic CRUD
4. **Fat repositories**: Adding business logic that belongs in domain services
5. **Inconsistent transaction boundaries**: Not considering aggregate boundaries when designing transactions

## Best Practices

1. **Repository per aggregate**: Create one repository for each aggregate root, not for every entity
2. **Keep repositories focused**: Each repository should handle one type of entity
3. **Abstract storage details**: Don't expose storage-specific code through repositories
4. **Use dependency injection**: Pass repositories to services that need them
5. **Optimize for common queries**: Add custom methods for frequently used queries
6. **Consider caching**: Implement caching strategies for performance-critical repositories
7. **Respect aggregate boundaries**: Repositories should enforce the consistency boundaries of aggregates

## Next Steps

Now that you understand repositories, you might want to learn about:

- [Specifications](./specifications.md) - Encapsulate query and validation rules
- [Domain Events](./domain-events.md) - Capture significant changes in your domain
- [Testing Repositories](../advanced/testing.md#testing-repositories) - Advanced techniques for testing repositories