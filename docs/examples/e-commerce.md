# E-commerce Domain Model

This example demonstrates how to model an e-commerce domain using DomainDrivenJS. We'll create a complete domain model with value objects, entities, aggregates, and repositories.

## Domain Overview

Our e-commerce domain will include:

- Products with variants and inventory tracking
- Customers with addresses and payment methods
- Shopping carts
- Orders with line items and shipping details
- Payment processing

## Value Objects

Let's start with some fundamental value objects:

```javascript
import { z } from 'zod';
import { valueObject } from 'domaindrivenjs';

// Money value object for handling currency
const Money = valueObject({
  name: 'Money',
  schema: z.object({
    amount: z.number().nonnegative(),
    currency: z.string().length(3)
  }),
  methods: {
    add(other) {
      if (this.currency !== other.currency) {
        throw new Error(`Cannot add different currencies: ${this.currency} and ${other.currency}`);
      }
      return Money.create({
        amount: this.amount + other.amount,
        currency: this.currency
      });
    },
    subtract(other) {
      if (this.currency !== other.currency) {
        throw new Error(`Cannot subtract different currencies: ${this.currency} and ${other.currency}`);
      }
      return Money.create({
        amount: Math.max(0, this.amount - other.amount),
        currency: this.currency
      });
    },
    multiply(factor) {
      return Money.create({
        amount: this.amount * factor,
        currency: this.currency
      });
    },
    format(locale = 'en-US') {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: this.currency
      }).format(this.amount);
    }
  }
});

// Address value object
const Address = valueObject({
  name: 'Address',
  schema: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().min(1),
    country: z.string().length(2)
  }),
  methods: {
    format() {
      return `${this.street}, ${this.city}, ${this.state} ${this.zipCode}, ${this.country}`;
    },
    isInternational(homeCountry = 'US') {
      return this.country !== homeCountry;
    }
  }
});

// Email value object
const Email = valueObject({
  name: 'Email',
  schema: z.string().email().toLowerCase(),
  methods: {
    getDomain() {
      return this.split('@')[1];
    },
    getUsername() {
      return this.split('@')[0];
    },
    mask() {
      const username = this.getUsername();
      const domain = this.getDomain();
      const maskedUsername = username.length <= 2 
        ? username 
        : `${username.charAt(0)}${'*'.repeat(username.length - 2)}${username.charAt(username.length - 1)}`;
      return `${maskedUsername}@${domain}`;
    }
  }
});
```

## Entities

Now let's define some entities:

```javascript
import { entity } from 'domaindrivenjs';

// Product variant entity
const ProductVariant = entity({
  name: 'ProductVariant',
  schema: z.object({
    id: z.string().uuid(),
    sku: z.string().min(1),
    name: z.string().min(1),
    price: Money.schema,
    attributes: z.record(z.string()),
    stockLevel: z.number().int().nonnegative()
  }),
  identity: 'id',
  methods: {
    decreaseStock(quantity) {
      if (quantity > this.stockLevel) {
        throw new Error(`Insufficient stock: requested ${quantity}, available ${this.stockLevel}`);
      }
      return ProductVariant.update(this, {
        stockLevel: this.stockLevel - quantity
      });
    },
    increaseStock(quantity) {
      return ProductVariant.update(this, {
        stockLevel: this.stockLevel + quantity
      });
    },
    updatePrice(newPrice) {
      return ProductVariant.update(this, { price: newPrice });
    },
    isInStock() {
      return this.stockLevel > 0;
    },
    hasAttribute(key, value) {
      return this.attributes[key] === value;
    }
  }
});

// Customer entity
const Customer = entity({
  name: 'Customer',
  schema: z.object({
    id: z.string().uuid(),
    email: Email.schema,
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phoneNumber: z.string().optional(),
    addresses: z.record(Address.schema).default({}),
    defaultAddressId: z.string().optional(),
    createdAt: z.date()
  }),
  identity: 'id',
  methods: {
    getFullName() {
      return `${this.firstName} ${this.lastName}`;
    },
    addAddress(id, address) {
      const updatedAddresses = { ...this.addresses, [id]: address };
      return Customer.update(this, {
        addresses: updatedAddresses,
        defaultAddressId: this.defaultAddressId || id
      });
    },
    setDefaultAddress(id) {
      if (!this.addresses[id]) {
        throw new Error(`Address with ID ${id} not found`);
      }
      return Customer.update(this, { defaultAddressId: id });
    },
    getDefaultAddress() {
      if (!this.defaultAddressId || !this.addresses[this.defaultAddressId]) {
        return null;
      }
      return this.addresses[this.defaultAddressId];
    }
  }
});
```

