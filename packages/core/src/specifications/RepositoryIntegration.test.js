// packages/core/src/specifications/RepositoryIntegration.test.js
import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";
import { aggregate } from "../aggregates/Base.js";
import { repository } from "../repositories/Base.js";
import { createInMemoryAdapter } from "../repositories/adapters/InMemory.js";
import {
  specification,
  propertyEquals,
  propertyGreaterThan,
  propertyContains,
  propertyIn,
} from "./index.js";

describe("Specification Repository Integration", () => {
  // Define a test aggregate
  const Product = aggregate({
    name: "Product",
    schema: z.object({
      id: z.string(),
      name: z.string(),
      price: z.number().positive(),
      category: z.string(),
      tags: z.array(z.string()).optional(),
      inStock: z.boolean().default(true),
    }),
    identity: "id",
    methodsFactory: (factory) => ({}),
  });

  // Sample data
  const products = [
    {
      id: "prod-1",
      name: "Budget Laptop",
      price: 499.99,
      category: "electronics",
      tags: ["budget", "laptop"],
      inStock: true,
    },
    {
      id: "prod-2",
      name: "Premium Smartphone",
      price: 999.99,
      category: "electronics",
      tags: ["premium", "smartphone"],
      inStock: true,
    },
    {
      id: "prod-3",
      name: "Ergonomic Chair",
      price: 299.99,
      category: "furniture",
      tags: ["office", "ergonomic"],
      inStock: false,
    },
    {
      id: "prod-4",
      name: "Wireless Headphones",
      price: 149.99,
      category: "electronics",
      tags: ["audio", "wireless"],
      inStock: true,
    },
    {
      id: "prod-5",
      name: "Coffee Table",
      price: 199.99,
      category: "furniture",
      tags: ["living room"],
      inStock: true,
    },
  ];

  // Set up the repository with initial data
  let productRepository;

  beforeEach(() => {
    // Create proper aggregates from data
    const aggregateProducts = products.map((data) => Product.create(data));

    // Initialize repository with proper aggregate instances
    const inMemoryAdapter = createInMemoryAdapter({
      identity: "id",
      initialData: aggregateProducts,
    });

    productRepository = repository({
      aggregate: Product,
      adapter: inMemoryAdapter,
    });
  });

  describe("findBySpecification", () => {
    it("should find aggregates using a simple specification", async () => {
      // Arrange
      const inStockSpec = propertyEquals("inStock", true);

      // Act
      const results = await productRepository.findBySpecification(inStockSpec);

      // Assert
      expect(results.length).toBe(4); // 4 of 5 products are in stock
      expect(results.every((product) => product.inStock === true)).toBe(true);
    });

    it("should find aggregates using a combined specification", async () => {
      // Arrange
      const electronics = propertyEquals("category", "electronics");
      const expensive = propertyGreaterThan("price", 500);
      const expensiveElectronics = electronics.and(expensive);

      // Act
      const results =
        await productRepository.findBySpecification(expensiveElectronics);

      // Assert
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("prod-2"); // Only the premium smartphone is an expensive electronic
    });

    it("should find aggregates using OR specifications", async () => {
      // Arrange
      const electronics = propertyEquals("category", "electronics");
      const furniture = propertyEquals("category", "furniture");
      const inStock = propertyEquals("inStock", true);

      // Either electronics OR furniture that are in stock
      const inStockElectronicsOrFurniture = inStock.and(
        electronics.or(furniture),
      );

      // Act
      const results = await productRepository.findBySpecification(
        inStockElectronicsOrFurniture,
      );

      // Assert
      expect(results.length).toBe(4); // All in-stock products
      expect(results.every((product) => product.inStock)).toBe(true);
      expect(
        results.every(
          (product) =>
            product.category === "electronics" ||
            product.category === "furniture",
        ),
      ).toBe(true);
    });

    it("should find aggregates using NOT specifications", async () => {
      // Arrange
      const notFurniture = propertyEquals("category", "furniture").not();

      // Act
      const results = await productRepository.findBySpecification(notFurniture);

      // Assert
      expect(results.length).toBe(3); // All electronics products
      expect(results.every((product) => product.category !== "furniture")).toBe(
        true,
      );
    });

    it("should find aggregates using custom specifications", async () => {
      // Arrange
      const PremiumProduct = specification({
        name: "PremiumProduct",
        isSatisfiedBy: (product) => {
          // Premium if price > 300 and has 'premium' tag
          return (
            product.price > 300 &&
            product.tags &&
            product.tags.includes("premium")
          );
        },
      });

      // Act
      const results =
        await productRepository.findBySpecification(PremiumProduct);

      // Assert
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("prod-2"); // Premium Smartphone
    });

    it("should find aggregates using array specifications", async () => {
      // Arrange
      const hasWirelessTag = propertyContains("tags", "wireless");

      // Act
      const results =
        await productRepository.findBySpecification(hasWirelessTag);

      // Assert
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("prod-4"); // Wireless Headphones
    });

    it("should find aggregates using propertyIn specification", async () => {
      // Arrange
      const selectedCategories = propertyIn("category", [
        "electronics",
        "appliances",
      ]);

      // Act
      const results =
        await productRepository.findBySpecification(selectedCategories);

      // Assert
      expect(results.length).toBe(3); // All electronics products
      expect(
        results.every((product) => product.category === "electronics"),
      ).toBe(true);
    });

    it("should handle complex specification chains", async () => {
      // Arrange
      const electronics = propertyEquals("category", "electronics");
      const furniture = propertyEquals("category", "furniture");
      const expensive = propertyGreaterThan("price", 300);
      const inStock = propertyEquals("inStock", true);

      // Either:
      // - Expensive electronics that are in stock, OR
      // - Any furniture
      const complexSpec = expensive.and(electronics).and(inStock).or(furniture);

      // Act
      const results = await productRepository.findBySpecification(complexSpec);

      // Assert
      expect(results.length).toBe(4); // Premium Smartphone, Budget Laptop, and both furniture items
      results.forEach((product) => {
        if (product.category === "electronics") {
          // Electronics must be expensive and in stock
          expect(product.price).toBeGreaterThan(300);
          expect(product.inStock).toBe(true);
        } else {
          // Must be furniture
          expect(product.category).toBe("furniture");
        }
      });
    });
  });

  describe("count with specifications", () => {
    it("should count aggregates using specifications", async () => {
      // Arrange
      const inStock = propertyEquals("inStock", true);
      const electronics = propertyEquals("category", "electronics");
      const inStockElectronics = inStock.and(electronics);

      // Act
      const totalCount = await productRepository.count();
      const inStockCount = await productRepository.count({ inStock: true });
      const electronicsCount = await productRepository.count({
        category: "electronics",
      });

      // Assert
      expect(totalCount).toBe(5);
      expect(inStockCount).toBe(4);
      expect(electronicsCount).toBe(3);
    });
  });

  describe("business rules with specifications", () => {
    it("should use specifications to enforce business rules", () => {
      // Arrange
      const CanBeFeatured = specification({
        name: "CanBeFeatured",
        isSatisfiedBy: (product) =>
          product.inStock === true &&
          product.price >= 100 &&
          product.tags &&
          product.tags.length >= 2,
      });

      // Act & Assert - Check which products can be featured
      expect(CanBeFeatured.isSatisfiedBy(products[0])).toBe(true); // Budget Laptop
      expect(CanBeFeatured.isSatisfiedBy(products[1])).toBe(true); // Premium Smartphone
      expect(CanBeFeatured.isSatisfiedBy(products[2])).toBe(false); // Ergonomic Chair (not in stock)
      expect(CanBeFeatured.isSatisfiedBy(products[3])).toBe(true); // Wireless Headphones
      expect(CanBeFeatured.isSatisfiedBy(products[4])).toBe(false); // Coffee Table (only 1 tag)

      // Simulate a business operation that uses the specification
      function markAsFeatured(product) {
        if (!CanBeFeatured.isSatisfiedBy(product)) {
          throw new Error(`Product ${product.id} cannot be featured`);
        }

        return {
          ...product,
          featured: true,
        };
      }

      // Test the business operation
      expect(() => markAsFeatured(products[0])).not.toThrow();
      expect(() => markAsFeatured(products[2])).toThrow();

      // The operation should have modified the product appropriately
      const featuredProduct = markAsFeatured(products[0]);
      expect(featuredProduct.featured).toBe(true);
    });
  });
});
