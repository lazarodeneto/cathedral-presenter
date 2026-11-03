import type { BibleTranslation, Locale } from '../types'

/**
 * Complete public-domain Bibles shipped with the app as static files in
 * `public/bibles/`, from github.com/damarals/biblias (marked † public domain
 * there). They are fetched only when an administrator adds one, then stored
 * like any imported Bible. Copyrighted translations are never bundled.
 */
export interface IncludedBible {
  /** Stable translation id once added. */
  id: string
  file: string
  name: string
  abbreviation: string
  language: Locale
  licenseType: BibleTranslation['licenseType']
  copyrightNotice: string
  sourceUrl: string
}

const SOURCE = 'https://github.com/damarals/biblias'

export const INCLUDED_BIBLES: IncludedBible[] = [
  {
    id: 'included-pt-br-tb',
    file: 'bibles/TB.json',
    name: 'Tradução Brasileira',
    abbreviation: 'TB',
    language: 'pt-BR',
    licenseType: 'public-domain',
    copyrightNotice: 'Tradução Brasileira (1917). Domínio público.',
    sourceUrl: SOURCE,
  },
  {
    id: 'included-pt-br-blivre',
    file: 'bibles/BLIVRE.json',
    name: 'Bíblia Livre (completa)',
    abbreviation: 'BLIVRE',
    language: 'pt-BR',
    licenseType: 'public-domain',
    copyrightNotice: 'Bíblia Livre, Diego Santos e colaboradores (2018). Domínio público.',
    sourceUrl: SOURCE,
  },
  {
    id: 'included-pt-alm1911',
    file: 'bibles/ALM1911.json',
    name: 'Almeida 1911',
    abbreviation: 'ALM1911',
    language: 'pt',
    licenseType: 'public-domain',
    copyrightNotice: 'João Ferreira de Almeida, edição de 1911. Domínio público.',
    sourceUrl: SOURCE,
  },
]
