import { defineConfig } from 'tsup';
import { copyFileSync, mkdirSync } from 'fs';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'react/index': 'src/react/index.tsx',
    'react/components/index': 'src/react/components/index.ts',
    'angular/index': 'src/angular/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  treeshake: true,
  splitting: true,
  sourcemap: true,
  minify: false,
  external: ['react', 'react-dom', '@angular/core', '@agallaoui/dnd-core'],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
  onSuccess: async () => {
    // Copy CSS file to dist
    mkdirSync('dist', { recursive: true });
    copyFileSync('src/styles.css', 'dist/styles.css');
  },
});
