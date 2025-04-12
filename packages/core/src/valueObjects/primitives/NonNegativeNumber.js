import {Number} from "./Number.js";

/**
 * Creates a NonNegativeNumber value object that ensures values are greater than or equal to zero
 * @returns {import('../Base.js').ValueObjectFactory<number>} Factory for non-negative numbers
 */
export const NonNegativeNumber = Number.extend({
    name: 'NonNegativeNumber',
    schema: (baseSchema) => baseSchema.nonnegative(),
    methods: {}
});
