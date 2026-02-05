import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  const supabaseUrl = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || "").trim();
  const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || "").trim();

  return {
    plugins: [react()],
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'lucide-react', '@supabase/supabase-js'],
          },
        },
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'lucide-react', '@supabase/supabase-js'],
    },
    server: {
      hmr: { overlay: false },
      watch: { usePolling: true }
    }
  };
});