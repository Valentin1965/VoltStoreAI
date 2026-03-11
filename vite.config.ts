import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // NO define block — Vite natively injects all VITE_* env vars
  // from process.env into import.meta.env at build time (works on Vercel)
  server: {
    port: 5173,
    open: true,
    headers: { 'Cache-Control': 'no-store' },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-ga4'],
          supabase: ['@supabase/supabase-js'],
          ui: ['lucide-react'],
          docs: ['docx', 'file-saver'],
          utils: ['uuid'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-ga4', 'lucide-react', 'uuid'],
    exclude: ['@mollie/api-client', 'jsonwebtoken', 'resend'],
  },
})
