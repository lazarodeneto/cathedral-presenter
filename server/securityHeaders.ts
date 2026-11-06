import type { ServerResponse } from 'node:http'

export const PRODUCTION_CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:", "media-src 'self' data: blob: https:",
  "font-src 'self' data:", "connect-src 'self' https:",
  'frame-src https://www.youtube-nocookie.com https://www.youtube.com',
  "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'",
].join('; ')

export function securityHeaders(res: ServerResponse, production: boolean) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  if (production) res.setHeader('Content-Security-Policy', PRODUCTION_CSP)
}
