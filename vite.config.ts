import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { resolve } from 'node:path'

// En desarrollo, atiende /api/* con los mismos archivos de la carpeta api/
// que Vercel publica como funciones (así el entorno local se parece a producción).
function localApi(): Plugin {
  return {
    name: 'saldo-claro-local-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (!url.pathname.startsWith('/api/')) return next()

        const method = req.method ?? 'GET'
        const module = await server.ssrLoadModule(`${url.pathname}.ts`).catch(() => null)
        const handler = module?.[method] as ((request: Request) => Promise<Response>) | undefined
        if (!handler) {
          res.statusCode = module ? 405 : 404
          res.end()
          return
        }

        const chunks: Buffer[] = []
        if (method !== 'GET' && method !== 'HEAD') {
          for await (const chunk of req) chunks.push(Buffer.from(chunk))
        }
        const request = new Request(url, {
          method,
          headers: req.headers as Record<string, string>,
          body: chunks.length ? Buffer.concat(chunks) : undefined,
        })
        const response = await handler(request)
        res.statusCode = response.status
        response.headers.forEach((value, name) => res.setHeader(name, value))
        res.end(Buffer.from(await response.arrayBuffer()))
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Las funciones de api/ leen SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY de .env.local.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [localApi(), react()],
    build: {
      // Tres páginas: resumen (/), acceso (/auth/) y demo (/demo/).
      rollupOptions: {
        input: {
          dashboard: resolve(import.meta.dirname, 'index.html'),
          auth: resolve(import.meta.dirname, 'auth/index.html'),
          demo: resolve(import.meta.dirname, 'demo/index.html'),
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      watch: { usePolling: true }, // necesario para que Docker detecte cambios en Windows
    },
  }
})
