import { z } from 'zod';

export interface BaseConfig {
  name: string;
  [key: string]: any;
}

export interface ValueObjectConfig extends BaseConfig {
  schema: z.ZodType<any>;
  methods?: Record<string, Function>;
  validate?: (data: any) => void | Error;
}

export interface EntityConfig extends BaseConfig {
  schema: z.ZodType<any>;
  identity: string;
  methods?: Record<string, Function>;
  validate?: (data: any) => void | Error;
  invariants?: Array<{
    name: string;
    check: (data: any) => boolean;
    message: string;
  }>;
}

export interface AggregateConfig extends EntityConfig {
  // Additional aggregate-specific configuration
}

export interface DomainServiceConfig extends BaseConfig {
  dependencies?: Record<string, 'required' | 'optional'>;
  methods: Record<string, Function>;
}

export interface RepositoryConfig extends BaseConfig {
  entity: any; // Should be an Entity type
  methods?: Record<string, Function>;
}

export interface SpecificationConfig extends BaseConfig {
  parameters?: string[];
  isSatisfiedBy: (entity: any, params?: any) => boolean | Promise<boolean>;
  toQuery?: (params?: any) => Record<string, any>;
}

export function valueObject(config: ValueObjectConfig): any;
export function entity(config: EntityConfig): any;
export function aggregate(config: AggregateConfig): any;
export function domainService(config: DomainServiceConfig): any;
export function repository(config: RepositoryConfig): any;
export function specification(config: SpecificationConfig): any;

export const eventBus: {
  on: (eventName: string, callback: (event: any) => void) => void;
  emit: (eventName: string, eventData: any) => void;
  off: (eventName: string, callback?: (event: any) => void) => void;
};

export function createInMemoryAdapter(config?: any): any;
export function createMongoAdapter(config: any): any;

// Common value objects
export const EmailAddress: any;
export const Money: any;
export const PostalAddress: any;
export const PhoneNumber: any;
export const PositiveNumber: any;

// Type guards
export function isValueObject(obj: any): boolean;
export function isEntity(obj: any): boolean;
export function isAggregate(obj: any): boolean;