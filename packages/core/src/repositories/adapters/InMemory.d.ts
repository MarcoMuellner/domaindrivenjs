import { RepositoryAdapter } from "../Base";

/**
 * Creates an in-memory repository adapter
 */
export function createInMemoryAdapter<T>(options: {
  /**
   * Identity field of the aggregate
   */
  identity: string;
  
  /**
   * Initial data to populate the repository
   */
  initialData?: T[];
}): RepositoryAdapter<T> & {
  /**
   * Find aggregate by ID
   */
  findById: (id: string) => Promise<T | null>;
  
  /**
   * Find multiple aggregates by their IDs
   */
  findByIds: (ids: string[]) => Promise<Map<string, T>>;
  
  /**
   * Find all aggregates matching filter
   */
  findAll: (filter?: Record<string, unknown>) => Promise<T[]>;
  
  /**
   * Find aggregates using a specification
   */
  findBySpecification: (specification: unknown) => Promise<T[]>;
  
  /**
   * Count aggregates matching filter
   */
  count: (filter?: Record<string, unknown>) => Promise<number>;
  
  /**
   * Save aggregate
   */
  save: (aggregate: T) => Promise<void>;
  
  /**
   * Save multiple aggregates
   */
  saveAll: (aggregates: T[]) => Promise<void>;
  
  /**
   * Delete aggregate by ID
   */
  delete: (id: string) => Promise<void>;
  
  /**
   * Clears all data from the store
   */
  clear: () => void;
  
  /**
   * Gets the count of aggregates in the store
   */
  size: () => number;
};