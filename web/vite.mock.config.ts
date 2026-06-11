import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Build de previsualización: reemplaza el cliente de Supabase por un mock
// con datos de ejemplo. Uso: npx vite build -c vite.mock.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^.*\/lib\/supabase$/,
        replacement: path.resolve(dirname, 'dev/mock-supabase.ts'),
      },
    ],
  },
  build: {
    outDir: 'dist-mock',
  },
})
