import type { Locale } from '../types'

/**
 * Guesses the language of song lyrics or a title from common words.
 * Latin-script languages the app supports are scored by distinctive short
 * words; other scripts (Korean, Japanese, Cyrillic…) are recognised by their
 * characters and returned as an ISO code in `other`. Portuguese is reported
 * as pt-BR, the variant of the song sources the app reads.
 */
export interface DetectedLanguage {
  /** A language the app supports, when recognised. */
  locale?: Locale
  /** ISO 639-1 code of another language, when recognised by its script. */
  other?: string
}

const WORDS: Record<Exclude<Locale, 'pt'>, string[]> = {
  'pt-BR': [
    'nao', 'voce', 'meu', 'minha', 'teu', 'tua', 'sou', 'pra', 'ele', 'ela', 'coracao', 'senhor', 'deus', 'nosso',
    'nossa', 'vida', 'amor', 'em', 'do', 'da', 'dos', 'das', 'no', 'na', 'os', 'as', 'um', 'uma', 'com', 'quando',
    'mim', 'ti', 'seu', 'sua', 'vem', 'sempre', 'tudo', 'nada', 'aqui', 'onde', 'eu', 'ao', 'pai', 'filho', 'gloria',
  ],
  es: [
    'el', 'los', 'las', 'yo', 'y', 'mi', 'es', 'senor', 'dios', 'corazon', 'eres', 'soy', 'muy', 'con', 'mis', 'tus',
    'nuestro', 'vida', 'amor', 'cuando', 'ti', 'todo', 'nada', 'aqui', 'donde', 'padre', 'hijo', 'gloria', 'del', 'al',
    'hay', 'esta', 'pero', 'porque', 'contigo', 'quiero',
  ],
  en: [
    'the', 'you', 'and', 'my', 'is', 'to', 'of', 'your', 'lord', 'god', 'love', 'i', 'me', 'will', 'in', 'we', 'are',
    'be', 'all', 'for', 'with', 'it', 'this', 'that', 'he', 'his', 'our', 'jesus', 'name', 'heart', 'praise', 'song',
  ],
  fr: [
    'le', 'la', 'les', 'je', 'tu', 'et', 'est', 'dans', 'mon', 'ma', 'mes', 'des', 'pour', 'seigneur', 'dieu', 'nous',
    'vous', 'toi', 'moi', 'qui', 'une', 'un', 'pas', 'coeur', 'avec', 'sur', 'au', 'ton', 'ta',
  ],
  de: [
    'der', 'die', 'das', 'und', 'ich', 'du', 'ist', 'nicht', 'mein', 'meine', 'herr', 'gott', 'wir', 'dich', 'mich',
    'dein', 'deine', 'ein', 'eine', 'mit', 'auf', 'zu', 'bist', 'herz', 'liebe',
  ],
  it: [
    'il', 'di', 'non', 'sei', 'mio', 'mia', 'signore', 'dio', 'per', 'gli', 'io', 'tu', 'che', 'nel', 'della', 'del',
    'cuore', 'amore', 'con', 'una', 'sono', 'tuo', 'tua', 'noi', 'ti',
  ],
}

const SETS = Object.entries(WORDS).map(([locale, words]) => [locale as Locale, new Set(words)] as const)

const SCRIPTS: [RegExp, string][] = [
  [/\p{Script=Hangul}/u, 'ko'],
  [/[\p{Script=Hiragana}\p{Script=Katakana}]/u, 'ja'],
  [/\p{Script=Han}/u, 'zh'],
  [/\p{Script=Cyrillic}/u, 'ru'],
  [/\p{Script=Greek}/u, 'el'],
  [/\p{Script=Hebrew}/u, 'he'],
  [/\p{Script=Arabic}/u, 'ar'],
  [/\p{Script=Devanagari}/u, 'hi'],
  [/\p{Script=Thai}/u, 'th'],
]

function words(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
}

/**
 * `minHits`: how many known words the winner needs. Lyrics give plenty
 * (default 4); a title gives few, so callers pass 2 and accept a fallback.
 */
export function detectLanguage(text: string, { minHits = 4 }: { minHits?: number } = {}): DetectedLanguage {
  const sample = text.slice(0, 4000)
  const letters = sample.replace(/[\s\p{P}\p{N}]/gu, '')
  for (const [pattern, code] of SCRIPTS) {
    const matches = letters.match(new RegExp(pattern.source, 'gu'))?.length ?? 0
    if (letters.length > 0 && matches / letters.length > 0.3) return { other: code }
  }

  const tokens = words(sample)
  const scores = SETS.map(([locale, set]) => ({ locale, hits: tokens.filter((token) => set.has(token)).length }))
  scores.sort((a, b) => b.hits - a.hits)
  const [best, second] = scores
  if (best.hits < minHits || best.hits < second.hits * 1.25) return {}
  return { locale: best.locale }
}
