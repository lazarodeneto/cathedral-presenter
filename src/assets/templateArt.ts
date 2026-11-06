// Photographic template assets use stable, allowlisted URLs across development and packaged builds.
export const ART_WATER = '/media/cinematic/water.jpg'
export const ART_NIGHTSCAPE = '/media/cinematic/night.jpg'
export const ART_DOVE = '/media/cinematic/dove.mp4'
export const ART_CALVARY = '/media/cinematic/calvary.jpg'
export const ART_KNEELING = '/media/cinematic/prayer.jpg'
export const ART_WORSHIP = '/media/cinematic/worship-v3.jpg'
export const ART_LIGHT = '/media/cinematic/light.jpg'
const ASSETS = new Set([ART_WATER, ART_NIGHTSCAPE, ART_DOVE, ART_CALVARY, ART_KNEELING, ART_WORSHIP, ART_LIGHT, '/media/cinematic/worship.jpg', '/media/cinematic/worship-v2.jpg'])
export function isCinematicAsset(value: unknown): value is string { return typeof value === 'string' && ASSETS.has(value) }
