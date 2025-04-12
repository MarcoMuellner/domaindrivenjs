import { describe, it, expect } from 'vitest';
import { Identifier } from './Identifier.js';
import { ValidationError } from '../../errors/index.js';

describe('Identifier Value Object', () => {
    // Basic Identifier tests
    describe('basic identifier', () => {
        it('should create an identifier with valid data', () => {
            // Arrange
            const value = 'user-123';
            
            // Act
            const id = Identifier.create(value);
            
            // Assert
            expect(id.toString()).toBe(value);
        });
        
        it('should throw ValidationError for empty strings', () => {
            // Arrange
            const invalidValues = ['', '   '];
            
            // Act & Assert
            invalidValues.forEach(value => {
                expect(() => Identifier.create(value)).toThrow(ValidationError);
            });
        });
        
        it('should trim whitespace from identifiers', () => {
            // Arrange
            const paddedValue = '  id-123  ';
            
            // Act
            const id = Identifier.create(paddedValue);
            
            // Assert
            expect(id.toString()).toBe('id-123');
        });
        
        it('should implement matches method correctly', () => {
            // Arrange
            const id = Identifier.create('user-123');
            
            // Act & Assert
            expect(id.matches(/^user-\d+$/)).toBe(true);
            expect(id.matches(/^product-\d+$/)).toBe(false);
        });
        
        it('should implement format method correctly', () => {
            // Arrange
            const id = Identifier.create('123');
            
            // Act
            const formatted = id.format('user-{id}');
            
            // Assert
            expect(formatted).toBe('user-123');
        });
        
        it('should implement withPrefix method correctly', () => {
            // Arrange
            const id = Identifier.create('123');
            
            // Act
            const prefixed = id.withPrefix('user-');
            
            // Assert
            expect(prefixed.toString()).toBe('user-123');
        });
        
        it('should implement withSuffix method correctly', () => {
            // Arrange
            const id = Identifier.create('user');
            
            // Act
            const suffixed = id.withSuffix('-123');
            
            // Assert
            expect(suffixed.toString()).toBe('user-123');
        });
    });
    
    // UUID Identifier tests
    describe('UUID identifier', () => {
        it('should create a UUID identifier factory', () => {
            // Arrange
            const UUIDIdentifier = Identifier.uuid();
            const validUUID = '123e4567-e89b-12d3-a456-426614174000';
            
            // Act
            const id = UUIDIdentifier.create(validUUID);
            
            // Assert
            expect(id.toString()).toBe(validUUID);
        });
        
        it('should throw ValidationError for invalid UUIDs', () => {
            // Arrange
            const UUIDIdentifier = Identifier.uuid();
            const invalidUUIDs = [
                'not-a-uuid',
                '123e4567-e89b-12d3-a456', // too short
                '123e4567-e89b-12d3-a456-4266141740001' // too long
            ];
            
            // Act & Assert
            invalidUUIDs.forEach(value => {
                expect(() => UUIDIdentifier.create(value)).toThrow(ValidationError);
            });
        });
        
        it('should implement UUID-specific methods correctly', () => {
            // Arrange
            const UUIDIdentifier = Identifier.uuid();
            const uuid = UUIDIdentifier.create('123e4567-e89b-12d3-a456-426614174000');
            
            // Act & Assert
            expect(uuid.getVersion()).toBe(1); // Version is the 13th character after hyphens are removed
            expect(uuid.toCompact()).toBe('123e4567e89b12d3a456426614174000');
            expect(uuid.getSegment(0)).toBe('123e4567');
            expect(uuid.getSegment(4)).toBe('426614174000');
        });
        
        it('should throw error for invalid segment index', () => {
            // Arrange
            const UUIDIdentifier = Identifier.uuid();
            const uuid = UUIDIdentifier.create('123e4567-e89b-12d3-a456-426614174000');
            
            // Act & Assert
            expect(() => uuid.getSegment(5)).toThrow('Segment index out of range');
            expect(() => uuid.getSegment(-1)).toThrow('Segment index out of range');
        });
        
        it('should generate valid UUIDs', () => {
            // Act
            const uuid = Identifier.generateUUID();
            
            // Assert
            expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            
            // Verify it can be used to create a UUID identifier
            const UUIDIdentifier = Identifier.uuid();
            expect(() => UUIDIdentifier.create(uuid)).not.toThrow();
        });
    });
    
    // Numeric Identifier tests
    describe('numeric identifier', () => {
        it('should create a numeric identifier factory', () => {
            // Arrange
            const NumericIdentifier = Identifier.numeric();
            
            // Act
            const id = NumericIdentifier.create(123);
            
            // Assert
            expect(id + 0).toBe(123);
        });
        
        it('should enforce minimum value constraint', () => {
            // Arrange
            const NumericIdentifier = Identifier.numeric({ min: 100 });
            
            // Act & Assert
            expect(() => NumericIdentifier.create(99)).toThrow(ValidationError);
            expect(() => NumericIdentifier.create(100)).not.toThrow();
        });
        
        it('should implement next method correctly', () => {
            // Arrange
            const NumericIdentifier = Identifier.numeric();
            const id = NumericIdentifier.create(123);
            
            // Act
            const nextId = id.next();
            
            // Assert
            expect(nextId + 0).toBe(124);
        });
        
        it('should implement toString with padding correctly', () => {
            // Arrange
            const NumericIdentifier = Identifier.numeric();
            const id = NumericIdentifier.create(42);
            
            // Act
            const padded = id.toString(5);
            
            // Assert
            expect(padded).toBe('00042');
        });
    });
    
    // Pattern Identifier tests
    describe('pattern identifier', () => {
        it('should create a pattern identifier factory', () => {
            // Arrange
            const EmailIdentifier = Identifier.pattern(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, 'EmailIdentifier');
            
            // Act
            const id = EmailIdentifier.create('test@example.com');
            
            // Assert
            expect(id.toString()).toBe('test@example.com');
        });
        
        it('should throw ValidationError for values not matching the pattern', () => {
            // Arrange
            const EmailIdentifier = Identifier.pattern(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, 'EmailIdentifier');
            
            // Act & Assert
            expect(() => EmailIdentifier.create('not-an-email')).toThrow(ValidationError);
        });
        
        it('should implement extract method correctly', () => {
            // Arrange
            const ProductCodeIdentifier = Identifier.pattern(/^P-(\d+)-([A-Z]+)$/, 'ProductCodeIdentifier');
            const id = ProductCodeIdentifier.create('P-12345-XYZ');
            
            // Act
            const parts = id.extract(/^P-(\d+)-([A-Z]+)$/);
            
            // Assert
            expect(parts).toEqual(['12345', 'XYZ']);
        });
    });
    
    // Equality tests
    describe('equality', () => {
        it('should consider identifiers with same value as equal', () => {
            // Arrange
            const id1 = Identifier.create('test-123');
            const id2 = Identifier.create('test-123');
            
            // Act & Assert
            expect(id1.equals(id2)).toBe(true);
        });
        
        it('should consider identifiers with different values as not equal', () => {
            // Arrange
            const id1 = Identifier.create('test-123');
            const id2 = Identifier.create('test-456');
            
            // Act & Assert
            expect(id1.equals(id2)).toBe(false);
        });
    });
});
