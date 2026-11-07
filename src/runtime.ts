/** Hosting is explicit: a cloud build must never fall back to an anonymous local workspace. */
export const isCloud = import.meta.env.VITE_CATHEDRAL_MODE === 'cloud'
export const DEFAULT_CLOUD_ORIGIN = 'https://cathedral-presenter-algarve.netlify.app'
