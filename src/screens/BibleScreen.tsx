import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  Check,
  ChevronRight,
  Languages,
  Library,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react'
import type {
  BibleBookCatalogEntry,
  BiblePassage,
  BibleTranslation,
  Locale,
} from '../types'
import { bookName } from '../data/bible'
import { resolveBibleProvider } from '../providers/bible/BibleProviderRegistry'
import { bibleTranslationsWith } from '../providers/bible/customBibles'
import { languageName } from '../i18n/dictionary'
import { useAppStore } from '../store/useAppStore'
import { useToasts } from '../store/useToasts'
import { useT } from '../i18n/useT'
import { navigate } from '../hooks/useHashRoute'
import { createBibleItem, createBibleSlides } from '../utils/slides'
import { isLikelyOverflow } from '../utils/slides'
import { SCREEN_META, ScreenIcon } from '../components/ScreenIcon'
import { LocaleFlag } from '../components/LocaleFlag'
import { LOCALES } from '../types'

const BROWSE = [
  { bookId: 'psalms', chapter: 23 },
  { bookId: 'john', chapter: 3 },
  { bookId: 'romans', chapter: 8 },
  { bookId: '1corinthians', chapter: 13 },
  { bookId: 'matthew', chapter: 5 },
  { bookId: 'isaiah', chapter: 40 },
  { bookId: 'philippians', chapter: 4 },
]

interface Selection {
  bookId: string
  chapter: number
  start: number
  end: number
}

function translationById(
  translations: BibleTranslation[],
  id: string,
): BibleTranslation {
  return translations.find((translation) => translation.id === id) ?? translations[0]
}

function validTranslationId(
  translations: BibleTranslation[],
  id: string,
  fallback: string,
): string {
  if (translations.some((translation) => translation.id === id)) return id
  if (translations.some((translation) => translation.id === fallback)) return fallback
  return translations[0]?.id ?? id
}

function formatReference(
  selection: Selection,
  catalog: BibleBookCatalogEntry[],
  fallbackLanguage: Locale,
): string {
  const book = catalog.find((entry) => entry.id === selection.bookId)
  const name = book?.name ?? bookName(selection.bookId, fallbackLanguage)
  const range =
    selection.start === selection.end
      ? `${selection.start}`
      : `${selection.start}–${selection.end}`
  return `${name} ${selection.chapter}:${range}`
}

