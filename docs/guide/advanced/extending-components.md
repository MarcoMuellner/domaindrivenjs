# Extending Domainify Components

Domainify provides a solid foundation for implementing Domain-Driven Design in JavaScript, but real-world applications often require customization. This guide explains how to extend Domainify's core components to address specific domain requirements.

## Why Extend Components?

Extending Domainify components allows you to:

- Add custom behavior to domain objects across your application
- Implement cross-cutting concerns like logging or validation
- Create specialized versions of components for specific domain areas
- Integrate with external systems or frameworks
- Customize serialization and persistence

## Extending Value Objects

### Creating Custom Value Object Factories

You can create custom value object factories with additional behaviors or validations:

```javascript
import { valueObject } from 'domainify';

// Create a custom value object factory with additional features
function customValueObject(config) {
  // Enhance the configuration
  const enhancedConfig = {
    ...config,
    
    // Additional behaviors for all value objects
    methods: {
      ...(config.methods || {}),
      
      // Add custom serialization
      toJSON() {
        const json = { ...this };
        // Add custom serialization logic
        return json;
      },
      
      // Add custom validation method
      validateOrThrow() {
        if (config.validate) {
          config.validate(this);
        }
        return this;
      }
    }
  };
  
  // Use the original valueObject factory with enhanced config
  return valueObject(enhancedConfig);
}

// Usage
const Money = customValueObject({
  name: 'Money',
  schema: z.object({
    amount: z.number().positive(),
    currency: z.string().length(3)
  }),
  methods: {
    add(other) {
      if (this.currency !== other.currency) {
        throw new Error('Cannot add different currencies');
      }
      return Money.create({
        amount: this.amount + other.amount,
        currency: this.currency
      });
    }
  }
});
```

### Creating Domain-Specific Value Object Bases

For consistent value objects across a specific domain concept:

```javascript
import { valueObject } from 'domainify';

// Create a specialized factory for quantity-related value objects
function quantityValueObject(config) {
  return valueObject({
    ...config,
    methods: {
      ...(config.methods || {}),
      
      // Common methods for quantities
      isZero() {
        return this.value === 0;
      },
      
      isPositive() {
        return this.value > 0;
      },
      
      isNegative() {
        return this.value < 0;
      },
      
      abs() {
        const ValueObjectClass = this.constructor;
        return ValueObjectClass.create({
          ...this,
          value: Math.abs(this.value)
        });
      }
    }
  });
}

// Usage
const Weight = quantityValueObject({
  name: 'Weight',
  schema: z.object({
    value: z.number(),
    unit: z.enum(['kg', 'g', 'lb', 'oz'])
  }),
  methods: {
    toKilograms() {
      if (this.unit === 'kg') return this;
      
      let valueInKg;
      if (this.unit === 'g') valueInKg = this.value / 1000;
      else if (this.unit === 'lb') valueInKg = this.value * 0.453592;
      else if (this.unit === 'oz') valueInKg = this.value * 0.0283495;
      
      return Weight.create({
        value: valueInKg,
        unit: 'kg'
      });
    }
  }
});
```

## Extending Entities

### Creating Base Entity Classes

Create base entity classes with common behavior:

```javascript
import { entity } from 'domainify';

// Create a base entity with audit fields
function auditedEntity(config) {
  return entity({
    ...config,
    schema: config.schema.extend({
      createdAt: z.date().optional(),
      updatedAt: z.date().optional(),
      createdBy: z.string().optional(),
      updatedBy: z.string().optional()
    }),
    
    // Pre-process method to add timestamps
    preProcess: (data, context) => {
      const processed = { ...data };
      
      // Add created timestamp for new entities
      if (!processed.id) {
        processed.createdAt = new Date();
        processed.createdBy = context?.userId;
      }
      
      // Always update the updated timestamp
      processed.updatedAt = new Date();
      processed.updatedBy = context?.userId;
      
      return processed;
    }
  });
}

// Usage
const Product = auditedEntity({
  name: 'Product',
  schema: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    price: z.number().positive()
  }),
  identity: 'id',
  methods: {
    // Product-specific methods
  }
});

// Creating with context
const newProduct = Product.create(
  { name: 'Test Product', price: 99.99 },
  { userId: 'user-123' } // Context
);
```

