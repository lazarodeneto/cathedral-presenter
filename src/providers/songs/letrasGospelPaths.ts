/**
 * Paths the letrasgospel.net proxy may fetch. Shared by the proxy (server/)
 * and the app, so both agree on what is allowed. Only the sitemaps and
 * artist or song pages: no query strings, no other hosts, no "..".
 */
export const LETRAS_GOSPEL_ORIGIN = 'https://www.letrasgospel.net'
export const LETRAS_GOSPEL_PROXY = '/api/letrasgospel/'

const SITEMAP = /^sitemaps\/[a-z0-9_]{1,40}\.xml$/
const PAGE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/

export function isAllowedLetrasGospelPath(path: string): boolean {
  if (path.length === 0 || path.length > 200) return false
  if (path === 'login' || path.startsWith('login/')) return false
  return SITEMAP.test(path) || PAGE.test(path)
}
