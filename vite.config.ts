
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // Use type assertion for process to resolve the cwd property error in specific environments
  const env = loadEnv(mode, (process as any).cwd(), '');

  const supabaseUrl = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || "").trim();
  const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || "").trim();

  return {
    plugins: [react()],
    define: {
      // Важливо: додаємо префікс VITE_, щоб Vite правильно ін'єктував їх
      'process.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      // Також залишаємо без префікса, якщо десь використовується так
      'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'lucide-react', '@supabase/supabase-js'],
    },
    server: {
      hmr: {
        overlay: false
      },
      watch: {
        usePolling: true
      }
    }
  };
});