### Adding Domain Events

Extend entities with domain event handling:

```javascript
import { entity } from 'domainify';

// Base entity with domain events
function eventSourcedEntity(config) {
  return entity({
    ...config,
    schema: config.schema.extend({
      version: z.number().int().nonnegative().default(0)
    }),
    
    // Initialize with empty events array
    initialize: (instance) => {
      instance._domainEvents = [];
      return instance;
    },
    
    methods: {
      ...(config.methods || {}),
      
      // Add a domain event
      addDomainEvent(event) {
        this._domainEvents.push({
          ...event,
          entityId: this.id,
          entityType: config.name,
          timestamp: new Date()
        });
        return this;
      },
      
      // Get all domain events
      get domainEvents() {
        return [...this._domainEvents];
      },
      
      // Clear domain events
      clearDomainEvents() {
        const entityClass = this.constructor;
        return entityClass.create({
          ...this,
          _domainEvents: []
        });
      },
      
      // Increment version on each update
      incrementVersion() {
        const entityClass = this.constructor;
        return entityClass.create({
          ...this,
          version: this.version + 1
        });
      }
    }
  });
}

// Usage
const Order = eventSourcedEntity({
  name: 'Order',
  schema: orderSchema,
  identity: 'id',
  methods: {
    place() {
      if (this.status !== 'DRAFT') {
        throw new Error('Only draft orders can be placed');
      }
      
      const placedOrder = Order.create({
        ...this,
        status: 'PLACED',
        placedAt: new Date()
      }).incrementVersion();
      
      return placedOrder.addDomainEvent({
        type: 'OrderPlaced',
        payload: {
          orderId: this.id,
          placedAt: new Date()
        }
      });
    }
  }
});
```

## Extending Aggregates

### Creating Specialized Aggregate Types

Create specialized aggregate types with custom behavior:

```javascript
import { aggregate } from 'domainify';

// Base aggregate for all financial aggregates
function financialAggregate(config) {
  return aggregate({
    ...config,
    
    // All financial aggregates get extra validation
    invariants: [
      ...(config.invariants || []),
      {
        name: 'financial-audit-trail',
        check: (instance) => {
          // Every financial change needs an audit trail entry
          if (instance.version > 1 && !instance.auditEntries?.length) {
            return false;
          }
          return true;
        },
        message: 'Financial entities must have audit trail entries for changes'
      }
    ],
    
    methods: {
      ...(config.methods || {}),
      
      // Common method for all financial aggregates
      addAuditEntry(action, actor, reason) {
        const AggregateClass = this.constructor;
        const auditEntries = [...(this.auditEntries || [])];
        
        auditEntries.push({
          action,
          timestamp: new Date(),
          actor,
          reason
        });
        
        return AggregateClass.create({
          ...this,
          auditEntries
        });
      }
    }
  });
}

// Usage
const Account = financialAggregate({
  name: 'Account',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    balance: Money.schema,
    status: z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED']),
    auditEntries: z.array(AuditEntry.schema).optional(),
    version: z.number().int().min(1).default(1)
  }),
  identity: 'id',
  methods: {
    deposit(amount, actor, reason) {
      if (this.status !== 'ACTIVE') {
        throw new Error('Cannot deposit to a non-active account');
      }
      
      if (amount.currency !== this.balance.currency) {
        throw new Error('Currency mismatch');
      }
      
      const newBalance = this.balance.add(amount);
      
      return this.constructor.create({
        ...this,
        balance: newBalance,
        version: this.version + 1
      }).addAuditEntry('DEPOSIT', actor, reason);
    }
  }
});
```

