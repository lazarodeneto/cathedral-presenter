import { useEffect, useState } from 'react'
import { CheckCircle2, Copyright, Download, LoaderCircle, LockOpen, TriangleAlert } from 'lucide-react'
import { BIBLE_CATALOG, BIBLE_CATALOG_SOURCE, catalogBibleId, type CatalogBible } from '../../data/bibleCatalog'
import {
  BibleDownloadFailure,
  downloadCatalogBible,
  loadBundledCatalogBible,
} from '../../providers/bible/githubBibles'
import { useT } from '../../i18n/useT'
import { useAppStore } from '../../store/useAppStore'
import { useToasts } from '../../store/useToasts'

function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

/**
 * Bible catalogue: every translation in github.com/damarals/biblias. Public-domain
 * ones ship with the app and load offline; the rest download book by book from
 * GitHub. Either way the Bible is saved on this device with its Sigla, Ano and Editora.
 */
export function IncludedBibles() {
  const t = useT()
  const customBibles = useAppStore((state) => state.customBibles)
  const addCustomBible = useAppStore((state) => state.addCustomBible)
  const push = useToasts((state) => state.push)
  const online = useOnline()
  const [loading, setLoading] = useState<{ code: string; done: number; total: number } | null>(null)

  const add = async (bible: CatalogBible) => {
    setLoading({ code: bible.code, done: 0, total: 0 })
    try {
      const entry = bible.bundledFile
        ? await loadBundledCatalogBible(bible)
        : await downloadCatalogBible(bible, {
            onProgress: (done, total) => setLoading({ code: bible.code, done, total }),
          })
      const result = entry ? addCustomBible(entry) : { ok: false as const }
      push(t(result.ok ? 'settings.includedAdded' : 'settings.includedFailed', { name: bible.name }), result.ok ? 'success' : 'error')
    } catch (error) {
      const offline = error instanceof BibleDownloadFailure && error.reason === 'offline'
      push(t(offline ? 'settings.includedOffline' : 'settings.includedFailed', { name: bible.name }), 'error')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="included-bibles">
      <div className="included-bibles-head">
        <h3>{t('settings.includedTitle')}</h3>
        <p>
          {t('settings.includedCopy')}{' '}
          <a href={BIBLE_CATALOG_SOURCE} target="_blank" rel="noreferrer noopener">
            damarals/biblias
          </a>
        </p>
        <p className="included-bibles-notice" role="note">
          <TriangleAlert size={15} aria-hidden="true" />
          <span>{t('settings.includedNotice')}</span>
        </p>
      </div>
      <ul className="bible-admin-list" aria-label={t('settings.includedTitle')}>
        {BIBLE_CATALOG.map((bible) => {
          const id = catalogBibleId(bible)
          const added = customBibles.some((entry) => entry.translation.id === id)
          const busy = loading?.code === bible.code
          const needsNetwork = !bible.bundledFile
          const details = [bible.year, bible.publisher].filter(Boolean).join(' · ')
          return (
            <li key={bible.code} className="bible-admin-row">
              <span className="bible-translation-abbr">{bible.code}</span>
              <span className="bible-admin-copy">
                <strong>{bible.name}</strong>
                <small className="included-bible-meta">
                  <span
                    className={`included-bible-rights ${bible.publicDomain ? 'is-public' : 'is-copyright'}`}
                    title={t(bible.publicDomain ? 'settings.includedPublicDomain' : 'settings.includedCopyright')}
                  >
                    {bible.publicDomain ? <LockOpen size={11} aria-hidden="true" /> : <Copyright size={11} aria-hidden="true" />}
                    {t(bible.publicDomain ? 'settings.includedPublicDomain' : 'settings.includedCopyright')}
                  </span>
                  {details ? <span>{details}</span> : null}
                </small>
              </span>
              {added ? (
                <span className="badge badge-quiet">
                  <CheckCircle2 size={13} />
                  {t('settings.includedInLibrary')}
                </span>
              ) : (
                <button
                  className="btn btn-secondary btn-sm included-bible-add"
                  type="button"
                  disabled={loading !== null || (needsNetwork && !online)}
                  title={needsNetwork && !online ? t('settings.includedOffline', { name: bible.name }) : undefined}
                  onClick={() => void add(bible)}
                  aria-label={`${t('settings.includedAdd')}: ${bible.name}`}
                >
                  {busy ? <LoaderCircle size={14} className="spin" /> : <Download size={14} />}
                  {busy && loading.total > 0 ? `${loading.done}/${loading.total}` : t('settings.includedAdd')}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
