import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      // Resolve workspace packages to their source
      '@agal1aoui/dnd-core': path.resolve(__dirname, '../../packages/core/src'),
      '@agal1aoui/react-dnd': path.resolve(__dirname, '../../packages/react/src'),
      '@agal1aoui/vertical-dnd': path.resolve(__dirname, '../../packages/vertical/src'),
      '@agal1aoui/horizontal-dnd': path.resolve(__dirname, '../../packages/horizontal/src'),
      '@agal1aoui/board-dnd': path.resolve(__dirname, '../../packages/board/src'),
      '@agal1aoui/layout-dnd': path.resolve(__dirname, '../../packages/layout/src'),
    },
  },
})