### Adding Validation Middleware

Add middleware for cross-cutting concerns:

```javascript
import { aggregate } from 'domainify';

// Add validation middleware to aggregates
function validatedAggregate(config) {
  const originalMethods = config.methods || {};
  const methodKeys = Object.keys(originalMethods);
  
  // Create wrapped methods with validation
  const wrappedMethods = methodKeys.reduce((acc, methodName) => {
    const originalMethod = originalMethods[methodName];
    
    // Skip non-function properties
    if (typeof originalMethod !== 'function') {
      acc[methodName] = originalMethod;
      return acc;
    }
    
    // Create wrapped method with validation
    acc[methodName] = function(...args) {
      // Pre-validation
      if (config.preValidate) {
        config.preValidate(this, methodName, args);
      }
      
      // Call original method
      const result = originalMethod.apply(this, args);
      
      // Post-validation for the result (if it's an instance of the same class)
      if (result && result instanceof this.constructor && config.postValidate) {
        config.postValidate(result, methodName, args);
      }
      
      return result;
    };
    
    return acc;
  }, {});
  
  // Return the aggregate with wrapped methods
  return aggregate({
    ...config,
    methods: wrappedMethods
  });
}

// Usage
const ShoppingCart = validatedAggregate({
  name: 'ShoppingCart',
  schema: shoppingCartSchema,
  identity: 'id',
  
  // Pre-validation for all methods
  preValidate: (instance, methodName, args) => {
    if (instance.status === 'CLOSED') {
      throw new Error(`Cannot perform ${methodName} on a closed cart`);
    }
  },
  
  // Post-validation for all method results
  postValidate: (result, methodName, args) => {
    if (result.items.length > 20) {
      throw new Error('Shopping cart cannot have more than 20 items');
    }
  },
  
  methods: {
    addItem(item) {
      // Implementation...
    },
    
    removeItem(itemId) {
      // Implementation...
    }
  }
});
```

## Extending Repositories

### Custom Repository Base Classes

Create custom repository base classes:

```javascript
import { repository } from 'domainify';

// Create a cached repository base
function cachedRepository(config) {
  return repository({
    ...config,
    
    // Initialize with cache
    initialize: (instance) => {
      instance._cache = new Map();
      instance._cacheTTL = 60000; // 1 minute default
      return instance;
    },
    
    methods: {
      ...(config.methods || {}),
      
      // Configure cache TTL
      setCacheTTL(ttlMs) {
        this._cacheTTL = ttlMs;
      },
      
      // Clear the cache
      clearCache() {
        this._cache.clear();
      },
      
      // Override findById with caching
      async findById(id, options = {}) {
        // Skip cache if explicitly requested
        if (options.skipCache) {
          return super.findById(id, options);
        }
        
        // Check cache
        const cacheKey = `id:${id}`;
        const cachedItem = this._cache.get(cacheKey);
        
        if (cachedItem && cachedItem.expiresAt > Date.now()) {
          return cachedItem.value;
        }
        
        // Cache miss - fetch from storage
        const entity = await super.findById(id, options);
        
        // Cache the result if found
        if (entity) {
          this._cache.set(cacheKey, {
            value: entity,
            expiresAt: Date.now() + this._cacheTTL
          });
        }
        
        return entity;
      },
      
      // Override save to update cache
      async save(entity, options = {}) {
        const result = await super.save(entity, options);
        
        // Update cache
        const cacheKey = `id:${entity.id}`;
        this._cache.set(cacheKey, {
          value: entity,
          expiresAt: Date.now() + this._cacheTTL
        });
        
        return result;
      },
      
      // Override delete to update cache
      async delete(id, options = {}) {
        const result = await super.delete(id, options);
        
        // Remove from cache
        const cacheKey = `id:${id}`;
        this._cache.delete(cacheKey);
        
        return result;
      }
    }
  });
}

// Usage
const ProductRepository = cachedRepository({
  name: 'ProductRepository',
  entity: Product,
  methods: {
    async findByCategory(categoryId) {
      return this.findMany({ categoryId });
    }
  }
});

// Create and use
const productRepo = ProductRepository.create(new MongoAdapter(db));
productRepo.setCacheTTL(300000); // 5 minutes

// Uses cache
const product = await productRepo.findById('123');

// Bypass cache when needed
const freshProduct = await productRepo.findById('123', { skipCache: true });
```

