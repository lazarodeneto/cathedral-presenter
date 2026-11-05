import type { Locale } from '../types'

/**
 * The Portuguese Bibles of github.com/damarals/biblias (Bíblia, Sigla, Ano,
 * Editora as listed there). Public-domain ones also ship with the app in
 * `public/bibles/` and add offline; the rest are downloaded from the
 * repository when an administrator adds them, then stored on this device.
 */
export interface CatalogBible {
  /** Sigla in the repository (folder name), e.g. "ARA". */
  code: string
  /** Bíblia */
  name: string
  /** Ano, when the repository lists one. */
  year: number | null
  /** Editora, when the repository lists one. */
  publisher: string | null
  language: Locale
  publicDomain: boolean
  /** App file for the public-domain Bibles that ship with the app. */
  bundledFile?: string
}

export const BIBLE_CATALOG_SOURCE = 'https://github.com/damarals/biblias'

export const BIBLE_CATALOG: CatalogBible[] = [
  { code: 'ACF', name: 'Almeida Corrigida e Fiel', year: 1994, publisher: 'SBTB', language: 'pt-BR', publicDomain: false },
  { code: 'ARA', name: 'Almeida Revista e Atualizada', year: 1993, publisher: 'SBB', language: 'pt-BR', publicDomain: false },
  { code: 'ARC', name: 'Almeida Revista e Corrigida', year: 1995, publisher: 'SBB', language: 'pt-BR', publicDomain: false },
  { code: 'AS21', name: 'Almeida Século 21', year: 2009, publisher: 'Vida Nova', language: 'pt-BR', publicDomain: false },
  { code: 'JFAA', name: 'Almeida Atualizada', year: null, publisher: null, language: 'pt-BR', publicDomain: false },
  { code: 'KJA', name: 'King James Atualizada', year: 1999, publisher: 'Abba Press', language: 'pt-BR', publicDomain: false },
  { code: 'KJF', name: 'King James Fiel', year: 1611, publisher: 'BVBooks', language: 'pt-BR', publicDomain: false },
  { code: 'NAA', name: 'Nova Almeida Atualizada', year: 2017, publisher: 'SBB', language: 'pt-BR', publicDomain: false },
  { code: 'NBV', name: 'Nova Bíblia Viva', year: 2007, publisher: 'Mundo Cristão', language: 'pt-BR', publicDomain: false },
  { code: 'NTLH', name: 'Nova Tradução na Linguagem de Hoje', year: 1988, publisher: 'SBB', language: 'pt-BR', publicDomain: false },
  { code: 'NVI', name: 'Nova Versão Internacional', year: null, publisher: 'Biblica', language: 'pt-BR', publicDomain: false },
  { code: 'NVT', name: 'Nova Versão Transformadora', year: 2016, publisher: 'Mundo Cristão', language: 'pt-BR', publicDomain: false },
  { code: 'TB', name: 'Tradução Brasileira', year: 2010, publisher: 'SBB', language: 'pt-BR', publicDomain: true, bundledFile: 'bibles/TB.json' },
  { code: 'BLIVRE', name: 'Bíblia Livre', year: 2018, publisher: null, language: 'pt-BR', publicDomain: true, bundledFile: 'bibles/BLIVRE.json' },
  { code: 'ALM1911', name: 'Almeida 1911', year: 1911, publisher: null, language: 'pt', publicDomain: true, bundledFile: 'bibles/ALM1911.json' },
  { code: 'OL', name: 'O Livro', year: 2000, publisher: 'Biblica', language: 'pt', publicDomain: false },
  { code: 'MENS', name: 'A Mensagem', year: 2016, publisher: 'Editora Vida', language: 'pt-BR', publicDomain: false },
  { code: 'VFL', name: 'Versão Fácil de Ler', year: 2017, publisher: 'Bible League International', language: 'pt-BR', publicDomain: false },
]

/** Library id for a catalogue Bible. Public-domain ones keep the ids they had as "included" Bibles. */
export function catalogBibleId(bible: CatalogBible): string {
  const legacy: Record<string, string> = { TB: 'included-pt-br-tb', BLIVRE: 'included-pt-br-blivre', ALM1911: 'included-pt-alm1911' }
  return legacy[bible.code] ?? `catalog-${bible.code.toLowerCase()}`
}