## Aggregates

Let's create our aggregates:

```javascript
import { aggregate, domainEvent } from 'domaindrivenjs';

// Product aggregate
const Product = aggregate({
  name: 'Product',
  schema: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    description: z.string(),
    categories: z.array(z.string()),
    variants: z.array(ProductVariant.schema),
    defaultVariantId: z.string().uuid().optional(),
    isActive: z.boolean().default(true),
    createdAt: z.date(),
    updatedAt: z.date()
  }),
  identity: 'id',
  invariants: [
    {
      name: 'Product must have at least one variant',
      check: product => product.variants.length > 0
    }
  ],
  methods: {
    getDefaultVariant() {
      if (this.defaultVariantId) {
        return this.variants.find(v => v.id === this.defaultVariantId);
      }
      return this.variants[0];
    },
    
    addVariant(variant) {
      const newVariants = [...this.variants, variant];
      return Product.update(this, {
        variants: newVariants,
        defaultVariantId: this.defaultVariantId || variant.id,
        updatedAt: new Date()
      });
    },
    
    updateVariant(variantId, updates) {
      const variantIndex = this.variants.findIndex(v => v.id === variantId);
      if (variantIndex === -1) {
        throw new Error(`Variant with ID ${variantId} not found`);
      }
      
      const currentVariant = this.variants[variantIndex];
      const updatedVariant = ProductVariant.update(currentVariant, updates);
      
      const newVariants = [
        ...this.variants.slice(0, variantIndex),
        updatedVariant,
        ...this.variants.slice(variantIndex + 1)
      ];
      
      return Product.update(this, {
        variants: newVariants,
        updatedAt: new Date()
      });
    },
    
    deactivate() {
      return Product.update(this, {
        isActive: false,
        updatedAt: new Date()
      });
    },
    
    activate() {
      return Product.update(this, {
        isActive: true,
        updatedAt: new Date()
      });
    }
  }
});

// Define domain events
const OrderCreated = domainEvent({
  name: 'OrderCreated',
  schema: z.object({
    orderId: z.string().uuid(),
    customerId: z.string().uuid(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      variantId: z.string().uuid(),
      quantity: z.number().int().positive(),
      price: Money.schema
    })),
    total: Money.schema,
    createdAt: z.date()
  })
});

const OrderPaid = domainEvent({
  name: 'OrderPaid',
  schema: z.object({
    orderId: z.string().uuid(),
    paymentId: z.string().uuid(),
    amount: Money.schema,
    paidAt: z.date()
  })
});

// Order line item value object
const OrderLineItem = valueObject({
  name: 'OrderLineItem',
  schema: z.object({
    productId: z.string().uuid(),
    productName: z.string(),
    variantId: z.string().uuid(),
    variantName: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: Money.schema
  }),
  methods: {
    getSubtotal() {
      return this.unitPrice.multiply(this.quantity);
    }
  }
});

// Order aggregate
const Order = aggregate({
  name: 'Order',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    items: z.array(OrderLineItem.schema),
    status: z.enum([
      'DRAFT', 
      'PLACED', 
      'PAID', 
      'SHIPPED', 
      'DELIVERED', 
      'CANCELLED'
    ]),
    shippingAddress: Address.schema.optional(),
    billingAddress: Address.schema.optional(),
    shippingMethod: z.string().optional(),
    paymentId: z.string().optional(),
    trackingNumber: z.string().optional(),
    placedAt: z.date().optional(),
    paidAt: z.date().optional(),
    shippedAt: z.date().optional(),
    deliveredAt: z.date().optional(),
    cancelledAt: z.date().optional(),
    createdAt: z.date(),
    updatedAt: z.date()
  }),
  identity: 'id',
  invariants: [
    {
      name: 'Placed order must have items',
      check: order => order.status !== 'PLACED' || order.items.length > 0
    },
    {
      name: 'Placed order must have shipping address',
      check: order => order.status !== 'PLACED' || order.shippingAddress !== undefined
    },
    {
      name: 'Shipped order must have tracking number',
      check: order => order.status !== 'SHIPPED' || order.trackingNumber !== undefined
    }
  ],
  methods: {
    addItem(productId, productName, variantId, variantName, quantity, unitPrice) {
      if (this.status !== 'DRAFT') {
        throw new Error(`Cannot add items to an order with status: ${this.status}`);
      }
      
      const newItem = OrderLineItem.create({
        productId,
        productName,
        variantId,
        variantName,
        quantity,
        unitPrice
      });
      
      // Check if the product variant already exists in the order
      const existingItemIndex = this.items.findIndex(item => 
        item.variantId === variantId
      );
      
      let updatedItems;
      
      if (existingItemIndex >= 0) {
        // Update the quantity if the variant already exists
        const existingItem = this.items[existingItemIndex];
        const updatedItem = OrderLineItem.create({
          ...existingItem,
          quantity: existingItem.quantity + quantity
        });
        
        updatedItems = [
          ...this.items.slice(0, existingItemIndex),
          updatedItem,
          ...this.items.slice(existingItemIndex + 1)
        ];
      } else {
        // Add a new item
        updatedItems = [...this.items, newItem];
      }
      
      return Order.update(this, {
        items: updatedItems,
        updatedAt: new Date()
      });
    },
    
    removeItem(variantId) {
      if (this.status !== 'DRAFT') {
        throw new Error(`Cannot remove items from an order with status: ${this.status}`);
      }
      
      const updatedItems = this.items.filter(item => 
        item.variantId !== variantId
      );
      
      // If nothing was removed, throw an error
      if (updatedItems.length === this.items.length) {
        throw new Error(`Variant ${variantId} not found in order`);
      }
      
      return Order.update(this, {
        items: updatedItems,
        updatedAt: new Date()
      });
    },
    
    updateQuantity(variantId, quantity) {
      if (this.status !== 'DRAFT') {
        throw new Error(`Cannot update items in an order with status: ${this.status}`);
      }
      
      if (quantity <= 0) {
        return this.removeItem(variantId);
      }
      
      const itemIndex = this.items.findIndex(item => item.variantId === variantId);
      
      if (itemIndex === -1) {
        throw new Error(`Variant ${variantId} not found in order`);
      }
      
      const item = this.items[itemIndex];
      const updatedItem = OrderLineItem.create({
        ...item,
        quantity
      });
      
      const updatedItems = [
        ...this.items.slice(0, itemIndex),
        updatedItem,
        ...this.items.slice(itemIndex + 1)
      ];
      
      return Order.update(this, {
        items: updatedItems,
        updatedAt: new Date()
      });
    },
    
    setShippingAddress(address) {
      if (this.status !== 'DRAFT') {
        throw new Error(`Cannot set shipping address for an order with status: ${this.status}`);
      }
      
      return Order.update(this, {
        shippingAddress: address,
        billingAddress: this.billingAddress || address, // Default billing to shipping if not set
        updatedAt: new Date()
      });
    },
    
    setBillingAddress(address) {
      if (this.status !== 'DRAFT') {
        throw new Error(`Cannot set billing address for an order with status: ${this.status}`);
      }
      
      return Order.update(this, {
        billingAddress: address,
        updatedAt: new Date()
      });
    },
    
    setShippingMethod(method) {
      if (this.status !== 'DRAFT') {
        throw new Error(`Cannot set shipping method for an order with status: ${this.status}`);
      }
      
      return Order.update(this, {
        shippingMethod: method,
        updatedAt: new Date()
      });
    },
    
    placeOrder() {
      if (this.status !== 'DRAFT') {
        throw new Error(`Cannot place an order with status: ${this.status}`);
      }
      
      if (this.items.length === 0) {
        throw new Error('Cannot place an empty order');
      }
      
      if (!this.shippingAddress) {
        throw new Error('Shipping address is required');
      }
      
      if (!this.shippingMethod) {
        throw new Error('Shipping method is required');
      }
      
      const placedAt = new Date();
      
      const updatedOrder = Order.update(this, {
        status: 'PLACED',
        placedAt,
        updatedAt: placedAt
      });
      
      return updatedOrder.emitEvent(OrderCreated.create({
        orderId: this.id,
        customerId: this.customerId,
        items: this.items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.unitPrice
        })),
        total: this.getTotal(),
        createdAt: placedAt
      }));
    },
    
    markAsPaid(paymentId) {
      if (this.status !== 'PLACED') {
        throw new Error(`Cannot mark as paid an order with status: ${this.status}`);
      }
      
      const paidAt = new Date();
      
      const updatedOrder = Order.update(this, {
        status: 'PAID',
        paymentId,
        paidAt,
        updatedAt: paidAt
      });
      
      return updatedOrder.emitEvent(OrderPaid.create({
        orderId: this.id,
        paymentId,
        amount: this.getTotal(),
        paidAt
      }));
    },
    
    ship(trackingNumber) {
      if (this.status !== 'PAID') {
        throw new Error(`Cannot ship an order with status: ${this.status}`);
      }
      
      const shippedAt = new Date();
      
      return Order.update(this, {
        status: 'SHIPPED',
        trackingNumber,
        shippedAt,
        updatedAt: shippedAt
      });
    },
    
    deliver() {
      if (this.status !== 'SHIPPED') {
        throw new Error(`Cannot deliver an order with status: ${this.status}`);
      }
      
      const deliveredAt = new Date();
      
      return Order.update(this, {
        status: 'DELIVERED',
        deliveredAt,
        updatedAt: deliveredAt
      });
    },
    
    cancel() {
      if (!['DRAFT', 'PLACED'].includes(this.status)) {
        throw new Error(`Cannot cancel an order with status: ${this.status}`);
      }
      
      const cancelledAt = new Date();
      
      return Order.update(this, {
        status: 'CANCELLED',
        cancelledAt,
        updatedAt: cancelledAt
      });
    },
    
    getTotal() {
      // Calculate subtotal from items
      let subtotal = Money.create({ amount: 0, currency: 'USD' });
      
      for (const item of this.items) {
        subtotal = subtotal.add(item.getSubtotal());
      }
      
      // In a real app, we'd calculate shipping, tax, etc.
      return subtotal;
    }
  }
});

// Cart Item value object
const CartItem = valueObject({
  name: 'CartItem',
  schema: z.object({
    productId: z.string().uuid(),
    productName: z.string(),
    variantId: z.string().uuid(),
    variantName: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: Money.schema,
    attributes: z.record(z.string()).optional()
  }),
  methods: {
    getSubtotal() {
      return this.unitPrice.multiply(this.quantity);
    }
  }
});

// Shopping Cart aggregate
const ShoppingCart = aggregate({
  name: 'ShoppingCart',
  schema: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid().optional(),
    items: z.array(CartItem.schema),
    createdAt: z.date(),
    updatedAt: z.date()
  }),
  identity: 'id',
  methods: {
    addItem(productId, productName, variantId, variantName, quantity, unitPrice, attributes) {
      const existingItemIndex = this.items.findIndex(
        item => item.variantId === variantId
      );
      
      let updatedItems;
      
      if (existingItemIndex >= 0) {
        // Update quantity if item exists
        const existingItem = this.items[existingItemIndex];
        const updatedItem = CartItem.create({
          ...existingItem,
          quantity: existingItem.quantity + quantity
        });
        
        updatedItems = [
          ...this.items.slice(0, existingItemIndex),
          updatedItem,
          ...this.items.slice(existingItemIndex + 1)
        ];
      } else {
        // Add new item
        const newItem = CartItem.create({
          productId,
          productName,
          variantId,
          variantName,
          quantity,
          unitPrice,
          attributes
        });
        
        updatedItems = [...this.items, newItem];
      }
      
      return ShoppingCart.update(this, {
        items: updatedItems,
        updatedAt: new Date()
      });
    },
    
    updateQuantity(variantId, quantity) {
      if (quantity <= 0) {
        return this.removeItem(variantId);
      }
      
      const itemIndex = this.items.findIndex(
        item => item.variantId === variantId
      );
      
      if (itemIndex === -1) {
        throw new Error(`Item with variant ID ${variantId} not found in cart`);
      }
      
      const item = this.items[itemIndex];
      const updatedItem = CartItem.create({
        ...item,
        quantity
      });
      
      const updatedItems = [
        ...this.items.slice(0, itemIndex),
        updatedItem,
        ...this.items.slice(itemIndex + 1)
      ];
      
      return ShoppingCart.update(this, {
        items: updatedItems,
        updatedAt: new Date()
      });
    },
    
    removeItem(variantId) {
      const updatedItems = this.items.filter(
        item => item.variantId !== variantId
      );
      
      if (updatedItems.length === this.items.length) {
        throw new Error(`Item with variant ID ${variantId} not found in cart`);
      }
      
      return ShoppingCart.update(this, {
        items: updatedItems,
        updatedAt: new Date()
      });
    },
    
    clear() {
      return ShoppingCart.update(this, {
        items: [],
        updatedAt: new Date()
      });
    },
    
    isEmpty() {
      return this.items.length === 0;
    },
    
    assignToCustomer(customerId) {
      return ShoppingCart.update(this, {
        customerId,
        updatedAt: new Date()
      });
    },
    
    getTotal() {
      let total = Money.create({ amount: 0, currency: 'USD' });
      
      for (const item of this.items) {
        total = total.add(item.getSubtotal());
      }
      
      return total;
    },
    
    toOrder(orderId, customer) {
      if (this.isEmpty()) {
        throw new Error('Cannot create an order from an empty cart');
      }
      
      return Order.create({
        id: orderId,
        customerId: customer.id,
        items: this.items.map(item => OrderLineItem.create({
          productId: item.productId,
          productName: item.productName,
          variantId: item.variantId,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }
});
```