### Adding Logging and Monitoring

Add logging to repositories:

```javascript
import { repository } from 'domainify';

// Repository with logging
function loggedRepository(config, logger) {
  // Store original methods
  const originalMethods = config.methods || {};
  
  // Create methods with logging
  const methodsWithLogging = {};
  
  // Add logging to standard methods
  const standardMethods = [
    'findById', 'findOne', 'findMany', 
    'save', 'update', 'delete', 'count'
  ];
  
  // Add logging to each standard method
  for (const method of standardMethods) {
    methodsWithLogging[method] = async function(...args) {
      const startTime = Date.now();
      
      try {
        // Call original method
        const result = await this[`_${method}`](...args);
        
        // Log success
        const duration = Date.now() - startTime;
        logger.info({
          repository: config.name,
          method,
          duration,
          success: true,
          entityType: config.entity.name
        });
        
        return result;
      } catch (error) {
        // Log failure
        const duration = Date.now() - startTime;
        logger.error({
          repository: config.name,
          method,
          duration,
          success: false,
          error: error.message,
          entityType: config.entity.name
        });
        
        throw error;
      }
    };
  }
  
  // Add logging to custom methods
  Object.keys(originalMethods).forEach(methodName => {
    const originalMethod = originalMethods[methodName];
    
    methodsWithLogging[methodName] = async function(...args) {
      const startTime = Date.now();
      
      try {
        // Call original method
        const result = await originalMethod.apply(this, args);
        
        // Log success
        const duration = Date.now() - startTime;
        logger.info({
          repository: config.name,
          method: methodName,
          duration,
          success: true,
          entityType: config.entity.name
        });
        
        return result;
      } catch (error) {
        // Log failure
        const duration = Date.now() - startTime;
        logger.error({
          repository: config.name,
          method: methodName,
          duration,
          success: false,
          error: error.message,
          entityType: config.entity.name
        });
        
        throw error;
      }
    };
  });
  
  // Create repository with original methods preserved as private methods
  const repositoryConfig = {
    ...config,
    initialize: (instance) => {
      // Store original methods with underscore prefix
      for (const method of standardMethods) {
        instance[`_${method}`] = instance[method];
      }
      
      return instance;
    },
    methods: {
      ...methodsWithLogging
    }
  };
  
  return repository(repositoryConfig);
}

// Usage with a logger
import pino from 'pino';
const logger = pino();

const OrderRepository = loggedRepository({
  name: 'OrderRepository',
  entity: Order,
  methods: {
    async findByCustomer(customerId) {
      return this.findMany({ customerId });
    }
  }
}, logger);
```

## Extending Domain Services

### Creating Service Base Classes

Create specialized service base classes:

```javascript
import { domainService } from 'domainify';

// Transaction-aware domain service
function transactionalDomainService(config, transactionManager) {
  return domainService({
    ...config,
    methods: {
      ...(config.methods || {}),
      
      // Run operations in a transaction
      async withTransaction(callback) {
        return transactionManager.runInTransaction(async (session) => {
          return callback(session);
        });
      }
    }
  });
}

// Usage
const OrderProcessingService = transactionalDomainService({
  name: 'OrderProcessingService',
  methods: {
    async processOrder(order) {
      return this.withTransaction(async (session) => {
        // Operations running in a transaction
        
        // Verify inventory
        for (const item of order.items) {
          const product = await productRepository.findById(
            item.productId, 
            { session }
          );
          
          if (!product || product.stockLevel < item.quantity) {
            throw new Error(`Insufficient stock for product ${item.productId}`);
          }
        }
        
        // Update inventory and mark order as processed
        // ...
        
        // Return the processed order
        return processedOrder;
      });
    }
  }
}, transactionManager);
```

