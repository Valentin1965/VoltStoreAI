// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY || env.VITE_API_KEY || ''),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || env.VITE_SUPABASE_URL || ''),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || ''),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    server: {
      port: 5173,
      open: true,
      strictPort: true,
      host: true,
      watch: {
        usePolling: true,
      },
    },

    build: {
      rollupOptions: {
        external: ['react-is'], // ← саме цей рядок вирішує проблему
      },
      sourcemap: mode === 'development',
      chunkSizeWarningLimit: 1000,
    },

    css: {
      devSourcemap: true,
    },
  };
});