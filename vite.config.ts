import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// Dos páginas: el resumen (/) y el acceso (/auth/).
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        resumen: resolve(import.meta.dirname, 'index.html'),
        auth: resolve(import.meta.dirname, 'auth/index.html'),
      },
    },
  },
})
