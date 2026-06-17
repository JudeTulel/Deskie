import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    build: { outDir: 'dist/main' } 
  },
  preload: {
    build: { outDir: 'dist/preload' } 
  },
  renderer: {
    build: { outDir: 'dist/renderer' }, 
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})