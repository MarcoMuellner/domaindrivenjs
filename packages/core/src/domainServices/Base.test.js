// packages/core/src/domainServices/Base.test.js
import { describe, it, expect, vi } from "vitest";
import { domainService, DomainServiceError } from "./Base.js";

describe("domainService", () => {
  // Basic validation tests
  describe("basic validation", () => {
    it("should throw error if name is missing", () => {
      expect(() =>
        domainService({
          methodsFactory: (factory) => ({}),
          operationsFactory: () => ({ test: () => {} }),
        }),
      ).toThrow("Domain service name is required");
    });
    
    it("should throw error if method factory is missing", () => {
      expect(() =>
        domainService({
          name: "TestService",
          operationsFactory: () => ({}),
        }),
      ).toThrow("Method factory is required");
    });

    it("should throw error if operations factory is missing", () => {
      expect(() =>
        domainService({
          name: "TestService",
          methodsFactory: (factory) => ({}),
        }),
      ).toThrow("Operations factory is required");
    });

    it("should throw error if operations factory is not a function", () => {
      expect(() =>
        domainService({
          name: "TestService",
          methodsFactory: (factory) => ({}),
          operationsFactory: "not an object",
        }),
      ).toThrow("Operations factory is required");
    });

    it("should throw error if any operation is not a function", () => {
      expect(() => {
        const service = domainService({
          name: "TestService",
          methodsFactory: (factory) => ({}),
          operationsFactory: (factory) => ({
            validOp: () => {},
            invalidOp: "not a function",
          }),
        });
        
        service.create();
      }).toThrow("Operation 'invalidOp' must be a function");
    });
  });

  // Service creation tests
  describe("service creation", () => {
    it("should create a service with valid configuration", () => {
      // Arrange
      const TestService = domainService({
        name: "TestService",
        methodsFactory: (factory) => ({
          doSomething: function () {
            return "done";
          },
        }),
        operationsFactory: () => ({}),
      });

      // Act
      const service = TestService.create();

      // Assert
      expect(service.serviceName).toBe("TestService");
      expect(typeof service.doSomething).toBe("function");
      expect(service.doSomething()).toBe("done");
    });

    it("should inject dependencies", () => {
      // Arrange
      const TestService = domainService({
        name: "TestService",
        dependencies: {
          repo: null,
          logger: null,
        },
        methodsFactory: (factory) => ({
          getRepo: function () {
            return this.dependencies.repo;
          },
          getLogger: function () {
            return this.dependencies.logger;
          },
        }),
        operationsFactory: () => ({}),
      });

      const testRepo = { find: () => {} };
      const testLogger = { log: () => {} };

      // Act
      const service = TestService.create({
        repo: testRepo,
        logger: testLogger,
      });

      // Assert
      expect(service.getRepo()).toBe(testRepo);
      expect(service.getLogger()).toBe(testLogger);
    });

    it("should throw error if required dependencies are missing", () => {
      // Arrange
      const TestService = domainService({
        name: "TestService",
        dependencies: {
          requiredDep: {}, // Non-null means required
          optionalDep: null, // Null means optional
        },
        methodsFactory: (factory) => ({}),
        operationsFactory: (factory) => ({
          doSomething: function () {},
        }),
      });

      // Act & Assert
      expect(() => TestService.create({})).toThrow(DomainServiceError);
      expect(() => TestService.create({})).toThrow(
        "Missing required dependencies: requiredDep",
      );

      // Should work with just the required dependency
      expect(() => TestService.create({ requiredDep: {} })).not.toThrow();
    });

    it("should create immutable service instances", () => {
      // Arrange
      const TestService = domainService({
        name: "TestService",
        methodsFactory: (factory) => ({
          doSomething: function () {},
        }),
        operationsFactory: () => ({}),
      });

      // Act
      const service = TestService.create();

      // Assert - trying to modify should throw
      expect(() => {
        service.name = "ChangedName";
      }).toThrow();

      expect(() => {
        service.newProperty = "value";
      }).toThrow();

      expect(() => {
        service.doSomething = () => "changed";
      }).toThrow();
    });
  });

  // Service operations tests
  describe("service operations", () => {
    it("should provide access to dependencies in operations", () => {
      // Arrange
      const calculationFn = vi.fn().mockReturnValue(42);

      const MathService = domainService({
        name: "MathService",
        dependencies: {
          calculator: null,
        },
        methodsFactory: (factory) => ({
          calculate: function (x, y) {
            return this.dependencies.calculator.calculate(x, y);
          },
        }),
        operationsFactory: () => ({}),
      });

      const service = MathService.create({
        calculator: { calculate: calculationFn },
      });

      // Act
      const result = service.calculate(10, 32);

      // Assert
      expect(calculationFn).toHaveBeenCalledWith(10, 32);
      expect(result).toBe(42);
    });

    it("should bind 'this' correctly in operations", () => {
      // Arrange
      const TestService = domainService({
        name: "TestService",
        dependencies: {
          value: null,
        },
        methodsFactory: (factory) => ({
          getValue: function () {
            return this.dependencies.value;
          },
          operationUsingAnotherOperation: function () {
            // This should work because operations are bound to the service
            return this.getValue() * 2;
          },
        }),
        operationsFactory: () => ({}),
      });

      const service = TestService.create({ value: 21 });

      // Act & Assert
      expect(service.getValue()).toBe(21);
      expect(service.operationUsingAnotherOperation()).toBe(42);
    });
  });

  // Extension tests
  describe("service extension", () => {
    it("should allow extending services with additional operations", () => {
      // Arrange
      const BaseService = domainService({
        name: "BaseService",
        methodsFactory: (factory) => ({
          baseOperation: function () {
            return "base";
          },
        }),
        operationsFactory: () => ({}),
      });

      // Act
      const ExtendedService = BaseService.extend({
        name: "ExtendedService",
        methodsFactory: (factory) => ({
          extendedOperation: function () {
            return "extended";
          },
        }),
        operationsFactory: () => ({}),
      });

      const service = ExtendedService.create();

      // Assert
      expect(service.serviceName).toBe("ExtendedService");
      expect(service.baseOperation()).toBe("base");
      expect(service.extendedOperation()).toBe("extended");
    });

    it("should allow extending services with additional dependencies", () => {
      // Arrange
      const BaseService = domainService({
        name: "BaseService",
        dependencies: {
          baseDep: null,
        },
        methodsFactory: (factory) => ({
          getBaseDep: function () {
            return this.dependencies.baseDep;
          },
        }),
        operationsFactory: () => ({}),
      });

      // Act
      const ExtendedService = BaseService.extend({
        name: "ExtendedService",
        dependencies: {
          extendedDep: null,
        },
        methodsFactory: (factory) => ({
          getExtendedDep: function () {
            return this.dependencies.extendedDep;
          },
        }),
        operationsFactory: () => ({}),
      });

      const service = ExtendedService.create({
        baseDep: "base-value",
        extendedDep: "extended-value",
      });

      // Assert
      expect(service.getBaseDep()).toBe("base-value");
      expect(service.getExtendedDep()).toBe("extended-value");
    });

    it("should throw error if extended service name is missing", () => {
      // Arrange
      const BaseService = domainService({
        name: "BaseService",
        methodsFactory: (factory) => ({
          baseOperation: function () {},
        }),
        operationsFactory: () => ({}),
      });

      // Act & Assert
      expect(() =>
        BaseService.extend({
          methodsFactory: (factory) => ({}),
          operationsFactory: () => ({
            extendedOperation: function () {},
          }),
        }),
      ).toThrow("Extended domain service name is required");
    });

    it("should allow operation overrides in extended services", () => {
      // Arrange
      const BaseService = domainService({
        name: "BaseService",
        methodsFactory: (factory) => ({
          calculate: function (a, b) {
            return a + b;
          },
        }),
        operationsFactory: () => ({}),
      });

      // Act - override the calculate method
      const ExtendedService = BaseService.extend({
        name: "ExtendedService",
        methodsFactory: (factory) => ({
          calculate: function (a, b) {
            return a * b;
          },
        }),
        operationsFactory: () => ({}),
      });

      const baseService = BaseService.create();
      const extendedService = ExtendedService.create();

      // Assert
      expect(baseService.calculate(2, 3)).toBe(5);
      expect(extendedService.calculate(2, 3)).toBe(6);
    });
  });

  // Practical examples
  describe("practical examples", () => {
    it("should support a payment processor domain service example", () => {
      // Arrange - mock dependencies
      const accounts = {
        "acc-123": { balance: 1000, type: "STANDARD" },
        "acc-456": { balance: 500, type: "PREMIUM" },
      };

      const accountRepository = {
        findById: vi.fn((id) =>
          accounts[id] ? { ...accounts[id], id } : null,
        ),
        save: vi.fn((account) => {
          accounts[account.id] = { ...account };
          return Promise.resolve();
        }),
      };

      const paymentGateway = {
        processPayment: vi.fn().mockResolvedValue({ success: true }),
      };

      // Create the payment processor service
      const PaymentProcessor = domainService({
        name: "PaymentProcessor",
        dependencies: {
          accountRepository: null,
          paymentGateway: null,
        },
        methodsFactory: (factory) => ({
          async transferFunds(sourceAccountId, destinationAccountId, amount) {
            const { accountRepository } = this.dependencies;

            // Get accounts
            const sourceAccount =
              await accountRepository.findById(sourceAccountId);
            const destinationAccount =
              await accountRepository.findById(destinationAccountId);

            if (!sourceAccount || !destinationAccount) {
              return {
                success: false,
                error: "One or both accounts not found",
              };
            }

            // Check funds
            if (sourceAccount.balance < amount) {
              return { success: false, error: "Insufficient funds" };
            }

            // Update accounts
            const updatedSourceAccount = {
              ...sourceAccount,
              balance: sourceAccount.balance - amount,
            };

            const updatedDestinationAccount = {
              ...destinationAccount,
              balance: destinationAccount.balance + amount,
            };

            // Save updated accounts
            await accountRepository.save(updatedSourceAccount);
            await accountRepository.save(updatedDestinationAccount);

            return {
              success: true,
              data: {
                transferredAmount: amount,
                sourceBalance: updatedSourceAccount.balance,
                destinationBalance: updatedDestinationAccount.balance,
              },
            };
          },

          calculateFee(amount, accountType) {
            if (accountType === "PREMIUM") return amount * 0.01;
            return amount * 0.025;
          },

          async processPayment(accountId, amount) {
            const { accountRepository, paymentGateway } = this.dependencies;

            const account = await accountRepository.findById(accountId);
            if (!account) {
              return { success: false, error: "Account not found" };
            }

            const fee = this.calculateFee(amount, account.type);
            const totalAmount = amount + fee;

            if (account.balance < totalAmount) {
              return { success: false, error: "Insufficient funds" };
            }

            // Process payment
            const paymentResult = await paymentGateway.processPayment({
              accountId,
              amount,
              fee,
            });

            if (paymentResult.success) {
              // Update account balance
              const updatedAccount = {
                ...account,
                balance: account.balance - totalAmount,
              };

              await accountRepository.save(updatedAccount);

              return {
                success: true,
                data: {
                  amount,
                  fee,
                  totalAmount,
                  remainingBalance: updatedAccount.balance,
                },
              };
            }

            return paymentResult;
          },
        }),
        operationsFactory: () => ({}),
      });

      // Act
      const paymentProcessor = PaymentProcessor.create({
        accountRepository,
        paymentGateway,
      });

      // Assert - verify the service works correctly
      return paymentProcessor
        .transferFunds("acc-123", "acc-456", 200)
        .then((result) => {
          expect(result.success).toBe(true);
          expect(result.data.transferredAmount).toBe(200);
          expect(result.data.sourceBalance).toBe(800);
          expect(result.data.destinationBalance).toBe(700);

          expect(accountRepository.findById).toHaveBeenCalledWith("acc-123");
          expect(accountRepository.findById).toHaveBeenCalledWith("acc-456");
          expect(accountRepository.save).toHaveBeenCalledTimes(2);
        });
    });
  });
});