export function BibleScreen() {
  const t = useT()
  const locale = useAppStore((state) => state.settings.locale)
  const services = useAppStore((state) => state.services)
  const activeServiceId = useAppStore((state) => state.activeServiceId)
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const recentPassages = useAppStore((state) => state.recentPassages)
  const addItem = useAppStore((state) => state.addItem)
  const recordRecentPassage = useAppStore((state) => state.recordRecentPassage)
  const push = useToasts((state) => state.push)
  const activeService = services.find((service) => service.id === activeServiceId)
  const customBibles = useAppStore((state) => state.customBibles)
  const hiddenBibleIds = useAppStore((state) => state.hiddenBibleIds)
  const archivedBibleIds = useAppStore((state) => state.archivedBibleIds)
  const deletedBibleIds = useAppStore((state) => state.deletedBibleIds)
  const translations = useMemo(
    () => bibleTranslationsWith(customBibles, { hidden: hiddenBibleIds, archived: archivedBibleIds, deleted: deletedBibleIds }),
    [customBibles, hiddenBibleIds, archivedBibleIds, deletedBibleIds],
  )
  const [query, setQuery] = useState('Psalm 23:1-6')
  const [translationId, setTranslationId] = useState(() =>
    validTranslationId(translations, settings.defaultTranslationId, 'blivre'),
  )
  const [secondaryId, setSecondaryId] = useState(() =>
    validTranslationId(translations, settings.secondaryTranslationId, 'tb'),
  )
  const [bilingual, setBilingual] = useState(true)
  const [results, setResults] = useState<BiblePassage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [secondaryPreview, setSecondaryPreview] = useState<BiblePassage | null>(null)
  const [catalog, setCatalog] = useState<BibleBookCatalogEntry[]>([])
  const [online, setOnline] = useState(() => navigator.onLine)
  const [offlineFallback, setOfflineFallback] = useState(false)
  const [selection, setSelection] = useState<Selection>({
    bookId: 'psalms',
    chapter: 23,
    start: 1,
    end: 6,
  })
  const [sectionId, setSectionId] = useState(
    activeService?.sections.find((section) => section.title.toLowerCase().includes('message'))?.id ??
      activeService?.sections[0]?.id ??
      '',
  )

  const provider = resolveBibleProvider(translationId)
  const primaryTranslation = translationById(translations, translationId)
  const secondaryTranslation = translationById(translations, secondaryId)
  const secondaryProvider = resolveBibleProvider(secondaryId)

  useEffect(() => {
    const nextPrimary = validTranslationId(translations, settings.defaultTranslationId, 'blivre')
    const nextSecondary = validTranslationId(translations, settings.secondaryTranslationId, 'tb')
    setTranslationId((current) =>
      translations.some((translation) => translation.id === current) ? current : nextPrimary,
    )
    setSecondaryId((current) =>
      translations.some((translation) => translation.id === current) ? current : nextSecondary,
    )
  }, [settings.defaultTranslationId, settings.secondaryTranslationId, translations])

  const currentBook = catalog.find((book) => book.id === selection.bookId) ?? catalog[0] ?? null
  const currentChapter =
    currentBook?.chapters.find((chapter) => chapter.number === selection.chapter) ??
    currentBook?.chapters[0] ??
    null
  const firstVerse = currentChapter?.firstVerse ?? 1
  const lastVerse = currentChapter?.lastVerse ?? 1
  const selectedStart = Math.min(Math.max(selection.start, firstVerse), lastVerse)
  const selectedEnd = Math.min(Math.max(selection.end, selectedStart), lastVerse)
  const activeSectionsRef = useRef(activeService?.sections)
  activeSectionsRef.current = activeService?.sections

  useEffect(() => {
    const sections = activeSectionsRef.current ?? []
    const defaults =
      sections.find((section) => section.title.toLowerCase().includes('message'))?.id ??
      sections[0]?.id ??
      ''
    setSectionId(defaults)
  }, [activeService?.id])

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(() => {
    if (online) {
      setOfflineFallback(false)
      return
    }
    const fallback = translations.find((translation) => translation.availability === 'bundled')
    if (!fallback) return
    if (primaryTranslation.availability === 'online-only') {
      setTranslationId(fallback.id)
      updateSettings({ defaultTranslationId: fallback.id })
      setOfflineFallback(true)
    }
    if (secondaryTranslation.availability === 'online-only') {
      setSecondaryId(fallback.id)
      updateSettings({ secondaryTranslationId: fallback.id })
      setOfflineFallback(true)
    }
  }, [
    online,
    primaryTranslation.availability,
    secondaryTranslation.availability,
    translations,
    updateSettings,
  ])

  useEffect(() => {
    let active = true
    provider
      .getBookCatalog(translationId, locale)
      .then((entries) => {
        if (active) setCatalog(entries)
      })
      .catch(() => {
        if (active) setCatalog([])
      })
    return () => {
      active = false
    }
  }, [provider, translationId, locale])

  useEffect(() => {
    if (catalog.length === 0) return
    const book = catalog.find((entry) => entry.id === selection.bookId) ?? catalog[0]
    const chapter =
      book.chapters.find((entry) => entry.number === selection.chapter) ?? book.chapters[0]
    if (!chapter) return
    const start = Math.min(Math.max(selection.start, chapter.firstVerse), chapter.lastVerse)
    const end = Math.min(Math.max(selection.end, start), chapter.lastVerse)
    if (
      book.id === selection.bookId &&
      chapter.number === selection.chapter &&
      start === selection.start &&
      end === selection.end
    ) {
      return
    }
    const next = { bookId: book.id, chapter: chapter.number, start, end }
    setSelection(next)
    setQuery(formatReference(next, catalog, primaryTranslation.language))
  }, [catalog, selection, primaryTranslation.language])

  useEffect(() => {
    let active = true
    setLoading(true)
    const timer = window.setTimeout(() => {
      provider
        .search(query, translationId)
        .then((result) => {
          if (!active) return
          setResults(result.passages)
          setMessage(result.messageKey ? t(result.messageKey) : (result.message ?? null))
          const first = result.passages[0]
          if (first) {
            setSelection({
              bookId: first.bookId,
              chapter: first.startChapter,
              start: first.startVerse,
              end: first.endVerse,
            })
          }
          setSelectedId((current) =>
            result.passages.some((passage) => passage.id === current)
              ? current
              : first?.id ?? null,
          )
          setLoading(false)
        })
        .catch(() => {
          if (!active) return
          setResults([])
          setMessage(t('error.apiUnavailable'))
          setLoading(false)
        })
    }, 220)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [provider, query, translationId, t])

  const selected = results.find((passage) => passage.id === selectedId) ?? results[0] ?? null
  // Always one verse per slide (see createBibleSlides).
  const slideCount = selected?.verses.length ?? 0
  const overflow = useMemo(() => {
    if (!selected) return false
    return createBibleSlides({ primary: selected, bilingual: false }).some(isLikelyOverflow)
  }, [selected])

  useEffect(() => {
    let active = true
    if (!selected || !bilingual || secondaryId === translationId) {
      setSecondaryPreview(null)
      return
    }
    secondaryProvider
      .getPassage(selected.reference, secondaryId)
      .then((passage) => {
        if (active) setSecondaryPreview(passage)
      })
      .catch(() => {
        if (active) setSecondaryPreview(null)
      })
    return () => {
      active = false
    }
  }, [bilingual, secondaryId, secondaryProvider, selected, translationId])

  const applySelection = (next: Selection) => {
    setSelection(next)
    setQuery(formatReference(next, catalog, primaryTranslation.language))
  }

  const chooseBook = (bookId: string) => {
    const book = catalog.find((entry) => entry.id === bookId)
    const chapter = book?.chapters[0]
    if (!book || !chapter) return
    applySelection({
      bookId,
      chapter: chapter.number,
      start: chapter.firstVerse,
      end: chapter.lastVerse,
    })
  }

  const chooseChapter = (chapterNumber: number) => {
    const chapter = currentBook?.chapters.find((entry) => entry.number === chapterNumber)
    if (!currentBook || !chapter) return
    applySelection({
      bookId: currentBook.id,
      chapter: chapterNumber,
      start: chapter.firstVerse,
      end: chapter.lastVerse,
    })
  }

  const chooseStart = (start: number) => {
    if (!currentBook || !currentChapter) return
    applySelection({
      bookId: currentBook.id,
      chapter: currentChapter.number,
      start,
      end: Math.max(start, selectedEnd),
    })
  }

  const chooseEnd = (end: number) => {
    if (!currentBook || !currentChapter) return
    applySelection({
      bookId: currentBook.id,
      chapter: currentChapter.number,
      start: Math.min(selectedStart, end),
      end,
    })
  }

  const choosePassage = (passage: BiblePassage) => {
    setSelectedId(passage.id)
    setSelection({
      bookId: passage.bookId,
      chapter: passage.startChapter,
      start: passage.startVerse,
      end: passage.endVerse,
    })
  }

  const addToService = async () => {
    if (!selected || !activeService) {
      push(t('toast.noActiveService'), 'error')
      return
    }
    try {
      const secondary =
        bilingual && secondaryId !== translationId
          ? await secondaryProvider.getPassage(selected.reference, secondaryId)
          : undefined
      const slides = createBibleSlides({
        primary: selected,
        secondary,
        bilingual,
      })
      const item = createBibleItem(
        `${selected.reference} · ${primaryTranslation.abbreviation}${secondary ? ` + ${secondary.translationAbbreviation}` : ''}`,
        slides,
        selected,
        secondary,
      )
      addItem(activeService.id, sectionId || activeService.sections[0]?.id || '', item)
      recordRecentPassage({ reference: selected.reference, translationId })
      push(t('bible.added'), 'success')
      navigate(`/service/${activeService.id}`)
    } catch {
      push(t('bible.noResults'), 'error')
    }
  }

  return (
    <div className="screen bible-screen" data-tone={SCREEN_META.bible.tone}>
      <div className="screen-heading">
        <div>
          <ScreenIcon screen="bible" />
          <h1>{t('bible.title')}</h1>
          <p>{t('bible.subtitle')}</p>
        </div>
        <div className="source-pill">
          <Library size={15} />
          {primaryTranslation.availability === 'bundled'
            ? t('bible.searchOffline')
            : t('status.onlineOnly')}
        </div>
      </div>

      <div className="bible-search panel">
        <div className="bible-search-form">
          <Search size={19} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('bible.searchPlaceholder')}
            aria-label={t('bible.searchPlaceholder')}
          />
        </div>
        <div className="bible-selector-grid">
          <label className="bible-selector">
            <span>{t('bible.book')}</span>
            <select
              value={currentBook?.id ?? ''}
              onChange={(event) => chooseBook(event.target.value)}
              disabled={catalog.length === 0}
            >
              {catalog.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.name}
                </option>
              ))}
            </select>
          </label>
          <label className="bible-selector">
            <span>{t('bible.chapter')}</span>
            <select
              value={currentChapter?.number ?? ''}
              onChange={(event) => chooseChapter(Number(event.target.value))}
              disabled={!currentBook}
            >
              {currentBook?.chapters.map((chapter) => (
                <option key={chapter.number} value={chapter.number}>
                  {chapter.number}
                </option>
              ))}
            </select>
          </label>
          <div className="bible-selector bible-verse-range">
            <span>{t('bible.verseRange')}</span>
            <div className="bible-range-pair">
              <select
                value={selectedStart}
                onChange={(event) => chooseStart(Number(event.target.value))}
                aria-label={t('bible.verseFrom')}
                disabled={!currentChapter}
              >
                {Array.from(
                  { length: lastVerse - firstVerse + 1 },
                  (_, index) => firstVerse + index,
                ).map((verse) => (
                  <option key={verse} value={verse}>
                    {verse}
                  </option>
                ))}
              </select>
              <span>–</span>
              <select
                value={selectedEnd}
                onChange={(event) => chooseEnd(Number(event.target.value))}
                aria-label={t('bible.verseTo')}
                disabled={!currentChapter}
              >
                {Array.from(
                  { length: lastVerse - selectedStart + 1 },
                  (_, index) => selectedStart + index,
                ).map((verse) => (
                  <option key={verse} value={verse}>
                    {verse}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="bible-selector">
            <span className="bible-selector-label bible-selector-label-primary">{t('bible.primary')}</span>
            <span className="bible-select-with-flag">
            {LOCALES.includes(primaryTranslation.language) && <LocaleFlag locale={primaryTranslation.language} size={18} />}
            <select
              value={translationId}
              onChange={(event) => {
                const nextId = validTranslationId(translations, event.target.value, translationId)
                setTranslationId(nextId)
                updateSettings({ defaultTranslationId: nextId })
              }}
            >
              {translations.map((translation) => (
                <option key={translation.id} value={translation.id}>
                  {translation.abbreviation} · {translation.name}
                </option>
              ))}
            </select>
            </span>
          </label>
          <label className="bible-selector">
            <span className="bible-selector-label bible-selector-label-secondary">{t('bible.secondary')}</span>
            <span className="bible-select-with-flag">
            {LOCALES.includes(secondaryTranslation.language) && <LocaleFlag locale={secondaryTranslation.language} size={18} />}
            <select
              value={secondaryId}
              onChange={(event) => {
                const nextId = validTranslationId(translations, event.target.value, secondaryId)
                setSecondaryId(nextId)
                updateSettings({ secondaryTranslationId: nextId })
              }}
            >
              {translations.map((translation) => (
                <option key={translation.id} value={translation.id}>
                  {translation.abbreviation} · {translation.name}
                </option>
              ))}
            </select>
            </span>
          </label>
        </div>
        <div className="bible-source-row">
          <span className="source-note">
            <ShieldCheck size={13} />
            {t('bible.sampleNote')}
          </span>
          {offlineFallback && (
            <span className="inline-warning">{t('bible.offlineFallback')}</span>
          )}
          {primaryTranslation.availability !== 'bundled' && <span className="bible-provider-state">{t('status.onlineOnly')}</span>}
        </div>
      </div>

      <div className="bible-layout">
        <aside className="bible-side panel">
          <div className="side-section">
            <span className="eyebrow">{t('bible.localLibrary')}</span>
            <div className="bible-translation-list">
              {translations.map((translation) => (
                <button
                  key={translation.id}
                  className={`bible-translation-card ${translation.id === translationId ? 'is-selected' : ''}`}
                  onClick={() => {
                    setTranslationId(translation.id)
                    updateSettings({ defaultTranslationId: translation.id })
                  }}
                  aria-pressed={translation.id === translationId}
                  aria-label={`${translation.abbreviation} · ${translation.name} · ${languageName(translation.language, locale)}`}
                  title={`${translation.name} · ${languageName(translation.language, locale)}`}
                >
                  {LOCALES.includes(translation.language) && <LocaleFlag locale={translation.language} size={20} />}
                  <span className="bible-translation-abbr">{translation.abbreviation}</span>
                  {translation.id === translationId && <Check size={14} />}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-ghost btn-sm bible-add-translation" onClick={() => navigate('/settings/bibles')}>
              <Plus size={14} aria-hidden="true" />
              <span>{t('bible.addNew')}</span>
            </button>
          </div>
          <div className="side-section">
            <span className="eyebrow">{t('bible.recent')}</span>
            {recentPassages.slice(0, 5).map((entry) => (
              <button
                key={`${entry.translationId}:${entry.reference}`}
                className="bible-side-row"
                onClick={() => {
                  setQuery(entry.reference)
                  const nextId = validTranslationId(translations, entry.translationId, translationId)
                  setTranslationId(nextId)
                  updateSettings({ defaultTranslationId: nextId })
                }}
              >
                <span>{entry.reference}</span>
                <small>{translationById(translations, entry.translationId).abbreviation}</small>
              </button>
            ))}
          </div>
          <div className="side-section">
            <span className="eyebrow">{t('bible.browse')}</span>
            {BROWSE.filter((entry) =>
              catalog.some(
                (book) =>
                  book.id === entry.bookId &&
                  book.chapters.some((chapter) => chapter.number === entry.chapter),
              ),
            ).map((entry) => {
              const book = catalog.find((candidate) => candidate.id === entry.bookId)
              const chapter = book?.chapters.find((candidate) => candidate.number === entry.chapter)
              return (
                <button
                  key={entry.bookId}
                  className="bible-side-row"
                  onClick={() => {
                    if (!book || !chapter) return
                    applySelection({
                      bookId: book.id,
                      chapter: chapter.number,
                      start: chapter.firstVerse,
                      end: chapter.lastVerse,
                    })
                  }}
                >
                  <span>{book?.name ?? bookName(entry.bookId, primaryTranslation.language)}</span>
                  <small>{entry.chapter}</small>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="bible-results panel">
          <div className="panel-header">
            <div>
              <h3>
                {loading
                  ? t('common.loading')
                  : results.length === 1
                    ? t('bible.resultCountOne')
                    : t('bible.resultCount', { count: results.length })}
              </h3>
            </div>
            {loading && <Loader2 size={17} className="spin" />}
          </div>
          <div className="bible-result-list">
            {message && results.length > 0 && <div className="inline-note">{message}</div>}
            {results.map((passage) => (
              <button
                key={passage.id}
                className={`bible-result ${selected?.id === passage.id ? 'is-selected' : ''}`}
                onClick={() => choosePassage(passage)}
              >
                <span className="bible-result-head">
                  <strong>{passage.reference}</strong>
                  <span className="badge badge-quiet">{passage.translationAbbreviation}</span>
                </span>
                <p>{passage.verses.map((verse) => verse.text).join(' ')}</p>
                <span className="bible-result-meta">
                  {passage.verses.length}{' '}
                  {t(passage.verses.length === 1 ? 'bible.verseCountOne' : 'bible.verseCount')} ·{' '}
                  {passage.translationName}
                </span>
              </button>
            ))}
            {!loading && results.length === 0 && (
              <div className="empty-inline">
                <BookOpen size={24} />
                <p>{message ?? t('bible.noResults')}</p>
              </div>
            )}
          </div>
        </section>

        <aside className="bible-preview panel">
          {selected ? (
            <>
              <div className="panel-header">
                <div>
                  <span className="eyebrow">{t('bible.preview')}</span>
                  <h3>{selected.reference}</h3>
                </div>
                <span className="badge badge-amber">{selected.translationAbbreviation}</span>
              </div>
              <div
                className="passage-preview"
                role="region"
                aria-label={`${t('bible.preview')}: ${selected.reference}`}
                tabIndex={0}
              >
                <div className="passage-block passage-primary">
                  <span className="translation-tag">
                    {selected.translationAbbreviation} · {selected.reference}
                  </span>
                  {selected.verses.map((verse) => (
                    <p key={verse.verse}>
                      <sup>{verse.verse}</sup> {verse.text}
                    </p>
                  ))}
                </div>
                {bilingual && secondaryId !== translationId && (
                  <div className="passage-block passage-secondary">
                    <span className="translation-tag">
                      {secondaryTranslation.abbreviation} ·{' '}
                      {secondaryPreview?.reference ?? selected.reference}
                    </span>
                    {secondaryPreview ? (
                      secondaryPreview.verses.map((verse) => (
                        <p key={verse.verse}>
                          <sup>{verse.verse}</sup> {verse.text}
                        </p>
                      ))
                    ) : (
                      <p className="muted-note">{t('common.loading')}</p>
                    )}
                  </div>
                )}
                <div className="license-box">
                  <span className="eyebrow">{t('bible.licenseSource')}</span>
                  <strong>{selected.translationName}</strong>
                  <p>{selected.copyrightNotice}</p>
                  <span>{selected.licenseType}</span>
                </div>
              </div>

              <div className="bible-options">
                <div className="option-head">
                  <div className="option-title">
                    <Languages size={16} />
                    {t('common.format')}
                  </div>
                  <label className="switch-row bible-switch">
                    <span>{t('bible.bilingualShort')}</span>
                    <button
                      className={`switch ${bilingual ? 'is-on' : ''}`}
                      onClick={() => setBilingual(!bilingual)}
                      type="button"
                      role="switch"
                      aria-checked={bilingual}
                      aria-label={t('bible.bilingual')}
                    >
                      <span />
                    </button>
                  </label>
                </div>
                {bilingual && (
                  <div className="bible-language-pair">
                    <label className="bible-language-field bible-language-primary">
                      <span>{t('bible.primary')}</span>
                      <span className="bible-select-with-flag">
                      {LOCALES.includes(primaryTranslation.language) && <LocaleFlag locale={primaryTranslation.language} size={18} />}
                      <select
                        value={translationId}
                        onChange={(event) => {
                          const nextId = validTranslationId(translations, event.target.value, translationId)
                          setTranslationId(nextId)
                          updateSettings({ defaultTranslationId: nextId })
                        }}
                      >
                        {translations.map((translation) => (
                          <option key={translation.id} value={translation.id}>
                            {translation.abbreviation} · {translation.name}
                          </option>
                        ))}
                      </select>
                      </span>
                    </label>
                    <label className="bible-language-field bible-language-secondary">
                      <span>{t('bible.secondary')}</span>
                      <span className="bible-select-with-flag">
                      {LOCALES.includes(secondaryTranslation.language) && <LocaleFlag locale={secondaryTranslation.language} size={18} />}
                      <select
                        value={secondaryId}
                        onChange={(event) => {
                          const nextId = validTranslationId(translations, event.target.value, secondaryId)
                          setSecondaryId(nextId)
                          updateSettings({ secondaryTranslationId: nextId })
                        }}
                      >
                        {translations.map((translation) => (
                          <option key={translation.id} value={translation.id}>
                            {translation.abbreviation} · {translation.name}
                          </option>
                        ))}
                      </select>
                      </span>
                    </label>
                  </div>
                )}
                <p className="bible-format-note">{t('bible.formatVerse')}</p>
                <div className="bible-option-foot">
                  {overflow && <span className="inline-warning">{t('bible.overflowNote')}</span>}
                  <span className="slide-count-note">
                    {slideCount === 1
                      ? t('bible.slideCountOne')
                      : t('bible.slideCount', { count: slideCount })}
                  </span>
                </div>
              </div>

              <div className="bible-add">
                <div className="bible-add-controls">
                  <label className="field compact">
                    <span>{t('add.destination')}</span>
                    <select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
                      {activeService?.sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.title}
                        </option>
                      ))}
                      {!activeService && <option value="">{t('add.noService')}</option>}
                    </select>
                  </label>
                  <button
                    className="btn btn-primary"
                    onClick={addToService}
                    disabled={!activeService}
                  >
                    <Plus size={15} />
                    {t('bible.addToService')}
                  </button>
                </div>
                {!activeService && (
                  <button className="text-link centered" onClick={() => navigate('/calendar')}>
                    {t('calendar.newService')}
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="empty-inline">
              <BookOpen size={28} />
              <p>{t('bible.previewEmpty')}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
