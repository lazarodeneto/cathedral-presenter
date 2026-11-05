import type { Locale } from '../types'
import type { ScreenTone } from '../components/ScreenIcon'
import { CANONICAL_BIBLE_BOOKS } from './bibleBooks'

/**
 * Bible Mode tiles: a short label and a colour group for each of the 66
 * books, in canonical order (same order as CANONICAL_BIBLE_BOOKS).
 */
// Some names share their first three letters; retain distinct, recognisable labels.
const AMBIGUOUS_ABBREVIATIONS: Partial<Record<Locale, Record<string, string>>> = {
  en: { judges: 'Jdg', jude: 'Jud', philippians: 'Php', philemon: 'Phm' },
  pt: { philippians: 'Flp', philemon: 'Flm' },
  'pt-BR': { philippians: 'Flp', philemon: 'Flm' },
  es: { philippians: 'Flp', philemon: 'Flm' },
  fr: { philippians: 'Php', philemon: 'Phm' },
  de: { philippians: 'Php', philemon: 'Phm' },
  it: { joshua: 'Gsu', job: 'Gob', joel: 'Goe', jonah: 'Gon', john: 'Gvn', judges: 'Gdc', jude: 'Gda', philippians: 'Flp', philemon: 'Flm' },
}

export type BookGroup =
  | 'law'
  | 'history'
  | 'poetry'
  | 'majorProphets'
  | 'minorProphets'
  | 'gospels'
  | 'acts'
  | 'paul'
  | 'general'
  | 'revelation'

/** Group Hebrews with Paul's letters, following the church's preferred grouping. */
const GROUP_RUNS: [BookGroup, number][] = [
  ['law', 5],
  ['history', 12],
  ['poetry', 5],
  ['majorProphets', 5],
  ['minorProphets', 12],
  ['gospels', 4],
  ['acts', 1],
  ['paul', 14],
  ['general', 7],
  ['revelation', 1],
]

export const BOOK_GROUPS: BookGroup[] = GROUP_RUNS.flatMap(([group, count]) => Array<BookGroup>(count).fill(group))

/** Category tones only (never green or red, which mean live and danger). */
export const GROUP_TONES: Record<BookGroup, ScreenTone> = {
  law: 'amber',
  history: 'orange',
  poetry: 'rose',
  majorProphets: 'violet',
  minorProphets: 'indigo',
  gospels: 'blue',
  acts: 'cyan',
  paul: 'amber',
  general: 'orange',
  revelation: 'rose',
}

/** 39: books before this index are the Old Testament. */
export const OLD_TESTAMENT_COUNT = 39

export function bookAbbreviation(index: number, locale: Locale): string {
  const book = CANONICAL_BIBLE_BOOKS[index]
  if (!book) return ''
  const name = book.names[locale] ?? book.names.en
  const number = name.match(/^\d+/)?.[0] ?? ''
  const letters = name.replace(/^\d+[.\s]*/, '').match(/\p{L}/gu) ?? []
  const letterLimit = Math.max(1, 3 - Array.from(number).length)
  const short = AMBIGUOUS_ABBREVIATIONS[locale]?.[book.id] ?? letters.slice(0, letterLimit).join('')
  const normalized = short.toLocaleLowerCase(locale)
  return number + normalized.slice(0, 1).toLocaleUpperCase(locale) + normalized.slice(1, letterLimit)
}
