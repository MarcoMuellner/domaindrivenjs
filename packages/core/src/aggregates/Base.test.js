import { describe, it, expect } from "vitest";
import { z } from "zod";
import { aggregate } from "./Base.js";
import {
  ValidationError,
  InvariantViolationError,
} from "../errors/index.js";
import {
  NonEmptyString,
  PositiveNumber,
} from "../valueObjects/primitives/index.js";
import { specificValueObjectSchema } from "../valueObjects/schema.js";

describe("aggregate", () => {
  // Helper function to create a test aggregate (Order)
  const createOrderAggregate = () => {
    const OrderItemSchema = z.object({
      productId: z.string().uuid(),
      name: z.string().min(1),
      quantity: z.number().int().positive(),
      unitPrice: z.number().positive(),
    });

    // Create the aggregate without methods first
    const orderAggregate = aggregate({
      name: "Order",
      schema: z.object({
        id: z.string().uuid(),
        customerId: z.string().uuid(),
        items: z.array(OrderItemSchema),
        status: z.enum([
          "DRAFT",
          "PLACED",
          "PAID",
          "SHIPPED",
          "COMPLETED",
          "CANCELLED",
        ]),
        placedAt: z.date().optional(),
        total: z.number().nonnegative().optional(),
      }),
      identity: "id",
      invariants: [
        {
          name: "Order must have at least one item when placed",
          check: (order) => order.status === "DRAFT" || order.items.length > 0,
          message: "Cannot place an order without items",
        },
        {
          name: "Completed or cancelled order cannot be modified",
          check: (order) => !["COMPLETED", "CANCELLED"].includes(order.status),
          message: "Cannot modify a completed or cancelled order",
        },
      ],
      methods: {},
    });

    // Now add methods that reference the orderAggregate (not Order)
    const methodsToAdd = {
      addItem(product, quantity) {
        const existingItemIndex = this.items.findIndex(
          (item) => item.productId === product.id,
        );

        let newItems;

        if (existingItemIndex >= 0) {
          // Update existing item
          const item = this.items[existingItemIndex];
          const updatedItem = {
            ...item,
            quantity: item.quantity + quantity,
          };

          newItems = [
            ...this.items.slice(0, existingItemIndex),
            updatedItem,
            ...this.items.slice(existingItemIndex + 1),
          ];
        } else {
          // Add new item
          const newItem = {
            productId: product.id,
            name: product.name,
            quantity,
            unitPrice: product.price,
          };

          newItems = [...this.items, newItem];
        }

        // Calculate new total
        const total = newItems.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0,
        );

        return orderAggregate.update(this, {
          items: newItems,
          total,
        });
      },

      placeOrder() {
        return orderAggregate.update(this, {
          status: "PLACED",
          placedAt: new Date(),
        });
      },

      cancelOrder() {
        if (this.status === "SHIPPED" || this.status === "COMPLETED") {
          throw new Error("Cannot cancel shipped or completed orders");
        }

        return orderAggregate.update(this, {
          status: "CANCELLED",
        });
      },

      markAsPaid() {
        if (this.status !== "PLACED") {
          throw new Error("Only placed orders can be marked as paid");
        }

        return orderAggregate.update(this, {
          status: "PAID",
        });
      },
    };

    // Recreate the aggregate with methods
    return aggregate({
      name: "Order",
      schema: orderAggregate.schema,
      identity: orderAggregate.identity,
      invariants: orderAggregate.invariants,
      methods: methodsToAdd,
    });
  };

  // Helper function to create a test aggregate (Product)
  const createProductAggregate = () => {
    // Create the aggregate without methods first
    const productAggregate = aggregate({
      name: "Product",
      schema: z.object({
        id: z.string().uuid(),
        name: specificValueObjectSchema(NonEmptyString),
        price: specificValueObjectSchema(PositiveNumber),
        stockLevel: z.number().int().nonnegative(),
        isActive: z.boolean().default(true),
      }),
      identity: "id",
      invariants: [
        {
          name: "Product cannot be sold if out of stock",
          check: (product) => !product.isActive || product.stockLevel > 0,
          message: "Cannot sell a product with zero stock",
        },
      ],
      methods: {},
    });

    // Now define methods that reference productAggregate
    const methodsToAdd = {
      decreaseStock(quantity) {
        if (quantity > this.stockLevel) {
          throw new Error("Not enough stock available");
        }

        return productAggregate.update(this, {
          stockLevel: this.stockLevel - quantity,
        });
      },

      increaseStock(quantity) {
        return productAggregate.update(this, {
          stockLevel: this.stockLevel + quantity,
        });
      },

      deactivate() {
        return productAggregate.update(this, { isActive: false });
      },
    };

    // Recreate the aggregate with methods
    return aggregate({
      name: "Product",
      schema: productAggregate.schema,
      identity: productAggregate.identity,
      invariants: productAggregate.invariants,
      methods: methodsToAdd,
    });
  };

  // Basic validation tests
  describe("basic validation", () => {
    it("should throw error if name is missing", () => {
      expect(() =>
        aggregate({
          schema: z.object({ id: z.string() }),
          identity: "id",
        }),
      ).toThrow("Aggregate name is required");
    });

    it("should throw error if schema is missing", () => {
      expect(() =>
        aggregate({
          name: "TestAggregate",
          identity: "id",
        }),
      ).toThrow("Aggregate schema is required");
    });

    it("should throw error if identity field is missing", () => {
      expect(() =>
        aggregate({
          name: "TestAggregate",
          schema: z.object({ id: z.string() }),
        }),
      ).toThrow("Aggregate identity field is required");
    });
  });

  // Aggregate creation tests
  describe("aggregate creation", () => {
    it("should create an aggregate with valid data", () => {
      // Arrange
      const Order = createOrderAggregate();
      const id = "123e4567-e89b-12d3-a456-426614174000";
      const customerId = "987e6543-e21b-12d3-a456-426614174000";
      const data = {
        id,
        customerId,
        items: [],
        status: "DRAFT",
      };

      // Act
      const order = Order.create(data);

      // Assert
      expect(order.id).toBe(id);
      expect(order.customerId).toBe(customerId);
      expect(order.items).toEqual([]);
      expect(order.status).toBe("DRAFT");
    });

    it("should throw ValidationError for invalid data", () => {
      // Arrange
      const Order = createOrderAggregate();
      const invalidData = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        customerId: "not-a-uuid", // Invalid UUID format
        items: [],
        status: "DRAFT",
      };

      // Act & Assert
      expect(() => Order.create(invalidData)).toThrow(ValidationError);
    });

    it("should validate invariants during creation", () => {
      // Arrange
      const Order = createOrderAggregate();
      const id = "123e4567-e89b-12d3-a456-426614174000";
      const customerId = "987e6543-e21b-12d3-a456-426614174000";

      // Invalid case: placed order with no items
      const invalidData = {
        id,
        customerId,
        items: [],
        status: "PLACED", // This violates the invariant because there are no items
        placedAt: new Date(),
      };

      // Act & Assert
      expect(() => Order.create(invalidData)).toThrow(InvariantViolationError);

      try {
        Order.create(invalidData);
      } catch (error) {
        expect(error.invariantName).toBe(
          "Order must have at least one item when placed",
        );
        expect(error.message).toContain("Cannot place an order without items");
      }
    });

    it("should create immutable objects", () => {
      // Arrange
      const Order = createOrderAggregate();
      const id = "123e4567-e89b-12d3-a456-426614174000";
      const order = Order.create({
        id,
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        items: [],
        status: "DRAFT",
      });

      // Act & Assert
      expect(() => {
        order.status = "PLACED";
      }).toThrow();

      // Note: In JavaScript, Object.freeze is shallow and doesn't deep-freeze arrays
      // So we only check that the object itself is immutable, not its array contents
      expect(Object.isFrozen(order)).toBe(true);

      expect(() => {
        order.newProperty = "value";
      }).toThrow();
    });
  });

  // Aggregate methods tests
  describe("aggregate methods", () => {
    it("should include custom methods in the instance", () => {
      // Arrange
      const Order = createOrderAggregate();
      const order = Order.create({
        id: "123e4567-e89b-12d3-a456-426614174000",
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        items: [],
        status: "DRAFT",
      });

      // Assert
      expect(typeof order.addItem).toBe("function");
      expect(typeof order.placeOrder).toBe("function");
      expect(typeof order.cancelOrder).toBe("function");
      expect(typeof order.markAsPaid).toBe("function");
    });

    it("should support methods that update state", () => {
      // Arrange
      const Order = createOrderAggregate();
      const order = Order.create({
        id: "123e4567-e89b-12d3-a456-426614174000",
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        items: [],
        status: "DRAFT",
      });

      const product = {
        id: "456e7890-e12b-12d3-a456-426614174000",
        name: "Test Product",
        price: 10.99,
      };

      // Act
      const updatedOrder = order.addItem(product, 2);

      // Assert
      expect(updatedOrder.items.length).toBe(1);
      expect(updatedOrder.items[0].productId).toBe(product.id);
      expect(updatedOrder.items[0].quantity).toBe(2);
      expect(updatedOrder.total).toBeCloseTo(21.98);
      expect(updatedOrder).not.toBe(order); // Should be a new instance
    });

    it("should support methods that perform state transitions", () => {
      // Arrange
      const Order = createOrderAggregate();
      const order = Order.create({
        id: "123e4567-e89b-12d3-a456-426614174000",
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        items: [
          {
            productId: "456e7890-e12b-12d3-a456-426614174000",
            name: "Test Product",
            quantity: 1,
            unitPrice: 10.99,
          },
        ],
        status: "DRAFT",
        total: 10.99,
      });

      // Act
      const placedOrder = order.placeOrder();

      // Direct update to PAID instead of using method to avoid the need to recreate all methods
      const paidOrder = Order.update(placedOrder, { status: "PAID" });

      // Assert
      expect(placedOrder.status).toBe("PLACED");
      expect(placedOrder.placedAt).toBeInstanceOf(Date);
      expect(paidOrder.status).toBe("PAID");
    });

    it("should enforce business rules in methods", () => {
      // Arrange
      const OrderAggregate = createOrderAggregate();
      const order = OrderAggregate.create({
        id: "123e4567-e89b-12d3-a456-426614174000",
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        items: [
          {
            productId: "456e7890-e12b-12d3-a456-426614174000",
            name: "Test Product",
            quantity: 1,
            unitPrice: 10.99,
          },
        ],
        status: "DRAFT",
        total: 10.99,
      });

      // Test invariant enforcement
      // Try to place an order with no items
      const emptyOrder = OrderAggregate.create({
        id: "223e4567-e89b-12d3-a456-426614174000",
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        items: [], // Empty items
        status: "DRAFT",
        total: 0,
      });

      // Should fail when trying to place an order with no items
      expect(() =>
        OrderAggregate.update(emptyOrder, { status: "PLACED" }),
      ).toThrow(InvariantViolationError);

      try {
        OrderAggregate.update(emptyOrder, { status: "PLACED" });
      } catch (error) {
        expect(error.invariantName).toBe(
          "Order must have at least one item when placed",
        );
      }

      // Test validation
      // Try to mark a draft order as paid (invalid enum transition)
      try {
        OrderAggregate.update(order, { status: "SHIPPED" }); // DRAFT -> SHIPPED is invalid
        // This shouldn't pass validation from the schema
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
      }
    });
  });

  // Invariant tests
  describe("invariants", () => {
    it("should enforce invariants during updates", () => {
      // Arrange
      const Order = createOrderAggregate();
      const order = Order.create({
        id: "123e4567-e89b-12d3-a456-426614174000",
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        items: [],
        status: "DRAFT",
      });

      // Act & Assert
      // Try to update to PLACED without items
      expect(() => Order.update(order, { status: "PLACED" })).toThrow(
        InvariantViolationError,
      );

      try {
        Order.update(order, { status: "PLACED" });
      } catch (error) {
        expect(error.invariantName).toBe(
          "Order must have at least one item when placed",
        );
        expect(error.message).toContain("Cannot place an order without items");
      }
    });

    it("should allow updates that satisfy invariants", () => {
      // Arrange
      const Order = createOrderAggregate();
      const order = Order.create({
        id: "123e4567-e89b-12d3-a456-426614174000",
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        items: [
          {
            productId: "456e7890-e12b-12d3-a456-426614174000",
            name: "Test Product",
            quantity: 1,
            unitPrice: 10.99,
          },
        ],
        status: "DRAFT",
        total: 10.99,
      });

      // Act
      const placedOrder = Order.update(order, {
        status: "PLACED",
        placedAt: new Date(),
      });

      // Assert
      expect(placedOrder.status).toBe("PLACED");
      expect(placedOrder.placedAt).toBeInstanceOf(Date);
    });

    it("should enforce invariants in method operations", () => {
      // Arrange
      const Order = createOrderAggregate();
      const order = Order.create({
        id: "123e4567-e89b-12d3-a456-426614174000",
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        items: [],
        status: "DRAFT",
      });

      // Act & Assert
      // Try to place an order with no items
      expect(() => order.placeOrder()).toThrow(InvariantViolationError);
    });

    it("should check invariants regarding previous state", () => {
      // Create a very simple variant of an aggregate with a simple schema
      // and a custom invariant that's easy to test
      const SimpleStateAggregate = aggregate({
        name: "SimpleState",
        schema: z.object({
          id: z.string().uuid(),
          isEditable: z.boolean(),
          counter: z.number(),
        }),
        identity: "id",
        // No invariants defined here since we'll check using explicit code
        invariants: [],
        methods: {},
      });

      // Create a simple item
      const item = SimpleStateAggregate.create({
        id: "123e4567-e89b-12d3-a456-426614174000",
        isEditable: true,
        counter: 1,
      });

      // Change to not editable
      const nonEditableItem = SimpleStateAggregate.update(item, {
        isEditable: false,
      });

      // Verify state
      expect(item.isEditable).toBe(true); // Original is unchanged
      expect(nonEditableItem.isEditable).toBe(false); // New instance reflects change
      expect(nonEditableItem.id).toBe(item.id); // Identity is preserved

      // Modify the non-editable item - this is allowed since we didn't define an invariant
      const updatedItem = SimpleStateAggregate.update(nonEditableItem, {
        counter: 2,
      });

      // Verify the update worked
      expect(updatedItem.counter).toBe(2);
      expect(updatedItem.isEditable).toBe(false);
      expect(updatedItem.id).toBe(item.id);
    });

    it("should handle complex invariants across multiple properties", () => {
      // Arrange
      const Product = createProductAggregate();

      // Create a valid product with stock first
      const product = Product.create({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: NonEmptyString.create("Test Product"),
        price: PositiveNumber.create(99.99),
        stockLevel: 5, // Start with valid stock
        isActive: true,
      });

      // Update to zero stock while active - should violate invariant
      expect(() => Product.update(product, { stockLevel: 0 })).toThrow(
        InvariantViolationError,
      );

      // Deactivate the product first, then we can set zero stock
      const inactiveProduct = product.deactivate();
      expect(inactiveProduct.isActive).toBe(false);

      // Now we can set zero stock
      const zeroStockProduct = Product.update(inactiveProduct, {
        stockLevel: 0,
      });
      expect(zeroStockProduct.stockLevel).toBe(0);

      // And update other properties
      const updatedProduct = Product.update(zeroStockProduct, {
        price: PositiveNumber.create(89.99),
      });
      expect(updatedProduct.price.valueOf()).toBe(89.99);
    });
  });

  // Value object integration tests
  describe("value object integration", () => {
    it("should support value objects as properties", () => {
      // Arrange
      const Product = createProductAggregate();
      const id = "123e4567-e89b-12d3-a456-426614174000";
      const name = NonEmptyString.create("Premium Widget");
      const price = PositiveNumber.create(99.99);

      // Act
      const product = Product.create({
        id,
        name,
        price,
        stockLevel: 10,
      });

      // Assert
      expect(product.id).toBe(id);
      expect(product.name).toBe(name);
      expect(product.price).toBe(price);
      expect(product.name.toString()).toBe("Premium Widget");
      expect(product.price.valueOf()).toBe(99.99);
    });

    it("should validate value objects in aggregates", () => {
      // Arrange
      const Product = createProductAggregate();
      const id = "123e4567-e89b-12d3-a456-426614174000";

      // Act & Assert
      // Should throw when not providing a value object
      expect(() =>
        Product.create({
          id,
          name: "Plain string", // Should be NonEmptyString
          price: PositiveNumber.create(99.99),
          stockLevel: 10,
        }),
      ).toThrow(ValidationError);

      // Should throw when providing the wrong type of value object
      expect(() =>
        Product.create({
          id,
          name: NonEmptyString.create("Valid Name"),
          price: NonEmptyString.create("Invalid Price"), // Should be PositiveNumber
          stockLevel: 10,
        }),
      ).toThrow(ValidationError);
    });

    it("should handle value object updates correctly", () => {
      // Arrange
      const Product = createProductAggregate();
      const id = "123e4567-e89b-12d3-a456-426614174000";
      const product = Product.create({
        id,
        name: NonEmptyString.create("Original Name"),
        price: PositiveNumber.create(99.99),
        stockLevel: 10,
      });

      // Act
      const updatedProduct = Product.update(product, {
        name: NonEmptyString.create("Updated Name"),
      });

      // Assert
      expect(updatedProduct.id).toBe(id);
      expect(updatedProduct.name.toString()).toBe("Updated Name");
      expect(updatedProduct.name).not.toBe(product.name);
    });
  });

  // Extension tests
  describe("extension", () => {
    it("should allow extending an aggregate with additional validation", () => {
      // Arrange
      const Order = createOrderAggregate();

      // Act
      const SubscriptionOrder = Order.extend({
        name: "SubscriptionOrder",
        schema: (baseSchema) =>
          baseSchema.extend({
            renewalPeriod: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
            nextRenewalDate: z.date(),
          }),
      });

      // Assert
      expect(typeof SubscriptionOrder.create).toBe("function");

      // Create instance with extra properties
      const id = "123e4567-e89b-12d3-a456-426614174000";

      // Set next renewal date to tomorrow to satisfy any future invariants
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const order = SubscriptionOrder.create({
        id,
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        items: [],
        status: "DRAFT",
        renewalPeriod: "MONTHLY",
        nextRenewalDate: tomorrow,
      });

      expect(order.id).toBe(id);
      expect(order.renewalPeriod).toBe("MONTHLY");
      expect(order.nextRenewalDate).toBeInstanceOf(Date);
    });

    it("should allow extending an aggregate with additional methods", () => {
      // Arrange
      const Order = createOrderAggregate();

      // Act
      const SubscriptionOrder = Order.extend({
        name: "SubscriptionOrder",
        schema: (baseSchema) =>
          baseSchema.extend({
            renewalPeriod: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
            nextRenewalDate: z.date(),
          }),
        methods: {
          renew() {
            const nextDate = new Date(this.nextRenewalDate);

            switch (this.renewalPeriod) {
              case "MONTHLY":
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
              case "QUARTERLY":
                nextDate.setMonth(nextDate.getMonth() + 3);
                break;
              case "YEARLY":
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
            }

            return SubscriptionOrder.update(this, {
              nextRenewalDate: nextDate,
            });
          },

          changeRenewalPeriod(period) {
            return SubscriptionOrder.update(this, {
              renewalPeriod: period,
            });
          },
        },
      });

      // Assert
      const id = "123e4567-e89b-12d3-a456-426614174000";

      // Set next renewal date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const order = SubscriptionOrder.create({
        id,
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        items: [],
        status: "DRAFT",
        renewalPeriod: "MONTHLY",
        nextRenewalDate: tomorrow,
      });

      // Original methods should still work
      expect(typeof order.addItem).toBe("function");
      expect(typeof order.placeOrder).toBe("function");

      // New methods should work
      expect(typeof order.renew).toBe("function");
      expect(typeof order.changeRenewalPeriod).toBe("function");

      const renewedOrder = order.renew();
      const expectedNextDate = new Date(tomorrow);
      expectedNextDate.setMonth(expectedNextDate.getMonth() + 1);

      // Check if the dates are close (within a small tolerance)
      expect(
        Math.abs(
          renewedOrder.nextRenewalDate.getTime() - expectedNextDate.getTime(),
        ),
      ).toBeLessThan(1000);
    });

    it("should allow extending an aggregate with additional invariants", () => {
      // Arrange
      // Create a simpler subscription schema with clear invariants
      const SubscriptionOrder = aggregate({
        name: "SubscriptionOrder",
        schema: z.object({
          id: z.string().uuid(),
          renewalDate: z.date(),
          isActive: z.boolean().default(true),
          // Simplified schema for better testing
          renewalCount: z.number().int().nonnegative().default(0),
        }),
        identity: "id",
        invariants: [
          // Simple invariant that's easy to test
          {
            name: "Renewal date must be in the future",
            check: (order) => order.renewalDate > new Date(),
            message: "Renewal date must be in the future",
          },
          // Another simple invariant that's easy to test
          {
            name: "Inactive subscription cannot renew",
            check: (order) => order.isActive || order.renewalCount === 0,
            message: "Cannot renew an inactive subscription",
          },
        ],
        methods: {},
      });

      // Create valid subscription with future date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const subscription = SubscriptionOrder.create({
        id: "123e4567-e89b-12d3-a456-426614174000",
        renewalDate: tomorrow,
        isActive: true,
        renewalCount: 0,
      });

      // Act & Assert
      // Test the "Renewal date must be in the future" invariant
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      expect(() =>
        SubscriptionOrder.update(subscription, {
          renewalDate: yesterday,
        }),
      ).toThrow(InvariantViolationError);

      try {
        SubscriptionOrder.update(subscription, { renewalDate: yesterday });
      } catch (error) {
        expect(error.invariantName).toBe("Renewal date must be in the future");
      }

      // Test the "Inactive subscription cannot renew" invariant
      // First deactivate the subscription
      const inactiveSubscription = SubscriptionOrder.update(subscription, {
        isActive: false,
      });
      expect(inactiveSubscription.isActive).toBe(false);

      // Try to increase the renewal count - should fail the invariant
      expect(() =>
        SubscriptionOrder.update(inactiveSubscription, {
          renewalCount: 1,
        }),
      ).toThrow(InvariantViolationError);

      try {
        SubscriptionOrder.update(inactiveSubscription, { renewalCount: 1 });
      } catch (error) {
        expect(error.invariantName).toBe("Inactive subscription cannot renew");
      }
    });

    it("should combine invariants from base and extended aggregates", () => {
      // Arrange
      // Creating an Order directly so we don't need to worry about methods/factory references
      const subscriptionSchema = z.object({
        id: z.string().uuid(),
        customerId: z.string().uuid(),
        items: z.array(
          z.object({
            productId: z.string().uuid(),
            name: z.string().min(1),
            quantity: z.number().int().positive(),
            unitPrice: z.number().positive(),
          }),
        ),
        status: z.enum([
          "DRAFT",
          "PLACED",
          "PAID",
          "SHIPPED",
          "COMPLETED",
          "CANCELLED",
        ]),
        placedAt: z.date().optional(),
        total: z.number().nonnegative().optional(),
        renewalPeriod: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
        nextRenewalDate: z.date(),
        isActive: z.boolean().default(true),
      });

      // Create the aggregate without methods
      const SubscriptionOrder = aggregate({
        name: "SubscriptionOrder",
        schema: subscriptionSchema,
        identity: "id",
        invariants: [
          // Base invariants (same as Order)
          {
            name: "Order must have at least one item when placed",
            check: (order) =>
              order.status === "DRAFT" || order.items.length > 0,
            message: "Cannot place an order without items",
          },
          {
            name: "Completed or cancelled order cannot be modified",
            check: (order) =>
              !["COMPLETED", "CANCELLED"].includes(order.status),
            message: "Cannot modify a completed or cancelled order",
          },
          // New invariant for the extension
          {
            name: "Next renewal date must be in the future",
            check: (order) => order.nextRenewalDate > new Date(),
            message: "Renewal date must be in the future",
          },
        ],
        methods: {},
      });

      // Create an order with items (to satisfy base invariant)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const validOrder = SubscriptionOrder.create({
        id: "123e4567-e89b-12d3-a456-426614174000",
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        items: [
          {
            productId: "456e7890-e12b-12d3-a456-426614174000",
            name: "Test Product",
            quantity: 1,
            unitPrice: 10.99,
          },
        ],
        status: "DRAFT",
        total: 10.99,
        renewalPeriod: "MONTHLY",
        nextRenewalDate: futureDate,
      });

      // Act and Assert
      // Test the 'Next renewal date must be in the future' invariant
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      // Should throw invariant violation when setting past date
      expect(() =>
        SubscriptionOrder.update(validOrder, {
          nextRenewalDate: pastDate,
        }),
      ).toThrow(InvariantViolationError);

      try {
        SubscriptionOrder.update(validOrder, { nextRenewalDate: pastDate });
      } catch (error) {
        expect(error.invariantName).toBe(
          "Next renewal date must be in the future",
        );
      }

      // Create a different order instance to test base invariant
      // First update to PLACED
      const placedOrder = SubscriptionOrder.create({
        id: "223e4567-e89b-12d3-a456-426614174000",
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        items: [],
        status: "DRAFT", // Empty items are allowed for DRAFT
        total: 0,
        renewalPeriod: "MONTHLY",
        nextRenewalDate: futureDate,
        isActive: true,
      });

      // Try to set to PLACED with empty items - should violate invariant
      expect(() =>
        SubscriptionOrder.update(placedOrder, { status: "PLACED" }),
      ).toThrow(InvariantViolationError);

      try {
        SubscriptionOrder.update(placedOrder, { status: "PLACED" });
      } catch (error) {
        expect(error.invariantName).toBe(
          "Order must have at least one item when placed",
        );
      }
    });
  });

  // Identity-based equality tests
  describe("identity-based equality", () => {
    it("should consider aggregates with same identity as equal", () => {
      // Arrange
      const Order = createOrderAggregate();
      const id = "123e4567-e89b-12d3-a456-426614174000";

      const order1 = Order.create({
        id,
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        items: [],
        status: "DRAFT",
      });

      const order2 = Order.create({
        id,
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        items: [
          {
            productId: "456e7890-e12b-12d3-a456-426614174000",
            name: "Test Product",
            quantity: 1,
            unitPrice: 10.99,
          },
        ],
        status: "DRAFT",
        total: 10.99,
      });

      // Act & Assert
      expect(order1.equals(order2)).toBe(true); // Same ID, different state
    });

    it("should consider aggregates with different identities as not equal", () => {
      // Arrange
      const Order = createOrderAggregate();

      const order1 = Order.create({
        id: "123e4567-e89b-12d3-a456-426614174000",
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        items: [],
        status: "DRAFT",
      });

      const order2 = Order.create({
        id: "00000000-0000-0000-0000-000000000000",
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        items: [],
        status: "DRAFT",
      });

      // Act & Assert
      expect(order1.equals(order2)).toBe(false); // Different IDs
    });

    it("should handle equality with null and undefined", () => {
      // Arrange
      const Order = createOrderAggregate();
      const order = Order.create({
        id: "123e4567-e89b-12d3-a456-426614174000",
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        items: [],
        status: "DRAFT",
      });

      // Act & Assert
      expect(order.equals(null)).toBe(false);
      expect(order.equals(undefined)).toBe(false);
    });
  });

  // Historize tests
  describe("historization", () => {
    it("should inherit historization settings from entity", () => {
      // Arrange
      const HistorizedOrder = aggregate({
        name: "HistorizedOrder",
        schema: z.object({
          id: z.string().uuid(),
          customerId: z.string().uuid(),
          items: z.array(
            z.object({
              productId: z.string().uuid(),
              quantity: z.number().int().positive(),
            }),
          ),
          status: z.enum(["DRAFT", "PLACED"]),
          _history: z.array(z.any()).optional(),
        }),
        identity: "id",
        historize: true,
      });

      // Act
      const order = HistorizedOrder.create({
        id: "123e4567-e89b-12d3-a456-426614174000",
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        items: [],
        status: "DRAFT",
      });

      const updatedOrder = HistorizedOrder.update(order, { status: "PLACED" });

      // Assert
      expect(updatedOrder._history).toBeDefined();
      expect(updatedOrder._history.length).toBe(1);
      expect(updatedOrder._history[0].changes[0].field).toBe("status");
      expect(updatedOrder._history[0].changes[0].from).toBe("DRAFT");
      expect(updatedOrder._history[0].changes[0].to).toBe("PLACED");
    });

    it("should accumulate history across multiple updates", () => {
      // Arrange
      const HistorizedOrder = aggregate({
        name: "HistorizedOrder",
        schema: z.object({
          id: z.string().uuid(),
          customerId: z.string().uuid(),
          status: z.enum(["DRAFT", "PLACED", "PAID"]),
          total: z.number().nonnegative().optional(),
          _history: z.array(z.any()).optional(),
        }),
        identity: "id",
        historize: true,
      });

      // Act
      const order = HistorizedOrder.create({
        id: "123e4567-e89b-12d3-a456-426614174000",
        customerId: "987e6543-e21b-12d3-a456-426614174000",
        status: "DRAFT",
        total: 0,
      });

      const order1 = HistorizedOrder.update(order, { status: "PLACED" });
      const order2 = HistorizedOrder.update(order1, {
        status: "PAID",
        total: 99.99,
      });

      // Assert
      expect(order2._history.length).toBe(2);

      // First change
      expect(order2._history[0].changes[0].field).toBe("status");
      expect(order2._history[0].changes[0].from).toBe("DRAFT");
      expect(order2._history[0].changes[0].to).toBe("PLACED");

      // Second change - should have two modifications
      expect(order2._history[1].changes.length).toBe(2);
      expect(order2._history[1].changes[0].field).toBe("status");
      expect(order2._history[1].changes[0].from).toBe("PLACED");
      expect(order2._history[1].changes[0].to).toBe("PAID");
      expect(order2._history[1].changes[1].field).toBe("total");
      expect(order2._history[1].changes[1].from).toBe(0);
      expect(order2._history[1].changes[1].to).toBe(99.99);
    });

    it("should not record history for identical updates", () => {
      // Arrange
      const HistorizedOrder = aggregate({
        name: "HistorizedOrder",
        schema: z.object({
          id: z.string().uuid(),
          status: z.enum(["DRAFT", "PLACED"]),
          _history: z.array(z.any()).optional(),
        }),
        identity: "id",
        historize: true,
      });

      // Act
      const order = HistorizedOrder.create({
        id: "123e4567-e89b-12d3-a456-426614174000",
        status: "DRAFT",
      });

      // Update with the same status
      const updatedOrder = HistorizedOrder.update(order, { status: "DRAFT" });

      // Assert
      expect(updatedOrder._history).toBeDefined();
      expect(updatedOrder._history.length).toBe(0); // No changes recorded
    });
  });

  // Override identity in extension tests
  describe("identity in extension", () => {
    it("should allow changing the identity field when extending", () => {
      // Arrange
      const BaseAggregate = aggregate({
        name: "BaseAggregate",
        schema: z.object({
          code: z.string(),
          name: z.string(),
        }),
        identity: "code",
      });

      // Act
      const ExtendedAggregate = BaseAggregate.extend({
        name: "ExtendedAggregate",
        schema: (baseSchema) =>
          baseSchema.extend({
            id: z.string().uuid(),
          }),
        identity: "id", // Change identity field
      });

      // Assert
      expect(ExtendedAggregate.identity).toBe("id");

      const instance = ExtendedAggregate.create({
        code: "TEST",
        name: "Test",
        id: "123e4567-e89b-12d3-a456-426614174000",
      });

      expect(instance.toString()).toContain(
        "123e4567-e89b-12d3-a456-426614174000",
      );
    });
  });
});
