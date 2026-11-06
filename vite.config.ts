import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { accountAuth } from './server/auth'
import { letrasGospelProxy } from './server/letrasgospelProxy'

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  'frame-src https://www.youtube-nocookie.com https://www.youtube.com',
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ')

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
    accountAuth(),
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
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    css: false,
  },
})
