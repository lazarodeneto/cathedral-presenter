import { useMemo, useRef, useState } from 'react'
import { Archive, BookOpen, Eye, EyeOff, Pencil, Plus, ShieldCheck, Trash2, Upload } from 'lucide-react'
import type { BibleTranslation, CustomBibleTranslation, Locale } from '../../types'
import { LOCALE_OPTIONS, languageName } from '../../i18n/dictionary'
import {
  allBundledTranslations,
  bibleTranslationsWith,
  countBibleVerses,
  createCustomBibleId,
  isBundledBibleTranslation,
} from '../../providers/bible/customBibles'
import { useAppStore } from '../../store/useAppStore'
import { useToasts } from '../../store/useToasts'
import { useT } from '../../i18n/useT'
import { ConfirmDialog, Modal } from '../Modal'
import { validateExternalUrl } from '../../security/url'
import {
  BIBLE_IMPORT_MAX_BYTES,
  parseBibleTextJson,
  type BibleImportError,
} from '../../utils/bibleImport'
import { IncludedBibles } from './IncludedBibles'
import { reloadAfterAdd } from '../../store/appReload'

const LICENSE_TYPES: BibleTranslation['licenseType'][] = [
  'church-import',
  'public-domain',
  'cc0',
  'cc-by',
  'provider',
]

function importErrorMessage(reason: BibleImportError): string {
  switch (reason) {
    case 'too-large':
      return 'settings.bibleImportTooLarge'
    case 'invalid-json':
      return 'settings.bibleImportInvalidJson'
    case 'no-verses':
      return 'settings.bibleImportNoVerses'
    default:
      return 'settings.bibleImportInvalidFormat'
  }
}

