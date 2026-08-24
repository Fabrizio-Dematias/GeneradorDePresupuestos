import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { infoDeBuild } from './scripts/build-info.mjs'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Build de previsualización: reemplaza el cliente de Supabase por un mock
// con datos de ejemplo. Uso: npx vite build -c vite.mock.config.ts
export default defineConfig({
  plugins: [react()],
  // __DEMO__ pinta un cartel: esta copia usa datos de ejemplo, no la base real
  define: { ...infoDeBuild(), __DEMO__: 'true' },
  resolve: {
    alias: [
      {
        // Cubre las dos formas de importarlo: '../lib/supabase' desde las
        // páginas y './supabase' desde los módulos que viven en lib/
        find: /^(?:.*\/)?lib\/supabase$|^\.\/supabase$/,
        replacement: path.resolve(dirname, 'dev/mock-supabase.ts'),
      },
    ],
  },
  build: {
    outDir: 'dist-mock',
  },
})