## Repositories

Now let's define repositories for our aggregates:

```javascript
import { repository } from 'domaindrivenjs';
import { MongoAdapter } from 'domaindrivenjs/adapters';

// Product repository
const ProductRepository = repository({
  name: 'ProductRepository',
  entity: Product,
  methods: {
    async findByCategory(category) {
      return this.findMany({ categories: category });
    },
    
    async findActive() {
      return this.findMany({ isActive: true });
    },
    
    async findWithStockBelow(threshold) {
      // Complex query using the adapter directly
      const products = await this.findMany();
      
      // Filter products with variants that have stock below threshold
      return products.filter(product => 
        product.variants.some(variant => variant.stockLevel < threshold)
      );
    }
  }
});

// Order repository
const OrderRepository = repository({
  name: 'OrderRepository',
  entity: Order,
  methods: {
    async findByCustomerId(customerId) {
      return this.findMany({ customerId });
    },
    
    async findByStatus(status) {
      return this.findMany({ status });
    },
    
    async findRecentOrders(days = 30) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      return this.findMany({
        createdAt: { $gte: cutoffDate }
      });
    }
  }
});

// Customer repository
const CustomerRepository = repository({
  name: 'CustomerRepository',
  entity: Customer,
  methods: {
    async findByEmail(email) {
      return this.findOne({ email });
    }
  }
});

// Shopping Cart repository
const ShoppingCartRepository = repository({
  name: 'ShoppingCartRepository',
  entity: ShoppingCart,
  methods: {
    async findByCustomerId(customerId) {
      return this.findOne({ customerId });
    }
  }
});

// Create repositories with MongoDB adapters
const createRepositories = (connectionString) => {
  const productRepo = ProductRepository.create(
    new MongoAdapter({
      connectionString,
      database: 'ecommerce',
      collection: 'products'
    })
  );
  
  const orderRepo = OrderRepository.create(
    new MongoAdapter({
      connectionString,
      database: 'ecommerce',
      collection: 'orders'
    })
  );
  
  const customerRepo = CustomerRepository.create(
    new MongoAdapter({
      connectionString,
      database: 'ecommerce',
      collection: 'customers'
    })
  );
  
  const cartRepo = ShoppingCartRepository.create(
    new MongoAdapter({
      connectionString,
      database: 'ecommerce',
      collection: 'carts'
    })
  );
  
  return {
    productRepo,
    orderRepo,
    customerRepo,
    cartRepo
  };
};
```

