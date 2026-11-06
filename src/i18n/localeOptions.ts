import type { Locale } from '../types'

export const LOCALE_OPTIONS: { value: Locale; label: string; flag: string; short: string }[] = [
  { value: 'en', label: 'English UK', flag: '🇬🇧', short: 'UK' },
  { value: 'pt', label: 'Português PT', flag: '🇵🇹', short: 'PT' },
  { value: 'pt-BR', label: 'Português BR', flag: '🇧🇷', short: 'BR' },
  { value: 'es', label: 'Español ES', flag: '🇪🇸', short: 'ES' },
  { value: 'fr', label: 'Français FR', flag: '🇫🇷', short: 'FR' },
  { value: 'de', label: 'Deutsch DE', flag: '🇩🇪', short: 'DE' },
  { value: 'it', label: 'Italiano IT', flag: '🇮🇹', short: 'IT' },
]
