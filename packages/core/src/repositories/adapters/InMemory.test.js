// packages/core/src/repositories/adapters/InMemory.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryAdapter } from './InMemory.js';

describe('InMemory adapter', () => {
    let adapter;
    const testData = [
        { id: '1', name: 'Item 1', value: 100, category: 'A' },
        { id: '2', name: 'Item 2', value: 200, category: 'B' },
        { id: '3', name: 'Item 3', value: 50, category: 'A' },
        { id: '4', name: 'Item 4', value: 150, category: 'B' }
    ];

    // Create a simple specification for testing
    const HighValueSpecification = {
        isSatisfiedBy: (aggregate) => aggregate.value > 100
    };

    beforeEach(() => {
        adapter = createInMemoryAdapter({
            identity: 'id',
            initialData: [...testData]
        });
    });

    it('should throw error if identity field is missing', () => {
        expect(() => createInMemoryAdapter({})).toThrow('Identity field is required');
    });

    it('should initialize with provided data', () => {
        expect(adapter.size()).toBe(4);
    });

    describe('findById', () => {
        it('should find an aggregate by ID', async () => {
            // Act
            const aggregate = await adapter.findById('2');

            // Assert
            expect(aggregate).not.toBeNull();
            expect(aggregate.id).toBe('2');
            expect(aggregate.name).toBe('Item 2');
            expect(aggregate.value).toBe(200);
        });

        it('should return null if aggregate is not found', async () => {
            // Act
            const aggregate = await adapter.findById('non-existent');

            // Assert
            expect(aggregate).toBeNull();
        });

        it('should return a copy of the aggregate to prevent modification', async () => {
            // Act
            const aggregate = await adapter.findById('1');
            aggregate.name = 'Modified';

            // Assert - original should be unchanged
            const originalAggregate = await adapter.findById('1');
            expect(originalAggregate.name).toBe('Item 1');
        });
    });

    describe('findByIds', () => {
        it('should find multiple aggregates by their IDs', async () => {
            // Act
            const resultMap = await adapter.findByIds(['1', '2', 'non-existent']);

            // Assert
            expect(resultMap).toBeInstanceOf(Map);
            expect(resultMap.size).toBe(2);
            expect(resultMap.has('1')).toBe(true);
            expect(resultMap.has('2')).toBe(true);
            expect(resultMap.has('non-existent')).toBe(false);

            const agg1 = resultMap.get('1');
            expect(agg1.name).toBe('Item 1');
        });

        it('should return empty map for empty IDs array', async () => {
            // Act
            const resultMap = await adapter.findByIds([]);

            // Assert
            expect(resultMap).toBeInstanceOf(Map);
            expect(resultMap.size).toBe(0);
        });

        it('should return copies of aggregates to prevent modification', async () => {
            // Act
            const resultMap = await adapter.findByIds(['1', '2']);
            const agg1 = resultMap.get('1');
            agg1.name = 'Modified';

            // Assert - original should be unchanged
            const originalAggregate = await adapter.findById('1');
            expect(originalAggregate.name).toBe('Item 1');
        });
    });

    describe('findAll', () => {
        it('should find all aggregates when no filter is provided', async () => {
            // Act
            const aggregates = await adapter.findAll();

            // Assert
            expect(aggregates).toBeInstanceOf(Array);
            expect(aggregates.length).toBe(4);
        });

        it('should apply filter criteria', async () => {
            // Act
            const aggregates = await adapter.findAll({ category: 'A' });

            // Assert
            expect(aggregates).toBeInstanceOf(Array);
            expect(aggregates.length).toBe(2);
            expect(aggregates[0].id).toBe('1');
            expect(aggregates[1].id).toBe('3');
        });

        it('should find aggregates matching multiple criteria', async () => {
            // Act
            const aggregates = await adapter.findAll({ category: 'B', value: 200 });

            // Assert
            expect(aggregates.length).toBe(1);
            expect(aggregates[0].id).toBe('2');
        });

        it('should return empty array if no aggregates match filter', async () => {
            // Act
            const aggregates = await adapter.findAll({ category: 'Non-existent' });

            // Assert
            expect(aggregates).toBeInstanceOf(Array);
            expect(aggregates.length).toBe(0);
        });

        it('should return copies of aggregates to prevent modification', async () => {
            // Act
            const aggregates = await adapter.findAll();
            aggregates[0].name = 'Modified';

            // Assert - original should be unchanged
            const originalAggregate = await adapter.findById('1');
            expect(originalAggregate.name).toBe('Item 1');
        });
    });

    describe('findBySpecification', () => {
        it('should find aggregates using specification object with isSatisfiedBy', async () => {
            // Act
            const aggregates = await adapter.findBySpecification(HighValueSpecification);

            // Assert
            expect(aggregates).toBeInstanceOf(Array);
            expect(aggregates.length).toBe(2);
            expect(aggregates[0].id).toBe('2');
            expect(aggregates[1].id).toBe('4');
        });

        it('should find aggregates using function predicate', async () => {
            // Act
            const aggregates = await adapter.findBySpecification(
                agg => agg.category === 'A' && agg.value < 100
            );

            // Assert
            expect(aggregates).toBeInstanceOf(Array);
            expect(aggregates.length).toBe(1);
            expect(aggregates[0].id).toBe('3');
        });

        it('should throw error if specification is invalid', async () => {
            // Act & Assert
            await expect(adapter.findBySpecification({})).rejects.toThrow('Invalid specification');
            await expect(adapter.findBySpecification(null)).rejects.toThrow('Invalid specification');
        });
    });

    describe('count', () => {
        it('should count all aggregates when no filter is provided', async () => {
            // Act
            const count = await adapter.count();

            // Assert
            expect(count).toBe(4);
        });

        it('should count aggregates matching filter', async () => {
            // Act
            const count = await adapter.count({ category: 'A' });

            // Assert
            expect(count).toBe(2);
        });

        it('should return 0 if no aggregates match filter', async () => {
            // Act
            const count = await adapter.count({ category: 'Non-existent' });

            // Assert
            expect(count).toBe(0);
        });
    });

    describe('save', () => {
        it('should save a new aggregate', async () => {
            // Arrange
            const newAggregate = { id: '5', name: 'Item 5', value: 500, category: 'C' };

            // Act
            await adapter.save(newAggregate);

            // Assert
            const saved = await adapter.findById('5');
            expect(saved).not.toBeNull();
            expect(saved.id).toBe('5');
            expect(saved.name).toBe('Item 5');
            expect(saved.value).toBe(500);
            expect(saved.category).toBe('C');
        });

        it('should update an existing aggregate', async () => {
            // Arrange
            const updated = { id: '1', name: 'Updated Item 1', value: 150, category: 'A' };

            // Act
            await adapter.save(updated);

            // Assert
            const saved = await adapter.findById('1');
            expect(saved.name).toBe('Updated Item 1');
            expect(saved.value).toBe(150);
        });

        it('should throw error if aggregate is null', async () => {
            // Act & Assert
            await expect(adapter.save(null)).rejects.toThrow('Aggregate is required');
        });

        it('should throw error if aggregate is missing identity field', async () => {
            // Act & Assert
            await expect(adapter.save({ name: 'No ID' })).rejects.toThrow('Aggregate missing identity field');
        });

        it('should store a copy of the aggregate to prevent external modification', async () => {
            // Arrange
            const aggregate = { id: '5', name: 'Item 5', value: 500 };

            // Act
            await adapter.save(aggregate);
            aggregate.name = 'Modified externally';

            // Assert - stored aggregate should have original name
            const saved = await adapter.findById('5');
            expect(saved.name).toBe('Item 5');
        });
    });

    describe('saveAll', () => {
        it('should save multiple aggregates', async () => {
            // Arrange
            const newAggregates = [
                { id: 'batch-1', name: 'Batch 1', value: 1000, category: 'D' },
                { id: 'batch-2', name: 'Batch 2', value: 2000, category: 'D' }
            ];

            // Act
            await adapter.saveAll(newAggregates);

            // Assert
            const batch1 = await adapter.findById('batch-1');
            const batch2 = await adapter.findById('batch-2');

            expect(batch1).not.toBeNull();
            expect(batch1.name).toBe('Batch 1');
            expect(batch2).not.toBeNull();
            expect(batch2.name).toBe('Batch 2');

            // Check count
            const batchItems = await adapter.findAll({ category: 'D' });
            expect(batchItems.length).toBe(2);
        });

        it('should update existing aggregates in the batch', async () => {
            // Arrange
            const updates = [
                { id: '1', name: 'Updated 1', value: 101, category: 'A' },
                { id: '2', name: 'Updated 2', value: 202, category: 'B' }
            ];

            // Act
            await adapter.saveAll(updates);

            // Assert
            const updated1 = await adapter.findById('1');
            const updated2 = await adapter.findById('2');

            expect(updated1.name).toBe('Updated 1');
            expect(updated1.value).toBe(101);
            expect(updated2.name).toBe('Updated 2');
            expect(updated2.value).toBe(202);
        });

        it('should throw error if aggregates is not an array', async () => {
            // Act & Assert
            await expect(adapter.saveAll('not-an-array')).rejects.toThrow('Aggregates must be an array');
            await expect(adapter.saveAll(null)).rejects.toThrow('Aggregates must be an array');
        });
    });

    describe('delete', () => {
        it('should delete an aggregate by ID', async () => {
            // Act
            await adapter.delete('2');

            // Assert
            const deletedAggregate = await adapter.findById('2');
            expect(deletedAggregate).toBeNull();
            expect(adapter.size()).toBe(3);
        });

        it('should not throw if aggregate does not exist', async () => {
            // Act & Assert - should not throw
            await expect(adapter.delete('non-existent')).resolves.toBeUndefined();
        });
    });

    describe('clear', () => {
        it('should remove all aggregates', async () => {
            // Act
            adapter.clear();

            // Assert
            expect(adapter.size()).toBe(0);
            const aggregates = await adapter.findAll();
            expect(aggregates.length).toBe(0);
        });
    });

    describe('size', () => {
        it('should return the number of aggregates', () => {
            // Act & Assert
            expect(adapter.size()).toBe(4);
        });

        it('should update after operations', async () => {
            // Act
            await adapter.save({ id: '5', name: 'Item 5', value: 500 });

            // Assert
            expect(adapter.size()).toBe(5);

            // Act
            await adapter.delete('1');

            // Assert
            expect(adapter.size()).toBe(4);

            // Act
            adapter.clear();

            // Assert
            expect(adapter.size()).toBe(0);
        });
    });
});