## Domain Services

Finally, let's create some domain services to orchestrate operations:

```javascript
import { domainService } from 'domaindrivenjs';
import { v4 as uuidv4 } from 'uuid';

// Order processing service
const OrderProcessingService = domainService({
  name: 'OrderProcessingService',
  dependencies: {
    productRepository: 'required',
    orderRepository: 'required',
    customerRepository: 'required'
  },
  methods: {
    async createOrderFromCart(cart, customer, { productRepository, orderRepository }) {
      // Verify all products are available
      for (const item of cart.items) {
        const product = await productRepository.findById(item.productId);
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        
        const variant = product.variants.find(v => v.id === item.variantId);
        if (!variant) {
          throw new Error(`Variant ${item.variantId} not found for product ${item.productId}`);
        }
        
        if (variant.stockLevel < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productName}: requested ${item.quantity}, available ${variant.stockLevel}`);
        }
      }
      
      // Create order
      const orderId = uuidv4();
      const order = cart.toOrder(orderId, customer);
      
      // Save order
      await orderRepository.save(order);
      
      return order;
    },
    
    async placeOrder(orderId, shippingAddress, { orderRepository, productRepository }) {
      // Get the order
      const order = await orderRepository.findById(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }
      
      // Verify stock again before placing
      for (const item of order.items) {
        const product = await productRepository.findById(item.productId);
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        
        const variant = product.variants.find(v => v.id === item.variantId);
        if (!variant) {
          throw new Error(`Variant ${item.variantId} not found for product ${item.productId}`);
        }
        
        if (variant.stockLevel < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productName}: requested ${item.quantity}, available ${variant.stockLevel}`);
        }
      }
      
      // Set shipping address and place order
      const updatedOrder = order
        .setShippingAddress(shippingAddress)
        .placeOrder();
      
      // Update stock levels
      for (const item of order.items) {
        const product = await productRepository.findById(item.productId);
        const variantIndex = product.variants.findIndex(v => v.id === item.variantId);
        const variant = product.variants[variantIndex];
        
        const updatedVariant = variant.decreaseStock(item.quantity);
        const updatedProduct = product.updateVariant(variant.id, { 
          stockLevel: updatedVariant.stockLevel 
        });
        
        await productRepository.save(updatedProduct);
      }
      
      // Save order
      await orderRepository.save(updatedOrder);
      
      return updatedOrder;
    },
    
    async processPayment(orderId, paymentInfo, { orderRepository }) {
      // Get the order
      const order = await orderRepository.findById(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }
      
      if (order.status !== 'PLACED') {
        throw new Error(`Cannot process payment for order with status ${order.status}`);
      }
      
      // In a real app, we'd integrate with a payment gateway here
      const paymentId = uuidv4();
      
      // Mark order as paid
      const updatedOrder = order.markAsPaid(paymentId);
      
      // Save order
      await orderRepository.save(updatedOrder);
      
      return {
        order: updatedOrder,
        payment: {
          id: paymentId,
          amount: order.getTotal(),
          status: 'COMPLETED'
        }
      };
    }
  }
});

// Pricing service
const PricingService = domainService({
  name: 'PricingService',
  methods: {
    calculateShipping(order, shippingMethod) {
      // In a real app, this would calculate based on weight, distance, etc.
      const baseShippingCost = {
        'STANDARD': 5.99,
        'EXPRESS': 15.99,
        'OVERNIGHT': 29.99,
        'FREE': 0
      }[shippingMethod] || 5.99;
      
      // International shipping costs more
      const internationalSurcharge = order.shippingAddress?.isInternational() ? 15 : 0;
      
      // Free shipping for orders over $100
      const subtotal = order.getTotal();
      const freeShippingDiscount = 
        subtotal.amount >= 100 && shippingMethod === 'STANDARD' ? baseShippingCost : 0;
      
      const shippingCost = baseShippingCost + internationalSurcharge - freeShippingDiscount;
      
      return Money.create({
        amount: shippingCost,
        currency: subtotal.currency
      });
    },
    
    calculateTax(order) {
      const subtotal = order.getTotal();
      
      // In a real app, tax would be calculated based on location and product types
      const taxRate = 0.08; // 8% tax rate
      
      return Money.create({
        amount: subtotal.amount * taxRate,
        currency: subtotal.currency
      });
    },
    
    calculateOrderTotal(order, shippingMethod) {
      const subtotal = order.getTotal();
      const shipping = this.calculateShipping(order, shippingMethod);
      const tax = this.calculateTax(order);
      
      return subtotal.add(shipping).add(tax);
    }
  }
});
```

## Using the Domain Model

Here's an example of how you might use all these components together:

```javascript
// Set up repositories
const {
  productRepo,
  orderRepo,
  customerRepo,
  cartRepo
} = createRepositories('mongodb://localhost:27017');

// Create services
const orderService = OrderProcessingService.create({
  productRepository: productRepo,
  orderRepository: orderRepo,
  customerRepository: customerRepo
});

const pricingService = PricingService.create();

// Example usage
async function processOrder(cartId, customerId) {
  // Get customer and cart
  const customer = await customerRepo.findById(customerId);
  const cart = await cartRepo.findById(cartId);
  
  if (!customer) {
    throw new Error(`Customer ${customerId} not found`);
  }
  
  if (!cart || cart.isEmpty()) {
    throw new Error('Cart is empty');
  }
  
  // Create order
  const order = await orderService.createOrderFromCart(cart, customer);
  
  // Get shipping address
  const shippingAddress = customer.getDefaultAddress();
  if (!shippingAddress) {
    throw new Error('Customer has no default address');
  }
  
  // Place order
  const placedOrder = await orderService.placeOrder(order.id, shippingAddress);
  
  // Process payment (simplified)
  const { order: paidOrder, payment } = await orderService.processPayment(
    placedOrder.id,
    { type: 'CREDIT_CARD', last4: '1234' }
  );
  
  // Clear cart
  const clearedCart = cart.clear();
  await cartRepo.save(clearedCart);
  
  return {
    order: paidOrder,
    payment
  };
}

// Event handlers
const eventBus = new EventBus();

eventBus.subscribe(OrderCreated, async (event) => {
  console.log(`Order ${event.orderId} was created with ${event.items.length} items`);
  
  // Send confirmation email
  // await emailService.sendOrderConfirmation(event.customerId, event.orderId);
});

eventBus.subscribe(OrderPaid, async (event) => {
  console.log(`Order ${event.orderId} was paid with payment ${event.paymentId}`);
  
  // Update inventory and accounting systems
  // await inventoryService.confirmAllocation(event.orderId);
  // await accountingService.recordRevenue(event.orderId, event.amount);
});
```

## Conclusion

This example demonstrates how DomainDrivenJS can be used to build a complete domain model for an e-commerce application. The model includes:

- **Value Objects**: Money, Address, Email, OrderLineItem, CartItem
- **Entities**: ProductVariant, Customer
- **Aggregates**: Product, Order, ShoppingCart
- **Repositories**: ProductRepository, OrderRepository, CustomerRepository, ShoppingCartRepository
- **Domain Services**: OrderProcessingService, PricingService
- **Domain Events**: OrderCreated, OrderPaid

The domain model enforces business rules, maintains consistency, and provides a clear structure for the application logic. It uses DomainDrivenJS's composition-based approach to create a flexible, maintainable codebase that accurately represents the e-commerce domain.