### Adding Cross-Cutting Concerns

Add features like validation, logging, and metrics:

```javascript
import { domainService } from 'domainify';

// Enhanced domain service with monitoring
function monitoredDomainService(config, { logger, metrics }) {
  // Get original methods
  const originalMethods = config.methods || {};
  
  // Create wrapped methods with monitoring
  const wrappedMethods = {};
  
  Object.keys(originalMethods).forEach(methodName => {
    const originalMethod = originalMethods[methodName];
    
    // Skip non-function properties
    if (typeof originalMethod !== 'function') {
      wrappedMethods[methodName] = originalMethod;
      return;
    }
    
    // Wrap method with monitoring
    wrappedMethods[methodName] = async function(...args) {
      // Start metrics
      const timer = metrics.startTimer(`${config.name}.${methodName}`);
      
      try {
        // Log invocation
        logger.info({
          service: config.name,
          method: methodName,
          args: args.map(arg => 
            typeof arg === 'object' && arg !== null && arg.id 
              ? { id: arg.id, type: arg.constructor?.name } 
              : typeof arg
          )
        });
        
        // Call original method
        const result = await originalMethod.apply(this, args);
        
        // Log success
        logger.info({
          service: config.name,
          method: methodName,
          status: 'success',
          resultType: result && result.constructor?.name
        });
        
        // Record success metric
        metrics.incrementCounter(`${config.name}.${methodName}.success`);
        
        return result;
      } catch (error) {
        // Log error
        logger.error({
          service: config.name,
          method: methodName,
          status: 'error',
          error: {
            message: error.message,
            stack: error.stack
          }
        });
        
        // Record error metric
        metrics.incrementCounter(`${config.name}.${methodName}.error`);
        
        throw error;
      } finally {
        // End metrics timer
        timer.end();
      }
    };
  });
  
  // Return service with wrapped methods
  return domainService({
    ...config,
    methods: wrappedMethods
  });
}

// Usage
const metrics = {
  startTimer: (name) => {
    const start = Date.now();
    return {
      end: () => {
        const duration = Date.now() - start;
        console.log(`METRIC TIMER: ${name} - ${duration}ms`);
      }
    };
  },
  incrementCounter: (name) => {
    console.log(`METRIC COUNT: ${name}`);
  }
};

const logger = {
  info: (data) => console.log('INFO:', data),
  error: (data) => console.error('ERROR:', data)
};

const PaymentProcessingService = monitoredDomainService({
  name: 'PaymentProcessingService',
  methods: {
    async processPayment(payment) {
      // Payment processing logic
      return processedPayment;
    }
  }
}, { logger, metrics });
```

## Extending Specifications

### Creating Specification Factories

Create custom specification factories:

```javascript
import { specification } from 'domainify';

// Factory for date range specifications
function dateRangeSpecification(config) {
  return specification({
    ...config,
    parameters: ['startDate', 'endDate', ...(config.parameters || [])],
    isSatisfiedBy: (entity, params) => {
      const { startDate, endDate } = params;
      const entityDate = entity[config.dateField];
      
      if (!entityDate) {
        return false;
      }
      
      const isAfterStart = !startDate || entityDate >= startDate;
      const isBeforeEnd = !endDate || entityDate <= endDate;
      
      return isAfterStart && isBeforeEnd;
    },
    toQuery: ({ startDate, endDate }) => {
      const query = {};
      
      if (startDate) {
        query[config.dateField] = query[config.dateField] || {};
        query[config.dateField].$gte = startDate;
      }
      
      if (endDate) {
        query[config.dateField] = query[config.dateField] || {};
        query[config.dateField].$lte = endDate;
      }
      
      return query;
    }
  });
}

// Usage
const CreatedWithinRange = dateRangeSpecification({
  name: 'CreatedWithinRange',
  dateField: 'createdAt'
});

const ModifiedWithinRange = dateRangeSpecification({
  name: 'ModifiedWithinRange',
  dateField: 'updatedAt'
});

// Use the specification
const lastWeekOrders = await orderRepository.findMany(
  CreatedWithinRange({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  })
);
```

