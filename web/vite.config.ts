import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { infoDeBuild } from './scripts/build-info.mjs'

export default defineConfig({
  plugins: [react()],
  // Versión y commit del build: la app los muestra abajo en el menú
  define: infoDeBuild(),
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
