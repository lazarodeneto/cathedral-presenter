import { workspaceStorage } from './server/workspace'
import { readFileSync } from 'node:fs'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { accountAuth } from './server/auth'
import { letrasGospelProxy } from './server/letrasgospelProxy'
import { outputRelay } from './server/outputRelay'
import { mediaLibrary } from './server/mediaLibrary'
import { PRODUCTION_CSP as CSP, securityHeaders } from './server/securityHeaders'

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

function productionCsp(): Plugin {
  return {
    name: 'church-presenter-production-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '</title>',
        `</title>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      )
    },
  }
}

export default defineConfig({
  plugins: [
    {
      name: 'security-response-headers',
      configureServer(server) { server.middlewares.use((_req, res, next) => { securityHeaders(res, false); next() }) },
      configurePreviewServer(server) { server.middlewares.use((_req, res, next) => { securityHeaders(res, true); next() }) },
    },
    {
      name: 'app-health',
      configureServer(server) {
        server.middlewares.use('/api/app-health', (_req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ app: 'church-presenter' }))
        })
      },
    },
    react(),
    productionCsp(),
    letrasGospelProxy(),
    accountAuth(loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '')),
    outputRelay(),
    mediaLibrary(loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '')),
    workspaceStorage(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  server: {
    port: 4173,
    strictPort: true,
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.data/**'] },
  },
  build: {
    sourcemap: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'vendor', test: /\/node_modules\// }],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    css: false,
  },
})