### Creating Reusable Specification Libraries

Build a library of common specifications:

```javascript
import { specification } from 'domainify';

// Library of reusable specifications
const SpecificationLibrary = {
  // Common status specifications
  Status: {
    Active: specification({
      name: 'Status.Active',
      isSatisfiedBy: entity => entity.status === 'ACTIVE',
      toQuery: () => ({ status: 'ACTIVE' })
    }),
    
    Inactive: specification({
      name: 'Status.Inactive',
      isSatisfiedBy: entity => entity.status === 'INACTIVE',
      toQuery: () => ({ status: 'INACTIVE' })
    }),
    
    WithStatus: specification({
      name: 'Status.WithStatus',
      parameters: ['status'],
      isSatisfiedBy: (entity, { status }) => entity.status === status,
      toQuery: ({ status }) => ({ status })
    })
  },
  
  // Specification for entities with tags
  Tags: {
    WithTag: specification({
      name: 'Tags.WithTag',
      parameters: ['tag'],
      isSatisfiedBy: (entity, { tag }) => 
        Array.isArray(entity.tags) && entity.tags.includes(tag),
      toQuery: ({ tag }) => ({ tags: tag })
    }),
    
    WithAnyTag: specification({
      name: 'Tags.WithAnyTag',
      parameters: ['tags'],
      isSatisfiedBy: (entity, { tags }) => 
        Array.isArray(entity.tags) && 
        entity.tags.some(tag => tags.includes(tag)),
      toQuery: ({ tags }) => ({ tags: { $in: tags } })
    }),
    
    WithAllTags: specification({
      name: 'Tags.WithAllTags',
      parameters: ['tags'],
      isSatisfiedBy: (entity, { tags }) => 
        Array.isArray(entity.tags) && 
        tags.every(tag => entity.tags.includes(tag)),
      toQuery: ({ tags }) => ({ tags: { $all: tags } })
    })
  },
  
  // Specifications for text search
  Text: {
    Contains: specification({
      name: 'Text.Contains',
      parameters: ['field', 'text'],
      isSatisfiedBy: (entity, { field, text }) => {
        const value = entity[field];
        return typeof value === 'string' && 
          value.toLowerCase().includes(text.toLowerCase());
      },
      toQuery: ({ field, text }) => ({
        [field]: { $regex: text, $options: 'i' }
      })
    }),
    
    StartsWith: specification({
      name: 'Text.StartsWith',
      parameters: ['field', 'text'],
      isSatisfiedBy: (entity, { field, text }) => {
        const value = entity[field];
        return typeof value === 'string' && 
          value.toLowerCase().startsWith(text.toLowerCase());
      },
      toQuery: ({ field, text }) => ({
        [field]: { $regex: `^${text}`, $options: 'i' }
      })
    })
  }
};

// Usage
const activeUsersWithAdminTag = await userRepository.findMany(
  SpecificationLibrary.Status.Active
    .and(SpecificationLibrary.Tags.WithTag({ tag: 'admin' }))
);

const productsMatchingSearch = await productRepository.findMany(
  SpecificationLibrary.Text.Contains({ 
    field: 'name', 
    text: searchQuery 
  })
);
```

## Integration with External Systems

### Extending Adapters for Custom Storage

