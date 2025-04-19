import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.js'],
    format: ['esm', 'cjs'],
    dts: true, // Enable declaration file generation
    splitting: false,
    clean: true,
    sourcemap: true,
    treeshake: true,
    minify: false,
    outExtension({ format }) {
        return {
            js: format === 'esm' ? '.js' : '.cjs',
        }
    },
    // Ensure JSDoc comments are preserved in the output
    esbuildOptions(options) {
        options.keepNames = true
    },
})
