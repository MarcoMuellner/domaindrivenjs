import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.js'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    clean: true,
    sourcemap: true,
    outExtension({ format }) {
        return {
            js: format === 'esm' ? '.js' : '.cjs',
        }
    },
})
