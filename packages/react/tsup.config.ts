import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  minify: false,
  external: ['react', 'react-dom', '@agal1aoui/dnd-core'],
  esbuildOptions(options) {
    options.jsx = 'automatic'
  },
})