export function BibleLibraryPanel() {
  const t = useT()
  const locale = useAppStore((state) => state.settings.locale)
  const customBibles = useAppStore((state) => state.customBibles)
  const hiddenBibleIds = useAppStore((state) => state.hiddenBibleIds)
  const archivedBibleIds = useAppStore((state) => state.archivedBibleIds)
  const addCustomBible = useAppStore((state) => state.addCustomBible)
  const updateCustomBible = useAppStore((state) => state.updateCustomBible)
  const removeCustomBible = useAppStore((state) => state.removeCustomBible)
  const hideBibleTranslation = useAppStore((state) => state.hideBibleTranslation)
  const unhideBibleTranslation = useAppStore((state) => state.unhideBibleTranslation)
  const archiveBibleTranslation = useAppStore((state) => state.archiveBibleTranslation)
  const unarchiveBibleTranslation = useAppStore((state) => state.unarchiveBibleTranslation)
  const deletedBibleIds = useAppStore((state) => state.deletedBibleIds)
  const deleteBibleTranslation = useAppStore((state) => state.deleteBibleTranslation)
  const push = useToasts((state) => state.push)
  const translations = useMemo(
    () => bibleTranslationsWith(customBibles, { hidden: hiddenBibleIds, archived: archivedBibleIds, deleted: deletedBibleIds }),
    [customBibles, hiddenBibleIds, archivedBibleIds, deletedBibleIds],
  )
  const hiddenTranslations = useMemo(
    () => allBundledTranslations().filter((t) => hiddenBibleIds.includes(t.id)),
    [hiddenBibleIds],
  )
  const archivedTranslations = useMemo(
    () => allBundledTranslations().filter((t) => archivedBibleIds.includes(t.id)),
    [archivedBibleIds],
  )
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<CustomBibleTranslation | null>(null)
  const [deleting, setDeleting] = useState<BibleTranslation | null>(null)
  const [archiving, setArchiving] = useState<BibleTranslation | null>(null)
  const [deletingPermanently, setDeletingPermanently] = useState<BibleTranslation | null>(null)
  const [showHidden, setShowHidden] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const closeForm = () => {
    setAdding(false)
    setEditing(null)
  }

  const confirmDelete = () => {
    if (!deleting) return
    const result = removeCustomBible(deleting.id)
    if (!result.ok) {
      push(t('settings.bibleCannotDelete'), 'error')
      return
    }
    push(
      t(result.resetTranslation ? 'settings.bibleDeletedFallback' : 'settings.bibleDeleted'),
      'success',
    )
  }

  const confirmArchive = () => {
    if (!archiving) return
    const result = archiveBibleTranslation(archiving.id)
    if (!result.ok) {
      push(
        t(result.reason === 'last-visible' ? 'settings.bibleLastVisible' : 'settings.bibleCannotDelete'),
        'error',
      )
      return
    }
    push(
      t(result.resetTranslation ? 'settings.bibleArchivedFallback' : 'settings.bibleArchived'),
      'success',
    )
  }

  const confirmDeletePermanently = () => {
    if (!deletingPermanently) return
    const result = deleteBibleTranslation(deletingPermanently.id)
    if (!result.ok) {
      push(
        t(result.reason === 'last-visible' ? 'settings.bibleLastVisible' : 'settings.bibleCannotDelete'),
        'error',
      )
      return
    }
    push(
      t(result.resetTranslation ? 'settings.bibleDeletedPermanentlyFallback' : 'settings.bibleDeletedPermanently'),
      'success',
    )
  }

  return (
    <>
      <section className="settings-section">
        <div className="settings-section-head">
          <span className="settings-icon">
            <BookOpen size={18} />
          </span>
          <div>
            <h2>{t('settings.bibleTitle')}</h2>
            <p>{t('settings.bibleSubtitle')}</p>
          </div>
          <button className="btn btn-primary btn-sm" type="button" onClick={() => setAdding(true)}>
            <Plus size={15} />
            {t('settings.bibleAdd')}
          </button>
        </div>

        <ul className="bible-admin-list" aria-label={t('settings.bibleTitle')}>
          {translations.map((translation) => {
            const bundled = isBundledBibleTranslation(translation.id)
            return (
              <li key={translation.id} className="bible-admin-row">
                <span className="bible-translation-abbr">{translation.abbreviation}</span>
                <span className="bible-admin-copy">
                  <strong>{translation.name}</strong>
                  <small>
                    {languageName(translation.language, locale)} ·{' '}
                    {[translation.year, translation.publisher].filter(Boolean).map((part) => `${part} · `).join('')}
                    {translation.verseCount === 1
                      ? t('settings.bibleCountOne')
                      : t('settings.bibleCount', { count: translation.verseCount })}
                  </small>
                </span>
                <span className={`badge ${bundled ? 'badge-quiet' : 'badge-amber'}`}>
                  {bundled ? t('settings.bibleBundled') : t('settings.bibleCustom')}
                </span>
                {bundled ? (
                  <>
                    <button
                      className="icon-btn"
                      type="button"
                      aria-label={`${t('settings.bibleHide')}: ${translation.name}`}
                      title={t('settings.bibleHide')}
                      onClick={() => {
                        const result = hideBibleTranslation(translation.id)
                        if (!result.ok) {
                          push(
                            t(result.reason === 'last-visible' ? 'settings.bibleLastVisible' : 'settings.bibleCannotHide'),
                            'error',
                          )
                          return
                        }
                        push(
                          t(result.resetTranslation ? 'settings.bibleHiddenFallback' : 'settings.bibleHidden'),
                          'success',
                        )
                      }}
                    >
                      <EyeOff size={15} />
                    </button>
                    <button
                      className="icon-btn"
                      type="button"
                      aria-label={`${t('settings.bibleArchive')}: ${translation.name}`}
                      title={t('settings.bibleArchive')}
                      onClick={() => setArchiving(translation)}
                    >
                      <Archive size={15} />
                    </button>
                    <button
                      className="icon-btn danger-text"
                      type="button"
                      aria-label={`${t('settings.bibleDeletePermanently')}: ${translation.name}`}
                      title={t('settings.bibleDeletePermanently')}
                      onClick={() => setDeletingPermanently(translation)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="icon-btn"
                      type="button"
                      aria-label={`${t('settings.bibleEdit')}: ${translation.name}`}
                      title={t('settings.bibleEdit')}
                      onClick={() => {
                        setEditing(
                          customBibles.find((entry) => entry.translation.id === translation.id) ??
                            null,
                        )
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-btn danger-text"
                      type="button"
                      aria-label={`${t('settings.bibleDelete')}: ${translation.name}`}
                      title={t('settings.bibleDelete')}
                      onClick={() => setDeleting(translation)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>

        <IncludedBibles />

        {hiddenTranslations.length > 0 && (
          <div className="bible-hidden-section">
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => setShowHidden(!showHidden)}
            >
              <Eye size={15} />
              {t('settings.bibleShowHidden', { count: hiddenTranslations.length })}
            </button>
            {showHidden && (
              <ul className="bible-admin-list bible-admin-list-hidden" aria-label={t('settings.bibleHiddenList')}>
                {hiddenTranslations.map((translation) => (
                  <li key={translation.id} className="bible-admin-row bible-admin-row-hidden">
                    <span className="bible-translation-abbr">{translation.abbreviation}</span>
                    <span className="bible-admin-copy">
                      <strong>{translation.name}</strong>
                      <small>{languageName(translation.language, locale)}</small>
                    </span>
                    <span className="badge badge-quiet">{t('settings.bibleHiddenBadge')}</span>
                    <button
                      className="icon-btn"
                      type="button"
                      aria-label={`${t('settings.bibleUnhide')}: ${translation.name}`}
                      title={t('settings.bibleUnhide')}
                      onClick={() => {
                        unhideBibleTranslation(translation.id)
                        push(t('settings.bibleRestored'), 'success')
                      }}
                    >
                      <Eye size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {archivedTranslations.length > 0 && (
          <div className="bible-hidden-section">
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => setShowArchived(!showArchived)}
            >
              <Archive size={15} />
              {t('settings.bibleShowArchived', { count: archivedTranslations.length })}
            </button>
            {showArchived && (
              <ul className="bible-admin-list bible-admin-list-hidden" aria-label={t('settings.bibleArchivedList')}>
                {archivedTranslations.map((translation) => (
                  <li key={translation.id} className="bible-admin-row bible-admin-row-hidden">
                    <span className="bible-translation-abbr">{translation.abbreviation}</span>
                    <span className="bible-admin-copy">
                      <strong>{translation.name}</strong>
                      <small>{languageName(translation.language, locale)}</small>
                    </span>
                    <span className="badge badge-quiet">{t('settings.bibleArchivedBadge')}</span>
                    <button
                      className="icon-btn"
                      type="button"
                      aria-label={`${t('settings.bibleUnarchive')}: ${translation.name}`}
                      title={t('settings.bibleUnarchive')}
                      onClick={() => {
                        unarchiveBibleTranslation(translation.id)
                        push(t('settings.bibleRestored'), 'success')
                      }}
                    >
                      <Eye size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="setting-footnote">
          <ShieldCheck size={14} />
          {t('settings.bibleFootnote')}
        </div>
      </section>

      {(adding || editing) && (
        <BibleImportDialog
          key={editing?.translation.id ?? 'new-bible'}
          locale={locale}
          existingIds={new Set(translations.map((translation) => translation.id))}
          editing={editing ?? undefined}
          onClose={closeForm}
          onSaved={() => {
            const updated = Boolean(editing)
            closeForm()
            if (updated) push(t('settings.bibleUpdated'), 'success')
            else void reloadAfterAdd(t('settings.bibleAdded'))
          }}
          addCustomBible={addCustomBible}
          updateCustomBible={updateCustomBible}
          pushError={(messageKey) => push(t(messageKey), 'error')}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={t('settings.bibleDeleteTitle')}
        copy={t('settings.bibleDeleteCopy', { name: deleting?.name ?? '' })}
        confirmLabel={t('settings.bibleDelete')}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={archiving !== null}
        title={t('settings.bibleArchiveTitle')}
        copy={t('settings.bibleArchiveCopy', { name: archiving?.name ?? '' })}
        confirmLabel={t('settings.bibleArchive')}
        onConfirm={confirmArchive}
        onClose={() => setArchiving(null)}
      />

      <ConfirmDialog
        open={deletingPermanently !== null}
        title={t('settings.bibleDeletePermanentlyTitle')}
        copy={t('settings.bibleDeletePermanentlyCopy', { name: deletingPermanently?.name ?? '' })}
        confirmLabel={t('settings.bibleDeletePermanently')}
        onConfirm={confirmDeletePermanently}
        onClose={() => setDeletingPermanently(null)}
      />
    </>
  )
}

function BibleImportDialog({
  locale,
  existingIds,
  editing,
  onClose,
  onSaved,
  addCustomBible,
  updateCustomBible,
  pushError,
}: {
  locale: Locale
  existingIds: Set<string>
  editing?: CustomBibleTranslation
  onClose: () => void
  onSaved: () => void
  addCustomBible: ReturnType<typeof useAppStore.getState>['addCustomBible']
  updateCustomBible: ReturnType<typeof useAppStore.getState>['updateCustomBible']
  pushError: (messageKey: string) => void
}) {
  const t = useT()
  const source = editing?.translation
  const [name, setName] = useState(source?.name ?? '')
  const [abbreviation, setAbbreviation] = useState(source?.abbreviation ?? '')
  const [year, setYear] = useState(source?.year ? String(source.year) : '')
  const [publisher, setPublisher] = useState(source?.publisher ?? '')
  const [language, setLanguage] = useState<Locale>(source?.language ?? locale)
  const [licenseType, setLicenseType] = useState<BibleTranslation['licenseType']>(
    source?.licenseType ?? 'church-import',
  )
  const [licenseText, setLicenseText] = useState(source?.licenseText ?? '')
  const [copyrightNotice, setCopyrightNotice] = useState(source?.copyrightNotice ?? '')
  const [sourceUrl, setSourceUrl] = useState(source?.sourceUrl ?? '')
  const [fileName, setFileName] = useState('')
  const [rawText, setRawText] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const readFile = async (file: File) => {
    setFileName(file.name)
    if (file.size > BIBLE_IMPORT_MAX_BYTES) {
      setRawText('')
      pushError('settings.bibleImportTooLarge')
      return
    }
    try {
      setRawText(await file.text())
    } catch {
      setRawText('')
      pushError('settings.bibleImportReadFailed')
    }
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const cleanName = name.trim()
    const cleanAbbreviation = abbreviation.trim()
    if (fileName && !rawText) {
      pushError('settings.bibleImportReadFailed')
      return
    }
    if (!cleanName || !cleanAbbreviation || (!rawText && !editing)) {
      pushError('settings.bibleRequired')
      return
    }

    let books = editing?.books
    if (rawText) {
      const parsed = parseBibleTextJson(rawText)
      if (!parsed.ok) {
        pushError(importErrorMessage(parsed.reason))
        return
      }
      books = parsed.books
    }
    if (!books) {
      pushError('settings.bibleRequired')
      return
    }

    let checkedSource: string | undefined
    if (sourceUrl.trim()) {
      const validation = validateExternalUrl(sourceUrl)
      if (!validation.ok) {
        pushError('settings.bibleInvalidUrl')
        return
      }
      checkedSource = validation.url
    }

    const parsedYear = Number(year.trim())
    const cleanYear = year.trim() && Number.isInteger(parsedYear) && parsedYear >= 1000 && parsedYear <= 2200 ? parsedYear : undefined

    const id = editing?.translation.id ?? createCustomBibleId(cleanAbbreviation, language, existingIds)
    const entry: CustomBibleTranslation = {
      translation: {
        id,
        providerId: editing?.translation.providerId ?? 'local-bible',
        name: cleanName,
        abbreviation: cleanAbbreviation,
        language,
        licenseType,
        licenseText: licenseText.trim() || 'Imported by the church',
        sourceUrl: checkedSource,
        copyrightNotice:
          copyrightNotice.trim() ||
          licenseText.trim() ||
          'Imported by the church. Check the publisher terms before redistribution.',
        bundled: false,
        sample: false,
        verseCount: countBibleVerses(books),
        availability: 'bundled',
        ...(cleanYear ? { year: cleanYear } : {}),
        ...(publisher.trim() ? { publisher: publisher.trim() } : {}),
      },
      books,
    }

    if (editing) {
      const result = updateCustomBible(entry)
      if (!result.ok) {
        pushError(result.reason === 'not-found' ? 'settings.bibleNotFound' : 'settings.bibleInvalid')
        return
      }
    } else {
      const result = addCustomBible(entry)
      if (!result.ok) {
        pushError(
          result.reason === 'duplicate' ? 'settings.bibleDuplicate' : 'settings.bibleInvalid',
        )
        return
      }
    }
    onSaved()
  }

  return (
    <Modal
      title={t(editing ? 'settings.bibleEdit' : 'settings.bibleAdd')}
      subtitle={t(editing ? 'settings.bibleEditSubtitle' : 'settings.bibleAddSubtitle')}
      onClose={onClose}
      wide
    >
      <form className="bible-import-form" onSubmit={submit}>
        <div className="settings-grid">
          <label className="field">
            <span>{t('settings.bibleName')}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('settings.bibleNamePlaceholder')}
              maxLength={120}
              required
            />
          </label>
          <label className="field">
            <span>{t('settings.bibleAbbreviation')}</span>
            <input
              value={abbreviation}
              onChange={(event) => setAbbreviation(event.target.value)}
              placeholder={t('settings.bibleAbbreviationPlaceholder')}
              maxLength={24}
              required
            />
          </label>
          <label className="field">
            <span>{t('settings.bibleYear')}</span>
            <input
              value={year}
              onChange={(event) => setYear(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              inputMode="numeric"
              placeholder="1993"
            />
          </label>
          <label className="field">
            <span>{t('settings.biblePublisher')}</span>
            <input
              value={publisher}
              onChange={(event) => setPublisher(event.target.value)}
              placeholder={t('settings.biblePublisherPlaceholder')}
              maxLength={120}
            />
          </label>
          <label className="field">
            <span>{t('settings.bibleLanguage')}</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as Locale)}
            >
              {LOCALE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.flag} {option.label}
                </option>
              ))}
            </select>
            <small className="field-hint">{t('settings.bibleLanguageHint')}</small>
          </label>
          <label className="field">
            <span>{t('settings.bibleLicense')}</span>
            <select
              value={licenseType}
              onChange={(event) =>
                setLicenseType(event.target.value as BibleTranslation['licenseType'])
              }
            >
              {LICENSE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`settings.bibleLicenseType.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('settings.bibleLicenseText')}</span>
            <input
              value={licenseText}
              onChange={(event) => setLicenseText(event.target.value)}
              maxLength={2000}
            />
          </label>
          <label className="field">
            <span>{t('settings.bibleSourceUrl')}</span>
            <input
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://"
              maxLength={500}
            />
          </label>
        </div>

        <label className="field">
          <span>{t('settings.bibleCopyright')}</span>
          <textarea
            value={copyrightNotice}
            onChange={(event) => setCopyrightNotice(event.target.value)}
            rows={2}
            maxLength={2000}
          />
        </label>

        <div className="bible-import-file">
          <div>
            <strong>{t('settings.bibleTextFile')}</strong>
            <p>
              {editing
                ? t('settings.bibleTextKeep', { count: editing.translation.verseCount })
                : t('settings.bibleTextHint')}
            </p>
          </div>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={15} />
            {t('settings.bibleChooseFile')}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void readFile(file)
              event.target.value = ''
            }}
          />
        </div>
        <p className="muted-note">
          {fileName || t('settings.bibleNoFile')}
          {rawText ? ` · ${new Blob([rawText]).size.toLocaleString()} B` : ''}
        </p>

        <div className="modal-actions">
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" type="submit">
            {t('settings.bibleSave')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
