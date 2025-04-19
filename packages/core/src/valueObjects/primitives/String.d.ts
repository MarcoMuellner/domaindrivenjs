import { ValueObject, ValueObjectFactory } from "../Base";

/**
 * StringValue represents a string with validation and common operations
 */
export type StringValueType = ValueObject<string>;

/**
 * String value object factory for creating string values with built-in methods
 */
export const String: ValueObjectFactory<string> & {
  create: (data: string | unknown) => StringValueType & {
    /**
     * Checks if string contains a substring
     */
    contains: (substring: string) => boolean;
    
    /**
     * Truncates the string if it exceeds max length
     */
    truncate: (maxLength: number, suffix?: string) => StringValueType;
    
    /**
     * Converts string to lowercase
     */
    toLower: () => StringValueType;
    
    /**
     * Converts string to uppercase
     */
    toUpper: () => StringValueType;
    
    /**
     * Capitalizes the first letter of the string
     */
    capitalize: () => StringValueType;
    
    /**
     * Trims whitespace from both ends of the string
     */
    trim: () => StringValueType;
    
    /**
     * Replaces occurrences of a substring with a replacement
     */
    replace: (searchValue: string | RegExp, replaceValue: string) => StringValueType;
    
    /**
     * Splits the string by a separator
     */
    split: (separator: string | RegExp) => string[];
    
    /**
     * Checks if string starts with a substring
     */
    startsWith: (substring: string) => boolean;
    
    /**
     * Checks if string ends with a substring
     */
    endsWith: (substring: string) => boolean;
    
    /**
     * Pads the string to a target length
     */
    pad: (length: number, padString?: string) => StringValueType;
    
    /**
     * Pads the string from the start to a target length
     */
    padStart: (length: number, padString?: string) => StringValueType;
    
    /**
     * Pads the string from the end to a target length
     */
    padEnd: (length: number, padString?: string) => StringValueType;
    
    /**
     * Checks if string matches a regular expression
     */
    matches: (pattern: RegExp) => boolean;
    
    /**
     * Checks if string is empty
     */
    isEmpty: () => boolean;
    
    /**
     * Returns a substring of this string
     */
    substring: (start: number, end?: number) => StringValueType;
  };
};