// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Завантажуємо .env файли
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    // Ін'єкція змінних середовища
    define: {
      'process.env.API_KEY': JSON.stringify(
        env.GEMINI_API_KEY || env.API_KEY || env.VITE_API_KEY || ''
      ),
      'process.env.SUPABASE_URL': JSON.stringify(
        env.SUPABASE_URL || env.VITE_SUPABASE_URL || ''
      ),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(
        env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || ''
      ),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },

    // Alias для зручності (@/components тощо)
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    },

    server: {
      port: 5173,
      open: true,
      strictPort: true,
      host: true, // доступ з локальної мережі
      watch: {
        usePolling: true, // корисно на Windows/WSL
      },
    },

    build: {
      target: 'es2020', // сучасний стандарт, сумісний з більшістю браузерів
      rollupOptions: {
        external: ['react-is'], // Виправлення для Recharts
      },
      sourcemap: mode === 'development', // sourcemap тільки в dev
      minify: 'esbuild', // швидший мініфікатор за замовчуванням
      chunkSizeWarningLimit: 1000, // збільшуємо ліміт чанків, щоб уникнути попереджень
    },

    css: {
      devSourcemap: true,
    },

    // Оптимізація залежностей (швидший старт dev-сервера)
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'recharts'],
    },

    // Якщо використовуєш PostCSS/Tailwind — додай сюди
    css: {
      postcss: {
        plugins: [
          // require('tailwindcss'),
          // require('autoprefixer'),
        ],
      },
    },
  };
});