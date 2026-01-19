import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
      'process.env': JSON.stringify(env)
    },
    resolve: {
      alias: {
        // Використовуємо абсолютний шлях для аліасу @
        '@': path.resolve(process.cwd()),
      },
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json']
    },
    server: {
      port: 5173,
      open: true,
      strictPort: true,
      // Додаємо чутливість до змін у папках
      watch: {
        usePolling: true
      }
    }
  };
});