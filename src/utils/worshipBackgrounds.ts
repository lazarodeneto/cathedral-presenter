import type { CSSProperties } from 'react'
import type { BackgroundPreset } from '../types'

const palettes = [[260, 220], [215, 185], [35, 8], [170, 205], [315, 265], [45, 320], [195, 250], [140, 185], [280, 340], [20, 45]]
export function isMotionBackground(id?: string): boolean {
  return Boolean(id && (/^(worship|cinematic)-motion-\d+$/.test(id) || ['flow', 'ember', 'tide', 'stars', 'rays', 'breathe'].includes(id)))
}
export function worshipBackgroundStyle(id?: BackgroundPreset): CSSProperties | undefined {
  const cinematic = /^cinematic-motion-(\d+)$/.exec(id ?? '')
  if (cinematic) {
    const index = Number(cinematic[1])
    if (index < 1 || index > 20) return undefined
    const cool = [3, 4, 5, 7, 9, 10, 12, 13, 16, 17, 19].includes(index)
    return { '--cinematic-image': `url("/backgrounds/worship/cinematic-${String(index).padStart(2, '0')}.jpg")`, '--cinematic-duration': `${25 + (index % 5) * 5}s`, '--cinematic-direction': index % 2 ? 'alternate' : 'alternate-reverse', '--cinematic-glow': cool ? '166 207 255' : '255 203 135', '--cinematic-flow': index % 2 ? 'normal' : 'reverse' } as CSSProperties
  }
  const match = /^worship-motion-(\d+)$/.exec(id ?? '')
  if (!match) return undefined
  const n = Number(match[1]) - 1
  if (n < 0 || n >= 150) return undefined
  const family = n % 10
  const variant = Math.floor(n / 10)
  const [a, b] = palettes[(variant * 3 + family) % palettes.length]
  const glow = `hsl(${a} 80% 72% / .38)`
  const accent = `hsl(${b} 75% 55% / .32)`
  const patterns = [
    `repeating-conic-gradient(from 15deg at 50% 10%, transparent 0deg 8deg, ${glow} 10deg, transparent 13deg 24deg), radial-gradient(ellipse at 50% 8%, ${glow}, transparent 55%)`,
    `radial-gradient(circle at 18% 25%, ${glow} 0 1px, transparent 2px), radial-gradient(circle at 62% 65%, white 0 1px, transparent 2px), radial-gradient(circle at 80% 19%, ${glow} 0 2px, transparent 3px), radial-gradient(ellipse at 50% 85%, ${accent}, transparent 65%)`,
    `repeating-linear-gradient(165deg, transparent 0 8%, ${glow} 9%, transparent 11% 19%), radial-gradient(ellipse at 50% 75%, ${accent}, transparent 62%)`,
    `radial-gradient(ellipse at 25% 80%, ${glow}, transparent 48%), radial-gradient(ellipse at 75% 20%, ${accent}, transparent 45%), repeating-linear-gradient(135deg, transparent 0 17%, hsl(${a} 75% 75% / .08) 18%, transparent 20%)`,
    `repeating-radial-gradient(ellipse at 50% 110%, transparent 0 7%, ${glow} 8%, transparent 9% 15%), radial-gradient(ellipse at 50% 95%, ${accent}, transparent 55%)`,
    `linear-gradient(110deg, transparent 25%, ${glow} 36%, transparent 43% 58%, ${accent} 65%, transparent 72%), radial-gradient(ellipse at 50% 5%, ${glow}, transparent 60%)`,
    `radial-gradient(circle at 30% 35%, transparent 0 12%, ${glow} 13%, transparent 15% 22%, ${accent} 23%, transparent 25%), radial-gradient(ellipse at 60% 65%, ${accent}, transparent 55%)`,
    `repeating-linear-gradient(90deg, transparent 0 9%, hsl(${a} 70% 75% / .13) 10%, transparent 11% 21%), radial-gradient(ellipse at 50% 0%, ${glow}, transparent 65%)`,
    `radial-gradient(ellipse at 10% 95%, ${glow}, transparent 45%), radial-gradient(ellipse at 90% 10%, ${accent}, transparent 48%), repeating-linear-gradient(18deg, transparent 0 13%, hsl(${b} 75% 75% / .12) 14%, transparent 15% 22%)`,
    `radial-gradient(circle at 15% 20%, white 0 1px, transparent 2px), radial-gradient(circle at 65% 30%, ${glow} 0 2px, transparent 4px), radial-gradient(circle at 45% 75%, ${glow} 0 3px, transparent 6px), radial-gradient(ellipse at 50% 100%, ${accent}, transparent 60%)`,
  ]
  return { '--worship-a': a, '--worship-b': b, '--worship-pattern': patterns[family], '--worship-duration': `${12 + (variant % 6) * 3}s`, '--worship-angle': `${(variant * 27 + family * 19) % 360}deg`, '--worship-motion': ['worship-rays', 'worship-sparkle', 'worship-waves', 'motion-drift', 'worship-rings', 'worship-beams', 'worship-rings', 'worship-beams', 'motion-drift', 'worship-sparkle'][family] } as CSSProperties
}
