import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { entity } from './Base.js';
import { ValidationError, DomainError } from '../errors/index.js';
import {
    NonEmptyString,
    PositiveNumber
} from '../valueObjects/primitives/index.js';
import {
    specificValueObjectSchema
} from '../valueObjects/schema.js';

/**
 * @typedef {import('./Base.js').Entity} Entity
 * @typedef {import('./Base.js').EntityFactory} EntityFactory
 */

describe('entity', () => {
    // Helper function to create a test entity
    const createTestEntity = () => {
        // Create the entity factory and store it in a variable first
        const TestEntity = entity({
            name: 'TestEntity',
            schema: z.object({
                id: z.string().uuid(),
                name: z.string().min(1),
                email: z.string().email(),
                createdAt: z.date().default(() => new Date())
            }),
            identity: 'id',
            methods: {
                changeName(name) {
                    return TestEntity.update(this, { name });
                },
                updateEmail(email) {
                    return TestEntity.update(this, { email });
                }
            }
        });

        return TestEntity;
    };

    // Helper function to create an entity with historization
    const createHistorizedEntity = () => {
        // Create the entity factory and store it in a variable first
        const HistorizedEntity = entity({
            name: 'HistorizedEntity',
            schema: z.object({
                id: z.string().uuid(),
                value: z.string(),
                _history: z.array(z.object({
                    timestamp: z.date(),
                    changes: z.array(z.object({
                        field: z.string(),
                        from: z.any(),
                        to: z.any(),
                        timestamp: z.date()
                    }))
                })).optional()
            }),
            identity: 'id',
            historize: true,
            methods: {
                updateValue(value) {
                    return HistorizedEntity.update(this, { value });
                }
            }
        });

        return HistorizedEntity;
    };

    // Basic validation tests
    describe('basic validation', () => {
        it('should throw error if name is missing', () => {
            expect(() => entity({
                schema: z.object({ id: z.string() }),
                identity: 'id'
            })).toThrow('Entity name is required');
        });

        it('should throw error if schema is missing', () => {
            expect(() => entity({
                name: 'TestEntity',
                identity: 'id'
            })).toThrow('Entity schema is required');
        });

        it('should throw error if identity field is missing', () => {
            expect(() => entity({
                name: 'TestEntity',
                schema: z.object({ id: z.string() })
            })).toThrow('Entity identity field is required');
        });
    });

    // Entity creation tests
    describe('entity creation', () => {
        it('should create an entity with valid data', () => {
            // Arrange
            const TestEntity = createTestEntity();
            const id = '123e4567-e89b-12d3-a456-426614174000';
            const data = {
                id,
                name: 'Test Entity',
                email: 'test@example.com'
            };

            // Act
            const instance = TestEntity.create(data);

            // Assert
            expect(instance.id).toBe(id);
            expect(instance.name).toBe('Test Entity');
            expect(instance.email).toBe('test@example.com');
            expect(instance.createdAt).toBeInstanceOf(Date);
        });

        it('should throw ValidationError for invalid data', () => {
            // Arrange
            const TestEntity = createTestEntity();
            const invalidData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'Test',
                email: 'not-an-email'
            };

            // Act & Assert
            expect(() => TestEntity.create(invalidData))
                .toThrow(ValidationError);

            try {
                TestEntity.create(invalidData);
            } catch (error) {
                expect(error.message).toContain('Invalid TestEntity');
                expect(error.context.objectType).toBe('TestEntity');
            }
        });

        it('should throw error if identity field is missing in data', () => {
            // Arrange
            const TestEntity = createTestEntity();
            const invalidData = {
                name: 'Test',
                email: 'test@example.com'
            };

            // Act & Assert
            expect(() => TestEntity.create(invalidData))
                .toThrow(ValidationError);
        });

        it('should create immutable objects', () => {
            // Arrange
            const TestEntity = createTestEntity();
            const id = '123e4567-e89b-12d3-a456-426614174000';
            const instance = TestEntity.create({
                id,
                name: 'Test Entity',
                email: 'test@example.com'
            });

            // Act & Assert
            expect(() => { instance.name = 'Changed'; }).toThrow();
            expect(() => { instance.email = 'changed@example.com'; }).toThrow();
            expect(() => { instance.newProp = 'new'; }).toThrow();
        });
    });

    // Custom methods tests
    describe('entity methods', () => {
        it('should include custom methods in the instance', () => {
            // Arrange
            const TestEntity = createTestEntity();
            const id = '123e4567-e89b-12d3-a456-426614174000';
            const instance = TestEntity.create({
                id,
                name: 'Test Entity',
                email: 'test@example.com'
            });

            // Assert
            expect(typeof instance.changeName).toBe('function');
            expect(typeof instance.updateEmail).toBe('function');
        });

        it('should support custom methods that update state', () => {
            // Arrange
            const TestEntity = createTestEntity();
            const id = '123e4567-e89b-12d3-a456-426614174000';
            const instance = TestEntity.create({
                id,
                name: 'Test Entity',
                email: 'test@example.com'
            });

            // Act
            const updated = instance.changeName('New Name');

            // Assert
            expect(updated.name).toBe('New Name');
            expect(updated.id).toBe(id);
            expect(updated).not.toBe(instance); // Should be a new instance
        });
    });

    // Entity update tests
    describe('entity updates', () => {
        it('should update entity state correctly', () => {
            // Arrange
            const TestEntity = createTestEntity();
            const id = '123e4567-e89b-12d3-a456-426614174000';
            const instance = TestEntity.create({
                id,
                name: 'Test Entity',
                email: 'test@example.com'
            });

            // Act
            const updated = TestEntity.update(instance, { name: 'Updated Name' });

            // Assert
            expect(updated.id).toBe(id);
            expect(updated.name).toBe('Updated Name');
            expect(updated.email).toBe('test@example.com');
            expect(updated).not.toBe(instance); // Should be a new instance
        });

        it('should preserve identity when updating', () => {
            // Arrange
            const TestEntity = createTestEntity();
            const id = '123e4567-e89b-12d3-a456-426614174000';
            const instance = TestEntity.create({
                id,
                name: 'Test Entity',
                email: 'test@example.com'
            });

            // Act & Assert
            expect(() => TestEntity.update(instance, {
                id: '00000000-0000-0000-0000-000000000000'
            })).toThrow(DomainError);
        });
    });

    // Identity and equality tests
    describe('identity and equality', () => {
        it('should implement equals method comparing identities', () => {
            // Arrange
            const TestEntity = createTestEntity();
            const id = '123e4567-e89b-12d3-a456-426614174000';

            const instance1 = TestEntity.create({
                id,
                name: 'Entity 1',
                email: 'test1@example.com'
            });

            const instance2 = TestEntity.create({
                id,
                name: 'Entity 2', // Different name
                email: 'test2@example.com' // Different email
            });

            const instance3 = TestEntity.create({
                id: '00000000-0000-0000-0000-000000000000', // Different ID
                name: 'Entity 1',
                email: 'test1@example.com'
            });

            // Act & Assert
            expect(instance1.equals(instance2)).toBe(true); // Same ID, different attributes
            expect(instance1.equals(instance3)).toBe(false); // Different ID, same attributes
            expect(instance1.equals(null)).toBe(false);
            expect(instance1.equals(undefined)).toBe(false);
            expect(instance1.equals(instance1)).toBe(true); // Same instance
        });

        it('should implement toString method', () => {
            // Arrange
            const TestEntity = createTestEntity();
            const id = '123e4567-e89b-12d3-a456-426614174000';
            const instance = TestEntity.create({
                id,
                name: 'Test Entity',
                email: 'test@example.com'
            });

            // Act
            const stringRepresentation = instance.toString();

            // Assert
            expect(stringRepresentation).toBe(`TestEntity(${id})`);
        });
    });

    // Historization tests
    describe('historization', () => {
        it('should track state changes when historize is enabled', () => {
            // Arrange
            const HistorizedEntity = createHistorizedEntity();
            const id = '123e4567-e89b-12d3-a456-426614174000';
            const instance = HistorizedEntity.create({
                id,
                value: 'initial'
            });

            // Act
            const updated = HistorizedEntity.update(instance, { value: 'updated' });

            // Assert
            expect(updated.value).toBe('updated');
            expect(updated._history).toBeDefined();
            expect(updated._history.length).toBe(1);
            expect(updated._history[0].changes.length).toBe(1);
            expect(updated._history[0].changes[0].field).toBe('value');
            expect(updated._history[0].changes[0].from).toBe('initial');
            expect(updated._history[0].changes[0].to).toBe('updated');
            expect(updated._history[0].changes[0].timestamp).toBeInstanceOf(Date);
        });

        it('should accumulate history across multiple updates', () => {
            // Arrange
            const HistorizedEntity = createHistorizedEntity();
            const id = '123e4567-e89b-12d3-a456-426614174000';
            const instance = HistorizedEntity.create({
                id,
                value: 'initial'
            });

            // Act
            const updated1 = HistorizedEntity.update(instance, { value: 'first update' });
            const updated2 = HistorizedEntity.update(updated1, { value: 'second update' });

            // Assert
            expect(updated2._history.length).toBe(2);
            expect(updated2._history[0].changes[0].from).toBe('initial');
            expect(updated2._history[0].changes[0].to).toBe('first update');
            expect(updated2._history[1].changes[0].from).toBe('first update');
            expect(updated2._history[1].changes[0].to).toBe('second update');
        });

        it('should not add history entry when no changes occurred', () => {
            // Arrange
            const HistorizedEntity = createHistorizedEntity();
            const id = '123e4567-e89b-12d3-a456-426614174000';
            const instance = HistorizedEntity.create({
                id,
                value: 'initial'
            });

            // Act - Update with the same value
            const updated = HistorizedEntity.update(instance, { value: 'initial' });

            // Assert
            expect(updated._history).toBeDefined();
            expect(updated._history.length).toBe(0); // No changes recorded
        });

        it('should use custom methods with historization', () => {
            // Arrange
            const HistorizedEntity = createHistorizedEntity();
            const id = '123e4567-e89b-12d3-a456-426614174000';
            const instance = HistorizedEntity.create({
                id,
                value: 'initial'
            });

            // Act
            const updated = instance.updateValue('new value');

            // Assert
            expect(updated.value).toBe('new value');
            expect(updated._history.length).toBe(1);
            expect(updated._history[0].changes[0].from).toBe('initial');
            expect(updated._history[0].changes[0].to).toBe('new value');
        });
    });

    // Extension tests
    describe('entity extension', () => {
        it('should allow extending an entity with additional validation', () => {
            // Arrange
            const TestEntity = createTestEntity();

            // Act
            const ExtendedEntity = TestEntity.extend({
                name: 'ExtendedEntity',
                schema: (baseSchema) => baseSchema.extend({
                    active: z.boolean().default(true)
                })
            });

            // Assert
            expect(typeof ExtendedEntity.create).toBe('function');

            // Create instance with extra property
            const id = '123e4567-e89b-12d3-a456-426614174000';
            const instance = ExtendedEntity.create({
                id,
                name: 'Extended Entity',
                email: 'extended@example.com',
                active: false
            });

            expect(instance.id).toBe(id);
            expect(instance.name).toBe('Extended Entity');
            expect(instance.active).toBe(false);

            // Default value should be applied
            const instanceWithDefault = ExtendedEntity.create({
                id,
                name: 'Default Entity',
                email: 'default@example.com'
            });

            expect(instanceWithDefault.active).toBe(true);
        });

        it('should allow extending an entity with additional methods', () => {
            // Arrange
            const TestEntity = createTestEntity();

            // Act
            const ExtendedEntity = TestEntity.extend({
                name: 'ExtendedEntity',
                methods: {
                    activate() {
                        return ExtendedEntity.update(this, { active: true });
                    },
                    deactivate() {
                        return ExtendedEntity.update(this, { active: false });
                    }
                },
                schema: (baseSchema) => baseSchema.extend({
                    active: z.boolean().default(true)
                })
            });

            // Assert
            const id = '123e4567-e89b-12d3-a456-426614174000';
            const instance = ExtendedEntity.create({
                id,
                name: 'Extended Entity',
                email: 'extended@example.com',
                active: true
            });

            // Original methods should still work
            expect(typeof instance.changeName).toBe('function');
            expect(typeof instance.updateEmail).toBe('function');

            // New methods should work
            expect(typeof instance.activate).toBe('function');
            expect(typeof instance.deactivate).toBe('function');

            const deactivated = instance.deactivate();
            expect(deactivated.active).toBe(false);
        });

        it('should allow changing the identity field when extending', () => {
            // Arrange
            const BaseEntity = entity({
                name: 'BaseEntity',
                schema: z.object({
                    code: z.string(),
                    name: z.string()
                }),
                identity: 'code'
            });

            // Act
            const ExtendedEntity = BaseEntity.extend({
                name: 'ExtendedEntity',
                schema: (baseSchema) => baseSchema.extend({
                    id: z.string().uuid()
                }),
                identity: 'id' // Change identity field
            });

            // Assert
            expect(ExtendedEntity.identity).toBe('id');

            const instance = ExtendedEntity.create({
                code: 'TEST',
                name: 'Test',
                id: '123e4567-e89b-12d3-a456-426614174000'
            });

            expect(instance.toString()).toBe('ExtendedEntity(123e4567-e89b-12d3-a456-426614174000)');
        });

        it('should allow extending with historization', () => {
            // Arrange
            const TestEntity = createTestEntity();

            // Act
            const HistorizedTestEntity = TestEntity.extend({
                name: 'HistorizedTestEntity',
                historize: true, // Enable historization
                schema: (baseSchema) => baseSchema.extend({
                    _history: z.array(z.any()).optional()
                })
            });

            // Assert
            const id = '123e4567-e89b-12d3-a456-426614174000';
            const instance = HistorizedTestEntity.create({
                id,
                name: 'Original Name',
                email: 'test@example.com'
            });

            const updated = HistorizedTestEntity.update(instance, { name: 'Updated Name' });
            expect(updated._history).toBeDefined();
            expect(updated._history.length).toBe(1);
            expect(updated._history[0].changes[0].field).toBe('name');
            expect(updated._history[0].changes[0].from).toBe('Original Name');
            expect(updated._history[0].changes[0].to).toBe('Updated Name');
        });

        it('should throw error if extended entity name is missing', () => {
            // Arrange
            const TestEntity = createTestEntity();

            // Act & Assert
            expect(() => TestEntity.extend({
                schema: (baseSchema) => baseSchema
            })).toThrow('Extended entity name is required');
        });
    });

    // Value object integration tests
    describe('value object integration', () => {
        it('should support value objects as properties', () => {
            // Arrange
            const UserEntity = entity({
                name: 'User',
                schema: z.object({
                    id: z.string().uuid(),
                    username: z.string(),
                    // Use our schema helper for value objects
                    displayName: specificValueObjectSchema(NonEmptyString)
                }),
                identity: 'id'
            });

            const id = '123e4567-e89b-12d3-a456-426614174000';
            const displayName = NonEmptyString.create('John Doe');

            // Act
            const user = UserEntity.create({
                id,
                username: 'johndoe',
                displayName
            });

            // Assert
            expect(user.id).toBe(id);
            expect(user.username).toBe('johndoe');
            expect(user.displayName).toBe(displayName);
            expect(user.displayName.toString()).toBe('John Doe');
        });

        it('should handle value object updates correctly', () => {
            // Arrange
            const UserEntity = entity({
                name: 'User',
                schema: z.object({
                    id: z.string().uuid(),
                    username: z.string(),
                    // Use our schema helper for value objects
                    displayName: specificValueObjectSchema(NonEmptyString)
                }),
                identity: 'id',
                methods: {
                    updateDisplayName(name) {
                        return UserEntity.update(this, {
                            displayName: NonEmptyString.create(name)
                        });
                    }
                }
            });

            const id = '123e4567-e89b-12d3-a456-426614174000';
            const user = UserEntity.create({
                id,
                username: 'johndoe',
                displayName: NonEmptyString.create('John Doe')
            });

            // Act
            const updatedUser = user.updateDisplayName('John Smith');

            // Assert
            expect(updatedUser.id).toBe(id);
            expect(updatedUser.displayName.toString()).toBe('John Smith');
            expect(updatedUser.displayName).not.toBe(user.displayName);
        });

        it('should support multiple value object types in an entity', () => {
            // Arrange
            const ProductEntity = entity({
                name: 'Product',
                schema: z.object({
                    id: z.string().uuid(),
                    name: specificValueObjectSchema(NonEmptyString),
                    price: specificValueObjectSchema(PositiveNumber)
                }),
                identity: 'id'
            });

            const id = '123e4567-e89b-12d3-a456-426614174000';
            const name = NonEmptyString.create('Premium Widget');
            const price = PositiveNumber.create(99.99);

            // Act
            const product = ProductEntity.create({
                id,
                name,
                price
            });

            // Assert
            expect(product.id).toBe(id);
            expect(product.name).toBe(name);
            expect(product.price).toBe(price);
            expect(product.name.toString()).toBe('Premium Widget');
            expect(product.price.valueOf()).toBe(99.99);
        });

        it('should correctly compare value objects in deep equality check', () => {
            // Arrange
            const HistorizedEntity = entity({
                name: 'HistorizedUser',
                schema: z.object({
                    id: z.string().uuid(),
                    // Use our schema helper for value objects
                    displayName: specificValueObjectSchema(NonEmptyString),
                    _history: z.array(z.object({
                        timestamp: z.date(),
                        changes: z.array(z.object({
                            field: z.string(),
                            from: z.any(),
                            to: z.any(),
                            timestamp: z.date()
                        }))
                    })).optional()
                }),
                identity: 'id',
                historize: true
            });

            const id = '123e4567-e89b-12d3-a456-426614174000';
            const user = HistorizedEntity.create({
                id,
                displayName: NonEmptyString.create('John Doe')
            });

            // Act - Update with equivalent but different value object instance
            const updatedUser = HistorizedEntity.update(user, {
                displayName: NonEmptyString.create('John Doe') // Same value but new instance
            });

            // Assert - No history should be created since the value objects are equal
            expect(updatedUser._history).toBeDefined();
            expect(updatedUser._history.length).toBe(0);

            // Now update with a different value
            const changedUser = HistorizedEntity.update(updatedUser, {
                displayName: NonEmptyString.create('Jane Doe')
            });

            // Assert - History should be created
            expect(changedUser._history.length).toBe(1);
            expect(changedUser._history[0].changes[0].field).toBe('displayName');
            expect(changedUser._history[0].changes[0].from.toString()).toBe('John Doe');
            expect(changedUser._history[0].changes[0].to.toString()).toBe('Jane Doe');
        });

        it('should validate value objects properly', () => {
            // Arrange
            const UserEntity = entity({
                name: 'User',
                schema: z.object({
                    id: z.string().uuid(),
                    username: z.string(),
                    // Use our schema helper for value objects
                    displayName: specificValueObjectSchema(NonEmptyString)
                }),
                identity: 'id'
            });

            const id = '123e4567-e89b-12d3-a456-426614174000';

            // Act & Assert
            // Should throw when not providing a value object
            expect(() => UserEntity.create({
                id,
                username: 'johndoe',
                displayName: 'Not a value object' // String instead of NonEmptyString
            })).toThrow(ValidationError);

            // Should throw when providing the wrong type of value object
            expect(() => UserEntity.create({
                id,
                username: 'johndoe',
                displayName: PositiveNumber.create(42) // Wrong type of value object
            })).toThrow(ValidationError);

            // Should work with the correct value object
            const user = UserEntity.create({
                id,
                username: 'johndoe',
                displayName: NonEmptyString.create('John Doe')
            });
            expect(user.displayName.toString()).toBe('John Doe');
        });
    });
});
