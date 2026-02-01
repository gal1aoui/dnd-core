import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'react/index': 'src/react/index.tsx',
    'angular/index': 'src/angular/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  treeshake: true,
  splitting: true,
  sourcemap: true,
  minify: false,
  external: ['react', 'react-dom', '@angular/core'],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
