import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      // Explicitly inject env vars into the bundle so Vercel picks them up
      'import.meta.env.VITE_SUPABASE_URL':      JSON.stringify(env.VITE_SUPABASE_URL      || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
      'import.meta.env.VITE_GEMINI_API_KEY':    JSON.stringify(env.VITE_GEMINI_API_KEY    || ''),
      'import.meta.env.VITE_API_KEY':           JSON.stringify(env.VITE_API_KEY            || ''),
    },
    server: {
      port: 5173,
      open: true,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-ga4', 'lucide-react', 'uuid'],
      exclude: ['@mollie/api-client', 'jsonwebtoken', 'resend'],
    },
  }
})
