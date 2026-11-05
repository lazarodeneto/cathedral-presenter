import type { Locale } from '../types'
import type { ScreenTone } from '../components/ScreenIcon'

/**
 * Bible Mode tiles: a short label and a colour group for each of the 66
 * books, in canonical order (same order as CANONICAL_BIBLE_BOOKS).
 */
const ABBR_PT = [
  'Gn', 'Êx', 'Lv', 'Nm', 'Dt', 'Js', 'Jz', 'Rt', '1Sm', '2Sm', '1Rs', '2Rs', '1Cr', '2Cr', 'Ed', 'Ne', 'Et', 'Jó',
  'Sl', 'Pv', 'Ec', 'Ct', 'Is', 'Jr', 'Lm', 'Ez', 'Dn', 'Os', 'Jl', 'Am', 'Ob', 'Jn', 'Mq', 'Na', 'Hc', 'Sf', 'Ag',
  'Zc', 'Ml', 'Mt', 'Mc', 'Lc', 'Jo', 'At', 'Rm', '1Co', '2Co', 'Gl', 'Ef', 'Fp', 'Cl', '1Ts', '2Ts', '1Tm', '2Tm',
  'Tt', 'Fm', 'Hb', 'Tg', '1Pe', '2Pe', '1Jo', '2Jo', '3Jo', 'Jd', 'Ap',
]

const ABBR_EN = [
  'Gen', 'Exo', 'Lev', 'Num', 'Deu', 'Jos', 'Jdg', 'Rut', '1Sa', '2Sa', '1Ki', '2Ki', '1Ch', '2Ch', 'Ezr', 'Neh', 'Est',
  'Job', 'Psa', 'Pro', 'Ecc', 'Sng', 'Isa', 'Jer', 'Lam', 'Ezk', 'Dan', 'Hos', 'Jol', 'Amo', 'Oba', 'Jon', 'Mic', 'Nah',
  'Hab', 'Zep', 'Hag', 'Zec', 'Mal', 'Mat', 'Mrk', 'Luk', 'Jhn', 'Act', 'Rom', '1Co', '2Co', 'Gal', 'Eph', 'Php', 'Col',
  '1Th', '2Th', '1Ti', '2Ti', 'Tit', 'Phm', 'Heb', 'Jas', '1Pe', '2Pe', '1Jn', '2Jn', '3Jn', 'Jud', 'Rev',
]

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

/** Group sizes in canonical order: 5 + 12 + 5 + 5 + 12 = 39 OT, 4 + 1 + 13 + 8 + 1 = 27 NT. */
const GROUP_RUNS: [BookGroup, number][] = [
  ['law', 5],
  ['history', 12],
  ['poetry', 5],
  ['majorProphets', 5],
  ['minorProphets', 12],
  ['gospels', 4],
  ['acts', 1],
  ['paul', 13],
  ['general', 8],
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
  const list = locale === 'pt' || locale === 'pt-BR' || locale === 'es' || locale === 'it' ? ABBR_PT : ABBR_EN
  return list[index] ?? ''
}
