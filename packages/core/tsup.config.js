import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.js'],
    format: ['esm', 'cjs'],
    dts: false, // We'll use our own declaration file
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
