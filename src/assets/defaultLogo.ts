const cathedralLogoUrl = new URL('./cathedral-logo.png', import.meta.url).href

// CP badge used as the default Cathedral Presenter identity.
export const DEFAULT_LOGO_DATA_URL = cathedralLogoUrl

// Kept for migrating installs that still contain the previous bundled logo.
export const LEGACY_LOGO_SHA256 = 'a231f1c6fa2ea68ca64fea140407349b6704117e0ff6c18b9fb189c33c7b09c7'
