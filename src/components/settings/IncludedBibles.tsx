import { useState } from 'react'
import { CheckCircle2, Download, LoaderCircle } from 'lucide-react'
import type { CustomBibleTranslation } from '../../types'
import { INCLUDED_BIBLES, type IncludedBible } from '../../data/includedBibles'
import { countBibleVerses } from '../../providers/bible/customBibles'
import { languageName } from '../../i18n/dictionary'
import { useT } from '../../i18n/useT'
import { useAppStore } from '../../store/useAppStore'
import { useToasts } from '../../store/useToasts'
import { parseBibleTextJson } from '../../utils/bibleImport'

/** Reads one included Bible from the app's own files and builds the library entry. */
export async function loadIncludedBible(bible: IncludedBible): Promise<CustomBibleTranslation | null> {
  const response = await fetch(`${import.meta.env.BASE_URL}${bible.file}`)
  if (!response.ok) return null
  const parsed = parseBibleTextJson(await response.text())
  if (!parsed.ok) return null
  return {
    translation: {
      id: bible.id,
      providerId: 'local-bible',
      name: bible.name,
      abbreviation: bible.abbreviation,
      language: bible.language,
      licenseType: bible.licenseType,
      licenseText: bible.copyrightNotice,
      sourceUrl: bible.sourceUrl,
      copyrightNotice: bible.copyrightNotice,
      bundled: false,
      sample: false,
      verseCount: countBibleVerses(parsed.books),
      availability: 'bundled',
    },
    books: parsed.books,
  }
}

/** Complete public-domain Bibles that ship with the app, added on request. */
export function IncludedBibles() {
  const t = useT()
  const locale = useAppStore((state) => state.settings.locale)
  const customBibles = useAppStore((state) => state.customBibles)
  const addCustomBible = useAppStore((state) => state.addCustomBible)
  const push = useToasts((state) => state.push)
  const [loading, setLoading] = useState<string | null>(null)

  const add = async (bible: IncludedBible) => {
    setLoading(bible.id)
    try {
      const entry = await loadIncludedBible(bible)
      const result = entry ? addCustomBible(entry) : { ok: false as const }
      push(t(result.ok ? 'settings.includedAdded' : 'settings.includedFailed', { name: bible.name }), result.ok ? 'success' : 'error')
    } catch {
      push(t('settings.includedFailed', { name: bible.name }), 'error')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="included-bibles">
      <div className="included-bibles-head">
        <h3>{t('settings.includedTitle')}</h3>
        <p>{t('settings.includedCopy')}</p>
      </div>
      <ul className="bible-admin-list" aria-label={t('settings.includedTitle')}>
        {INCLUDED_BIBLES.map((bible) => {
          const added = customBibles.some((entry) => entry.translation.id === bible.id)
          return (
            <li key={bible.id} className="bible-admin-row">
              <span className="bible-translation-abbr">{bible.abbreviation}</span>
              <span className="bible-admin-copy">
                <strong>{bible.name}</strong>
                <small>
                  {languageName(bible.language, locale)} · {t('settings.includedPublicDomain')}
                </small>
              </span>
              {added ? (
                <span className="badge badge-quiet">
                  <CheckCircle2 size={13} />
                  {t('settings.includedInLibrary')}
                </span>
              ) : (
                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  disabled={loading !== null}
                  onClick={() => void add(bible)}
                  aria-label={`${t('settings.includedAdd')}: ${bible.name}`}
                >
                  {loading === bible.id ? <LoaderCircle size={14} className="spin" /> : <Download size={14} />}
                  {t('settings.includedAdd')}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
