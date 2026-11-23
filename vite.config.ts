import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { resolve } from 'node:path'

function localApi(): Plugin {
  return {
    name: 'saldo-claro-local-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (!url.pathname.startsWith('/api/')) {
          next()
          return
        }

        const method = req.method ?? 'GET'
        const route = `${url.pathname}.ts`
        try {
          const module = await server.ssrLoadModule(route) as Record<string, unknown>
          const handler = module[method] as ((request: Request) => Promise<Response> | Response) | undefined
          if (!handler) {
            res.statusCode = 405
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: 'Método no permitido.' }))
            return
          }

          const headers = new Headers()
          for (const [name, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(name, value)
            else if (Array.isArray(value)) headers.set(name, value.join(', '))
          }
          const bodyChunks: Buffer[] = []
          if (method !== 'GET' && method !== 'HEAD') {
            for await (const chunk of req) bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          }
          const request = new Request(url, {
            method,
            headers,
            body: bodyChunks.length ? Buffer.concat(bodyChunks) : undefined,
          })
          const response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((value, name) => res.setHeader(name, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          console.error('[dev:api] handler.failed', {
            method,
            path: url.pathname,
            message: error instanceof Error ? error.message : 'Unknown error',
          })
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: 'No se pudo procesar la solicitud.' }))
        }
      })
    },
  }
}

function developmentDiagnostics(): Plugin {
  return {
    name: 'saldo-claro-development-diagnostics',
    apply: 'serve',
    configureServer(server) {
      let requestNumber = 0

      server.middlewares.use((req, res, next) => {
        const requestId = ++requestNumber
        const method = req.method ?? 'GET'
        const path = new URL(req.url ?? '/', 'http://vite.local').pathname
        const startedAt = performance.now()
        const importantPath = path === '/'
          || path === '/auth/'
          || path === '/@react-refresh'
          || path.endsWith('/main.tsx')
          || path.endsWith('/auth-main.tsx')

        req.on('aborted', () => {
          console.error('[dev:http] request.aborted', { requestId, method, path })
        })
        res.on('finish', () => {
          if (importantPath || res.statusCode >= 400) {
            const level = res.statusCode >= 400 ? 'error' : 'info'
            const log = level === 'error' ? console.error : console.info
            log('[dev:http] request.finished', {
              requestId,
              method,
              path,
              status: res.statusCode,
              durationMs: Math.round(performance.now() - startedAt),
            })
          }
        })
        res.on('close', () => {
          if (!res.writableFinished) {
            console.error('[dev:http] response.closed_early', { requestId, method, path })
          }
        })

        next()
      })

      server.middlewares.use((req, res, next) => {
        if (new URL(req.url ?? '/', 'http://vite.local').pathname !== '/__dev/health') {
          next()
          return
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ status: 'ok', service: 'saldo-claro-vite', uptimeSeconds: Math.floor(process.uptime()) }))
      })

      server.httpServer?.on('error', (error) => {
        console.error('[dev:server] http.server_error', {
          name: error.name,
          message: error.message,
          code: 'code' in error ? error.code : undefined,
        })
      })
      server.ws.on('connection', () => {
        console.info('[dev:hmr] client.connected')
      })
      server.ws.on('error', (error) => {
        console.error('[dev:hmr] websocket.error', { message: error.message })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
  plugins: [localApi(), react(), developmentDiagnostics()],
  build: {
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
    watch: {
      usePolling: true,
    },
  },
  }
})
