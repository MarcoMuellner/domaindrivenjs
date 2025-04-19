import { ValueObject, ValueObjectFactory } from "../Base";

/**
 * NumberValue represents a numeric value with validation and operations
 */
export type NumberValueType = ValueObject<number>;

/**
 * Number value object factory for creating number values with built-in methods
 */
export const NumberValue: ValueObjectFactory<number> & {
  create: (data: number | unknown) => NumberValueType & {
    /**
     * Adds a value to this number
     */
    add: (value: number) => NumberValueType;
    
    /**
     * Subtracts a value from this number
     */
    subtract: (value: number) => NumberValueType;
    
    /**
     * Multiplies this number by a factor
     */
    multiply: (factor: number) => NumberValueType;
    
    /**
     * Divides this number by a divisor
     */
    divide: (divisor: number) => NumberValueType;
    
    /**
     * Increments the value by the specified amount (defaults to 1)
     */
    increment: (amount?: number) => NumberValueType;
    
    /**
     * Decrements the value by the specified amount (defaults to 1)
     */
    decrement: (amount?: number) => NumberValueType;
    
    /**
     * Rounds this value to specified decimal places
     */
    round: (decimals?: number) => NumberValueType;
    
    /**
     * Floors this value to the nearest integer or specified decimal place
     */
    floor: (decimals?: number) => NumberValueType;
    
    /**
     * Ceils this value to the nearest integer or specified decimal place
     */
    ceil: (decimals?: number) => NumberValueType;
    
    /**
     * Checks if this number is zero
     */
    isZero: () => boolean;
    
    /**
     * Checks if this number is positive (greater than zero)
     */
    isPositive: () => boolean;
    
    /**
     * Checks if this number is negative (less than zero)
     */
    isNegative: () => boolean;
    
    /**
     * Checks if this number is an integer
     */
    isInteger: () => boolean;
    
    /**
     * Returns the absolute value of this number
     */
    abs: () => NumberValueType;
    
    /**
     * Calculates the power of this number
     */
    pow: (exponent: number) => NumberValueType;
    
    /**
     * Calculates the square root of this number
     */
    sqrt: () => NumberValueType;
    
    /**
     * Converts the number to a formatted string
     */
    format: (locale?: string, options?: Intl.NumberFormatOptions) => string;
    
    /**
     * Formats the number as a percentage
     */
    toPercentage: (locale?: string, decimals?: number) => string;
    
    /**
     * Formats the number as currency
     */
    toCurrency: (currency: string, locale?: string) => string;
  };
};