Create custom adapters for repositories:

```javascript
import { InMemoryAdapter } from 'domainify/adapters';

// Custom ElasticSearch adapter
class ElasticsearchAdapter {
  constructor(options) {
    this.client = options.client;
    this.index = options.index;
    this.refreshOnWrite = options.refreshOnWrite || false;
  }
  
  async findById(id) {
    try {
      const response = await this.client.get({
        index: this.index,
        id
      });
      
      return response.found ? response._source : null;
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }
  
  async findOne(query) {
    const results = await this.findMany(query, { limit: 1 });
    return results.length > 0 ? results[0] : null;
  }
  
  async findMany(query, options = {}) {
    const esQuery = this._buildQuery(query);
    
    const searchParams = {
      index: this.index,
      body: {
        query: esQuery,
        size: options.limit || 100,
        from: options.skip || 0
      }
    };
    
    if (options.sort) {
      searchParams.body.sort = Object.entries(options.sort).map(
        ([field, dir]) => ({ [field]: { order: dir === 'asc' ? 'asc' : 'desc' } })
      );
    }
    
    const response = await this.client.search(searchParams);
    
    return response.hits.hits.map(hit => hit._source);
  }
  
  async save(entity) {
    const response = await this.client.index({
      index: this.index,
      id: entity.id,
      body: entity,
      refresh: this.refreshOnWrite ? 'true' : 'false'
    });
    
    return entity;
  }
  
  async update(id, changes) {
    const entity = await this.findById(id);
    
    if (!entity) {
      throw new Error(`Entity with id ${id} not found`);
    }
    
    const updated = { ...entity, ...changes };
    
    await this.client.update({
      index: this.index,
      id,
      body: {
        doc: changes
      },
      refresh: this.refreshOnWrite ? 'true' : 'false'
    });
    
    return updated;
  }
  
  async delete(id) {
    try {
      await this.client.delete({
        index: this.index,
        id,
        refresh: this.refreshOnWrite ? 'true' : 'false'
      });
      
      return true;
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }
  
  async count(query) {
    const esQuery = this._buildQuery(query);
    
    const response = await this.client.count({
      index: this.index,
      body: {
        query: esQuery
      }
    });
    
    return response.count;
  }
  
  // Helper to convert from repository query to Elasticsearch query
  _buildQuery(query) {
    // Simplified implementation - would need more complex translation
    if (Object.keys(query).length === 0) {
      return { match_all: {} };
    }
    
    return {
      bool: {
        must: Object.entries(query).map(([field, value]) => {
          if (typeof value === 'object') {
            // Handle operators like $gt, $lt, etc.
            const conditions = [];
            
            if (value.$gt !== undefined) {
              conditions.push({ range: { [field]: { gt: value.$gt } } });
            }
            
            if (value.$gte !== undefined) {
              conditions.push({ range: { [field]: { gte: value.$gte } } });
            }
            
            if (value.$lt !== undefined) {
              conditions.push({ range: { [field]: { lt: value.$lt } } });
            }
            
            if (value.$lte !== undefined) {
              conditions.push({ range: { [field]: { lte: value.$lte } } });
            }
            
            if (value.$in !== undefined) {
              conditions.push({ terms: { [field]: value.$in } });
            }
            
            return conditions.length === 1 
              ? conditions[0] 
              : { bool: { must: conditions } };
          }
          
          return { term: { [field]: value } };
        })
      }
    };
  }
}

// Usage
import { Client } from '@elastic/elasticsearch';

const elasticClient = new Client({
  node: 'http://localhost:9200'
});

const ProductRepository = repository({
  name: 'ProductRepository',
  entity: Product,
  methods: {
    async findByName(name) {
      return this.findMany({
        name: { $regex: name, $options: 'i' }
      });
    }
  }
});

const productRepo = ProductRepository.create(
  new ElasticsearchAdapter({
    client: elasticClient,
    index: 'products',
    refreshOnWrite: true
  })
);
```

