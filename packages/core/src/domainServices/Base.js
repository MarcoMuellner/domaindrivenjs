// packages/core/src/domainServices/Base.js
import { DomainError } from "../errors/index.js";

/**
 * Error thrown when domain service operations fail
 * @extends DomainError
 */
export class DomainServiceError extends DomainError {
  /**
   * @param {string} message - Error message
   * @param {Error} [cause] - The underlying cause
   * @param {Record<string, any>} [context] - Additional context
   */
  constructor(message, cause, context = {}) {
    super(message, cause);
    this.context = context;
  }
}

/**
 * Creates a domain service for encapsulating domain logic that doesn't belong to entities or value objects
 *
 * @template D - Dependencies type
 * @template O - Operations type
 * @param {object} options - Service configuration
 * @param {string} options.name - Name of the service
 * @param {Record<string, any>} [options.dependencies={}] - Dependencies required by this service
 * @param {function(Object): Record<string, Function>} options.operationsFactory - Factory function that creates operations
 * @returns {object} A factory for creating domain service instances
 */
export function domainService({
                                name,
                                dependencies = {},
                                operationsFactory,
                              }) {
  if (!name) {
    throw new Error("Domain service name is required");
  }

  if (typeof operationsFactory !== 'function') {
    throw new Error("Operations factory is required");
  }

  /**
   * Creates a new domain service instance with the provided dependencies
   *
   * @param {D} injectedDependencies - Dependencies to inject
   * @returns {object} A domain service instance
   */
  function create(injectedDependencies = {}) {
    // Validate required dependencies are provided
    const missingDependencies = [];

    for (const [depName, depValue] of Object.entries(dependencies)) {
      if (depValue !== null && injectedDependencies[depName] === undefined) {
        missingDependencies.push(depName);
      }
    }

    if (missingDependencies.length > 0) {
      throw new DomainServiceError(
          `Missing required dependencies: ${missingDependencies.join(", ")}`,
          null,
          { service: name, missingDependencies },
      );
    }

    // Create the service instance with dependencies
    const serviceInstance = {
      serviceName: name,
      dependencies: { ...injectedDependencies },
    };

    // Create a temporary factory for use in operationsFactory
    const tempFactory = {
      create,
      name,
      dependencies,
      extend
    };

    // Generate operations using the factory
    const operations = operationsFactory(tempFactory);

    // Validate operations
    for (const [opName, op] of Object.entries(operations)) {
      if (typeof op !== "function") {
        throw new Error(`Operation '${opName}' must be a function`);
      }
    }

    // First, create a complete service object with all operations (unbound)
    const completeService = {
      ...serviceInstance,
    };

    // Add all operations to the complete service
    for (const [opName, opFn] of Object.entries(operations)) {
      completeService[opName] = opFn;
    }

    // Now bind all methods to the complete service
    const boundService = { ...completeService };

    for (const [opName, opFn] of Object.entries(operations)) {
      boundService[opName] = opFn.bind(completeService);
    }

    // Return immutable service instance with all operations
    return Object.freeze(boundService);
  }

  /**
   * Extends this domain service with additional operations
   *
   * @param {object} options - Extension options
   * @param {string} options.name - The name of the extended service
   * @param {Record<string, any>} [options.dependencies={}] - Additional dependencies
   * @param {function(Object): Record<string, Function>} options.operationsFactory - Factory function for creating operations
   * @returns {object} A new domain service factory
   */
  function extend({
                    name: extendedName,
                    dependencies: extendedDeps = {},
                    operationsFactory: extendedOpsFactory,
                  }) {
    if (!extendedName) {
      throw new Error("Extended domain service name is required");
    }

    if (typeof extendedOpsFactory !== 'function') {
      throw new Error("Operations factory is required for extension");
    }

    // Combine dependencies
    const combinedDependencies = { ...dependencies, ...extendedDeps };

    // Create a combined operations factory that inherits operations from parent
    const combinedOpsFactory = (factory) => {
      // Get operations from the original factory
      const parentOps = operationsFactory(factory);
      
      // Get operations from the extended factory
      const extendedOps = extendedOpsFactory(factory);
      
      // Combine them, with extended operations taking precedence
      return {
        ...parentOps,
        ...extendedOps
      };
    };

    // Create new domain service with combined configuration
    return domainService({
      name: extendedName,
      dependencies: combinedDependencies,
      operationsFactory: combinedOpsFactory,
    });
  }

  // Add metadata and methods to the factory (avoiding 'name' which is read-only on functions)
  create.serviceName = name;
  create.dependencies = dependencies;
  create.extend = extend;

  // Return the factory
  return {
    create,
    name,
    dependencies,
    extend,
  };
}
