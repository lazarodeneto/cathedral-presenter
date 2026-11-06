import type { BibleTranslation, Locale } from '../types'
import { BIBLE_TRANSLATIONS } from './bible'

export interface IncludedBible {
  id: string
  file: string
  name: string
  abbreviation: string
  language: Locale
  licenseType: BibleTranslation['licenseType']
  copyrightNotice: string
  sourceUrl: string
}

/** Only these two complete texts are shipped in every app download. */
export const INCLUDED_BIBLES: IncludedBible[] = BIBLE_TRANSLATIONS.map((translation) => ({
  id: translation.id,
  file: `src/data/bibles/${translation.abbreviation}.json`,
  name: translation.name,
  abbreviation: translation.abbreviation,
  language: translation.language,
  licenseType: translation.licenseType,
  copyrightNotice: translation.copyrightNotice,
  sourceUrl: translation.sourceUrl!,
}))
