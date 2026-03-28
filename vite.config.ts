import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

const DEFAULT_DEV_API_ORIGIN = 'https://www.glsolargroup.dk'

/** Dev: forward calculator spot-price calls directly to Energi Data Service (avoids production /api 404). */
function energiElspotDevProxy(): Plugin {
  return {
    name: 'gls-energi-elspot-dev-proxy',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = req.url || ''
        if (!raw.startsWith('/api/energi-dataset-elspotprices')) {
          return next()
        }
        const u = new URL(raw, 'http://vite.local')
        const dest = `https://api.energidataservice.dk/dataset/Elspotprices${u.search}`
        void fetch(dest)
          .then(async (r) => {
            res.statusCode = r.status
            const ct = r.headers.get('content-type')
            if (ct) res.setHeader('Content-Type', ct)
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end(Buffer.from(await r.arrayBuffer()))
          })
          .catch(() => {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Energi proxy failed' }))
          })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  /**
   * Proxy /api/* during `npm run dev` so `/api/create-payment` hits a host that has Vercel Functions.
   * Defaults to production origin in development unless DEV_API_PROXY_DISABLE=true.
   */
  const proxyDisabled = env.DEV_API_PROXY_DISABLE === 'true' || env.DEV_API_PROXY === '0'
  const explicitProxy = (env.DEV_API_PROXY || '').trim().replace(/\/$/, '')
  const devApiProxy = proxyDisabled
    ? ''
    : explicitProxy ||
      (mode === 'development' ? (env.VITE_DEV_API_PROXY || DEFAULT_DEV_API_ORIGIN).replace(/\/$/, '') : '')

  return {
    plugins: [react(), ...(mode === 'development' ? [energiElspotDevProxy()] : [])],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      open: true,
      headers: { 'Cache-Control': 'no-store' },
      ...(devApiProxy
        ? {
            proxy: {
              '/api': {
                target: devApiProxy,
                changeOrigin: true,
                secure: true,
              },
            },
          }
        : {}),
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
  }
})
