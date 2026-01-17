import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Завантажуємо всі змінні з .env без префіксів
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Забезпечуємо доступ до ключа незалежно від того, як він названий в .env
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
      // Робимо об'єкт process.env доступним для SDK
      'process.env': JSON.stringify(env)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json']
    },
    server: {
      port: 5173,
      open: true,
      strictPort: true,
    }
  };
});