import { DomainError } from "../errors/DomainError";

/**
 * Error thrown when repository operations fail
 */
export class RepositoryError extends DomainError {
  constructor(
    message: string,
    cause?: Error,
    context?: Record<string, unknown>
  );
  
  context: Record<string, unknown>;
}

/**
 * Adapter for repository operations
 */
export type RepositoryAdapter<T> = {
  /**
   * Find aggregate by ID
   */
  findById: (id: string) => Promise<T | null>;
  
  /**
   * Find all aggregates matching filter
   */
  findAll: (filter?: unknown) => Promise<T[]>;
  
  /**
   * Save aggregate
   */
  save: (aggregate: T) => Promise<void>;
  
  /**
   * Delete aggregate by ID
   */
  delete: (id: string) => Promise<void>;
  
  /**
   * Find aggregates by multiple IDs
   */
  findByIds?: (ids: string[]) => Promise<Map<string, T>>;
  
  /**
   * Save multiple aggregates
   */
  saveAll?: (aggregates: T[]) => Promise<void>;
  
  /**
   * Count aggregates matching filter
   */
  count?: (filter?: unknown) => Promise<number>;
  
  /**
   * Find using specification
   */
  findBySpecification?: (specification: unknown) => Promise<T[]>;
}

/**
 * Creates a repository for an aggregate
 */
export function repository<T>(options: {
  /**
   * The aggregate factory
   */
  aggregate: {
    name: string;
    identity: string;
    create: (data: unknown) => T;
  };
  
  /**
   * Storage adapter
   */
  adapter: RepositoryAdapter<T>;
  
  /**
   * Event handling options
   */
  events?: {
    /**
     * Auto-publish events on save
     */
    publishOnSave?: boolean;
    
    /**
     * Clear events after publishing
     */
    clearAfterPublish?: boolean;
  };
}): {
  /**
   * Finds an aggregate by its ID
   */
  findById: (id: string) => Promise<T | null>;
  
  /**
   * Finds multiple aggregates by their IDs
   */
  findByIds: (ids: string[]) => Promise<Map<string, T>>;
  
  /**
   * Finds all aggregates matching the optional filter
   */
  findAll: (filter?: unknown) => Promise<T[]>;
  
  /**
   * Finds a single aggregate matching the filter
   */
  findOne: (filter: unknown) => Promise<T | null>;
  
  /**
   * Finds aggregates using a specification
   */
  findBySpecification: (specification: unknown) => Promise<T[]>;
  
  /**
   * Saves an aggregate and optionally publishes its events
   */
  save: (aggregate: T) => Promise<void>;
  
  /**
   * Saves multiple aggregates in a batch
   */
  saveAll: (aggregates: T[]) => Promise<void>;
  
  /**
   * Deletes an aggregate by its ID
   */
  delete: (id: string) => Promise<void>;
  
  /**
   * Checks if an aggregate with the given ID exists
   */
  exists: (id: string) => Promise<boolean>;
  
  /**
   * Counts aggregates matching the optional filter
   */
  count: (filter?: unknown) => Promise<number>;
};