### Event Publishing Integration

Integrate with event bus systems:

```javascript
import { aggregate } from 'domainify';

// Event sourced aggregate with event publishing
function eventPublishingAggregate(config, eventBus) {
  return aggregate({
    ...config,
    
    // Initialize with empty events array
    initialize: (instance) => {
      instance._domainEvents = [];
      return instance;
    },
    
    methods: {
      ...(config.methods || {}),
      
      // Add a domain event
      addDomainEvent(event) {
        this._domainEvents.push({
          ...event,
          entityId: this.id,
          entityType: config.name,
          timestamp: new Date()
        });
        return this;
      },
      
      // Get all domain events
      get domainEvents() {
        return [...this._domainEvents];
      },
      
      // Publish events and clear
      async publishEvents() {
        if (this._domainEvents.length === 0) {
          return this;
        }
        
        // Publish events to the event bus
        await eventBus.publishEvents(this._domainEvents);
        
        // Return a new instance with no events
        const AggregateClass = this.constructor;
        return AggregateClass.create({
          ...this,
          _domainEvents: []
        });
      }
    }
  });
}

// Example with Kafka event bus
class KafkaEventBus {
  constructor(producer, topicPrefix = 'domain-events') {
    this.producer = producer;
    this.topicPrefix = topicPrefix;
  }
  
  async publishEvents(events) {
    const messages = events.map(event => ({
      topic: `${this.topicPrefix}.${event.type}`,
      messages: [
        { 
          key: event.entityId,
          value: JSON.stringify(event)
        }
      ]
    }));
    
    await this.producer.sendBatch({ topicMessages: messages });
    
    return events;
  }
}

// Usage
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();
await producer.connect();

const eventBus = new KafkaEventBus(producer);

const Order = eventPublishingAggregate({
  name: 'Order',
  schema: orderSchema,
  identity: 'id',
  methods: {
    cancel(reason) {
      if (['DELIVERED', 'CANCELLED'].includes(this.status)) {
        throw new Error('Cannot cancel delivered or already cancelled orders');
      }
      
      const cancelledOrder = Order.create({
        ...this,
        status: 'CANCELLED',
        cancellationReason: reason,
        cancelledAt: new Date()
      });
      
      return cancelledOrder.addDomainEvent({
        type: 'OrderCancelled',
        payload: {
          orderId: this.id,
          reason,
          cancelledAt: new Date()
        }
      });
    }
  }
}, eventBus);

// Application service
class OrderService {
  constructor(orderRepository, eventBus) {
    this.orderRepository = orderRepository;
    this.eventBus = eventBus;
  }
  
  async cancelOrder(orderId, reason) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    const cancelledOrder = order.cancel(reason);
    
    // Publish events before saving
    const finalOrder = await cancelledOrder.publishEvents();
    
    // Save the updated order
    await this.orderRepository.save(finalOrder);
    
    return finalOrder;
  }
}
```

## Best Practices for Extending Domainify

1. **Start with composition before inheritance**: Use factory functions and composition for extensions
2. **Keep core domain logic pure**: Extensions should enhance, not mix with core domain logic
3. **Create reusable extensions**: Design extensions to be reusable across different domain objects
4. **Test extensions thoroughly**: Ensure extensions don't break core domain behavior
5. **Document extension points**: Make it clear how others can extend your components
6. **Use consistent patterns**: Apply the same extension patterns across your codebase
7. **Separate technical concerns**: Keep infrastructure concerns in appropriate layers
8. **Avoid tight coupling**: Design extensions that don't create tight coupling between components

## Next Steps

- Learn about [Testing in DDD](./testing.md) to ensure your extensions work correctly
- Explore [Best Practices](./best-practices.md) for more guidance on effective DDD
- Review [Anti-patterns](./antipatterns.md) to avoid common pitfalls in your extensions