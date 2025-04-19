import { ValueObject, ValueObjectFactory } from "../Base";

/**
 * Identifier represents a unique identifier value object
 */
export type IdentifierType = ValueObject<string>;

/**
 * UUID-specific identifier type
 */
export type UUIDIdentifierType = ValueObject<string> & {
  /**
   * Gets the version of this UUID
   */
  getVersion(): number;
  
  /**
   * Converts UUID to a hyphen-free format
   */
  toCompact(): string;
  
  /**
   * Gets specific segments of the UUID
   */
  getSegment(index: number): string;
};

/**
 * Numeric identifier type
 */
export type NumericIdentifierType = ValueObject<number> & {
  /**
   * Returns the next sequential identifier
   */
  next(): NumericIdentifierType;
  
  /**
   * Converts to string with optional padding
   */
  toString(padLength?: number): string;
};

/**
 * Identifier factory for creating unique identifiers
 */
export const Identifier: ValueObjectFactory<string> & {
  create: (data: string | unknown) => IdentifierType & {
    /**
     * Checks if this identifier matches a specific pattern
     */
    matches: (pattern: RegExp) => boolean;
    
    /**
     * Formats the identifier according to a pattern
     */
    format: (format: string) => string;
    
    /**
     * Returns a prefixed version of this identifier
     */
    withPrefix: (prefix: string) => IdentifierType;
    
    /**
     * Returns a suffixed version of this identifier
     */
    withSuffix: (suffix: string) => IdentifierType;
  };
  
  /**
   * Creates a UUID-specific identifier value object
   */
  uuid: () => ValueObjectFactory<string> & {
    create: (data: string | unknown) => UUIDIdentifierType;
  };
  
  /**
   * Creates a numeric identifier value object
   */
  numeric: (options?: { min?: number }) => ValueObjectFactory<number> & {
    create: (data: number | unknown) => NumericIdentifierType;
  };
  
  /**
   * Creates an identifier that must match a specific pattern
   */
  pattern: (pattern: RegExp, name?: string) => ValueObjectFactory<string>;
  
  /**
   * Generates a new UUID v4 identifier
   */
  generateUUID: () => string;
};