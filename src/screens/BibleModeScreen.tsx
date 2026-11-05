import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Eraser, Languages, MonitorPlay, Radio } from 'lucide-react'
import type { BibleBookCatalogEntry, BibleVerse } from '../types'
import { useT } from '../i18n/useT'
import { useAppStore } from '../store/useAppStore'
import { useToasts } from '../store/useToasts'
import { navigate } from '../hooks/useHashRoute'
import { resolveBibleProvider } from '../providers/bible/BibleProviderRegistry'
import { bibleTranslationsWith } from '../providers/bible/customBibles'
import { getVersePassage } from '../providers/bible/LocalBibleProvider'
import { BIBLE_BOOKS, bookName } from '../data/bible'
import { BOOK_GROUPS, GROUP_TONES, OLD_TESTAMENT_COUNT, bookAbbreviation } from '../data/bibleModeBooks'
import { createBibleSlides } from '../utils/slides'
import { outputFormat } from '../utils/outputFormats'
import { flatSlides } from '../store/serviceUtils'
import { SlideRenderer } from '../components/SlideRenderer'
import { SCREEN_META } from '../components/ScreenIcon'
import { LiveControlBar } from '../components/editor/LiveControlBar'

interface Pick {
  bookIndex: number
  chapter: number | null
  verse: number | null
}

const keyOf = (bookId: string, chapter: number, verse: number) => `${bookId}:${chapter}:${verse}`

/**
 * Bible Mode: book → chapter → verse in three taps, and the verse goes
 * straight to the audience screen while a service is live. The verse is
 * projected on its own (not added to the service); moving to a service
 * slide again takes it off.
 */
export function BibleModeScreen() {
  const t = useT()
  const locale = useAppStore((state) => state.settings.locale)
  const settings = useAppStore((state) => state.settings)
  const branding = useAppStore((state) => state.branding)
  const live = useAppStore((state) => state.live)
  const services = useAppStore((state) => state.services)
  const activeServiceId = useAppStore((state) => state.activeServiceId)
  const startLive = useAppStore((state) => state.startLive)
  const showScriptureLive = useAppStore((state) => state.showScriptureLive)
  const clearScriptureLive = useAppStore((state) => state.clearScriptureLive)
  const recordRecentPassage = useAppStore((state) => state.recordRecentPassage)
  const customBibles = useAppStore((state) => state.customBibles)
  const hiddenBibleIds = useAppStore((state) => state.hiddenBibleIds)
  const archivedBibleIds = useAppStore((state) => state.archivedBibleIds)
  const deletedBibleIds = useAppStore((state) => state.deletedBibleIds)
  const push = useToasts((state) => state.push)

  const translations = useMemo(
    () => bibleTranslationsWith(customBibles, { hidden: hiddenBibleIds, archived: archivedBibleIds, deleted: deletedBibleIds }),
    [customBibles, hiddenBibleIds, archivedBibleIds, deletedBibleIds],
  )
  const valid = (id: string) => (translations.some((entry) => entry.id === id) ? id : translations[0]?.id ?? id)
  const [translationId, setTranslationId] = useState(() => valid(settings.defaultTranslationId))
  const [secondaryId, setSecondaryId] = useState(() => valid(settings.secondaryTranslationId))
  const [bilingual, setBilingual] = useState(false)
  const [catalog, setCatalog] = useState<BibleBookCatalogEntry[]>([])
  const [verses, setVerses] = useState<BibleVerse[]>([])
  const [pick, setPick] = useState<Pick>({ bookIndex: 42, chapter: null, verse: null })
  const [projectedKey, setProjectedKey] = useState<string | null>(null)
  const verseListRef = useRef<HTMLOListElement>(null)

  const translation = translations.find((entry) => entry.id === translationId)
  const book = BIBLE_BOOKS[pick.bookIndex]
  const chapters = useMemo(() => catalog.find((entry) => entry.id === book?.id)?.chapters ?? [], [catalog, book?.id])
  const aspect = outputFormat(settings.outputFormat).aspect
  const liveService = live ? services.find((service) => service.id === live.serviceId) : null
  const startService = liveService ?? services.find((service) => service.id === activeServiceId) ?? null

  // Books present in this translation, and their chapters.
  useEffect(() => {
    let alive = true
    void resolveBibleProvider(translationId)
      .getBookCatalog(translationId, locale)
      .then((entries) => alive && setCatalog(entries))
      .catch(() => alive && setCatalog([]))
    return () => {
      alive = false
    }
  }, [translationId, locale])

  // Verse texts of the chosen chapter.
  useEffect(() => {
    if (!book || pick.chapter === null) {
      setVerses([])
      return
    }
    let alive = true
    void resolveBibleProvider(translationId)
      .getChapter(translationId, book.id, pick.chapter)
      .then((entries) => alive && setVerses(entries))
      .catch(() => alive && setVerses([]))
    return () => {
      alive = false
    }
  }, [translationId, book, pick.chapter])

  // Nothing of ours on screen once the operator moves back to the service.
  useEffect(() => {
    if (!live?.scripture) setProjectedKey(null)
  }, [live?.scripture])

  const slideFor = useCallback(
    (verse: number) => {
      if (!book || pick.chapter === null) return null
      const primary = getVersePassage(translationId, book.id, pick.chapter, verse)
      if (!primary) return null
      const secondary =
        bilingual && secondaryId !== translationId ? getVersePassage(secondaryId, book.id, pick.chapter, verse) ?? undefined : undefined
      return { slide: createBibleSlides({ primary, secondary, bilingual: Boolean(secondary) })[0], primary }
    },
    [book, pick.chapter, translationId, secondaryId, bilingual],
  )

  const preview = useMemo(() => (pick.verse !== null ? slideFor(pick.verse)?.slide ?? null : null), [pick.verse, slideFor])

  const project = (verse: number) => {
    const built = slideFor(verse)
    if (!built || !book || pick.chapter === null) return
    setPick((current) => ({ ...current, verse }))
    // Not live: the verse is only previewed; "Present verse" starts the service with it.
    if (!useAppStore.getState().live) return
    if (showScriptureLive(built.slide)) {
      setProjectedKey(keyOf(book.id, pick.chapter, verse))
      recordRecentPassage({ reference: built.primary.reference, translationId })
    }
  }

  const goLiveWithVerse = () => {
    if (!startService || flatSlides(startService).length === 0) {
      push(t('biblemode.noService'), 'error')
      return
    }
    if (!live && !startLive(startService.id, flatSlides(startService)[0].slide.id)) {
      push(t('biblemode.noService'), 'error')
      return
    }
    if (pick.verse !== null) project(pick.verse)
  }

  const chooseBook = (index: number) => {
    const entry = catalog.find((item) => item.id === BIBLE_BOOKS[index].id)
    // A one-chapter book (Obadiah, Jude…) goes straight to its verses.
    setPick({ bookIndex: index, chapter: entry && entry.chapters.length === 1 ? entry.chapters[0].number : null, verse: null })
  }

  // Keyboard: ← → previous / next verse (projected when live), Enter projects, Esc clears.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return
      if (verses.length === 0) return
      const numbers = verses.map((verse) => verse.verse)
      const at = pick.verse === null ? -1 : numbers.indexOf(pick.verse)
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        const next = numbers[event.key === 'ArrowRight' ? Math.min(numbers.length - 1, at + 1) : Math.max(0, at - 1)]
        if (next === undefined) return
        event.preventDefault()
        if (live) project(next)
        else setPick((current) => ({ ...current, verse: next }))
      } else if (event.key === 'Enter' && pick.verse !== null) {
        event.preventDefault()
        project(pick.verse)
      } else if (event.key === 'Escape' && live?.scripture) {
        event.preventDefault()
        clearScriptureLive()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Keep the chosen verse visible in the text list.
  useEffect(() => {
    if (pick.verse === null) return
    verseListRef.current?.querySelector(`[data-verse="${pick.verse}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [pick.verse])

  // Previous / Next in the live controls step through the verses of the chapter.
  const verseNumbers = verses.map((verse) => verse.verse)
  const verseAt = pick.verse === null ? -1 : verseNumbers.indexOf(pick.verse)
  const stepVerse = (direction: -1 | 1) => {
    const next = verseNumbers[verseAt < 0 ? 0 : verseAt + direction]
    if (next !== undefined) project(next)
  }

  const available = new Set(catalog.map((entry) => entry.id))
  const bookLabel = book ? bookName(book.id, translation?.language ?? locale) : ''
  const reference =
    pick.chapter !== null ? `${bookLabel} ${pick.chapter}${pick.verse !== null ? `:${pick.verse}` : ''}` : bookLabel
  const onScreen = (verse: number) => Boolean(book && pick.chapter !== null && projectedKey === keyOf(book.id, pick.chapter, verse))

  const bookTile = (index: number) => {
    const entry = BIBLE_BOOKS[index]
    const name = bookName(entry.id, locale)
    const has = available.has(entry.id)
    return (
      <button
        key={entry.id}
        type="button"
        className={`bm-book ${pick.bookIndex === index ? 'is-active' : ''}`}
        data-tone={GROUP_TONES[BOOK_GROUPS[index]]}
        disabled={!has}
        onClick={() => chooseBook(index)}
        aria-pressed={pick.bookIndex === index}
        aria-label={name}
        title={has ? name : `${name} · ${t('biblemode.notInTranslation')}`}
      >
        <strong>{bookAbbreviation(index, locale)}</strong>
        <small>{name}</small>
      </button>
    )
  }

  return (
    <div className="screen bible-mode-screen" data-tone={SCREEN_META.bible.tone}>
      <header className="bm-bar">
        <div className="bm-title">
          <h1>{t('nav.biblemode')}</h1>
          <span className={`bm-live ${live ? 'is-live' : ''}`}>
            <span className="live-dot" aria-hidden="true" />
            {live ? t('status.live') : t('biblemode.offAir')}
          </span>
        </div>
        <div className="bm-controls">
          <label className="bm-select">
            <span className="sr-only">{t('biblemode.translation')}</span>
            <select value={translationId} onChange={(event) => setTranslationId(event.target.value)} aria-label={t('biblemode.translation')}>
              {translations.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.abbreviation} · {entry.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`btn btn-secondary btn-sm ${bilingual ? 'is-on' : ''}`}
            aria-pressed={bilingual}
            onClick={() => setBilingual((value) => !value)}
          >
            <Languages size={14} />
            {t('biblemode.bilingual')}
          </button>
          {bilingual && (
            <label className="bm-select">
              <span className="sr-only">{t('biblemode.secondary')}</span>
              <select value={secondaryId} onChange={(event) => setSecondaryId(event.target.value)} aria-label={t('biblemode.secondary')}>
                {translations.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.abbreviation} · {entry.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {live && (
            <>
              <button type="button" className="btn btn-ghost btn-sm" disabled={!live.scripture} onClick={clearScriptureLive}>
                <Eraser size={14} />
                {t('biblemode.clear')}
              </button>
            </>
          )}
          {startService && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(`/service/${startService.id}`)}>
              <ArrowLeft size={14} />
              {t('biblemode.backToService')}
            </button>
          )}
        </div>
      </header>

      <div className="bm-layout">
        <section className="bm-panel bm-books" aria-label={t('biblemode.books')}>
          <h2>{t('biblemode.oldTestament')}</h2>
          <div className="bm-book-grid">{BIBLE_BOOKS.slice(0, OLD_TESTAMENT_COUNT).map((_, index) => bookTile(index))}</div>
          <h2>{t('biblemode.newTestament')}</h2>
          <div className="bm-book-grid">
            {BIBLE_BOOKS.slice(OLD_TESTAMENT_COUNT).map((_, index) => bookTile(index + OLD_TESTAMENT_COUNT))}
          </div>
        </section>

        <section className="bm-panel bm-numbers" aria-label={t('biblemode.chapter')}>
          <h2>
            {bookLabel} <small>{t('biblemode.chapter')}</small>
          </h2>
          {chapters.length === 0 ? (
            <p className="bm-hint">{t('biblemode.notInTranslation')}</p>
          ) : (
            <div className="bm-number-grid">
              {chapters.map((entry) => (
                <button
                  key={entry.number}
                  type="button"
                  className={`bm-number ${pick.chapter === entry.number ? 'is-active' : ''}`}
                  aria-pressed={pick.chapter === entry.number}
                  onClick={() => setPick((current) => ({ ...current, chapter: entry.number, verse: null }))}
                >
                  {entry.number}
                </button>
              ))}
            </div>
          )}
          {pick.chapter !== null && verses.length > 0 && (
            <>
              <h2>
                {bookLabel} {pick.chapter} <small>{t('biblemode.verse')}</small>
              </h2>
              <div className="bm-number-grid bm-verse-grid">
                {verses.map((verse) => (
                  <button
                    key={verse.verse}
                    type="button"
                    className={`bm-number ${pick.verse === verse.verse ? 'is-active' : ''} ${onScreen(verse.verse) ? 'is-on-screen' : ''}`}
                    aria-pressed={pick.verse === verse.verse}
                    aria-label={`${t('biblemode.verse')} ${verse.verse}${onScreen(verse.verse) ? ` · ${t('biblemode.onScreen')}` : ''}`}
                    onClick={() => project(verse.verse)}
                  >
                    {verse.verse}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="bm-panel bm-reading" aria-label={reference}>
          <div className="bm-preview">
            <div className={`bm-preview-frame ${projectedKey && pick.verse !== null && onScreen(pick.verse) ? 'is-on-screen' : ''}`}>
              {preview ? (
                <SlideRenderer slide={preview} branding={branding} aspectRatio={aspect} compact />
              ) : (
                <div className="bm-preview-empty">{t(pick.chapter === null ? 'biblemode.pickChapter' : 'biblemode.pickVerse')}</div>
              )}
              {pick.verse !== null && onScreen(pick.verse) && (
                <span className="bm-on-screen">
                  <Radio size={12} />
                  {t('biblemode.onScreen')}
                </span>
              )}
            </div>
            <div className="bm-preview-actions">
              <strong className="bm-reference">{reference || t('biblemode.pickBook')}</strong>
              {live ? (
                <button
                  type="button"
                  className="btn btn-present btn-sm"
                  disabled={pick.verse === null}
                  onClick={() => pick.verse !== null && project(pick.verse)}
                >
                  <MonitorPlay size={14} />
                  {t('biblemode.project')}
                </button>
              ) : (
                <button type="button" className="btn btn-present btn-sm" disabled={pick.verse === null || !startService} onClick={goLiveWithVerse}>
                  <MonitorPlay size={14} />
                  {t('biblemode.presentVerse')}
                </button>
              )}
            </div>
            <p className="bm-hint">{t(live ? 'biblemode.keys' : 'biblemode.notLive')}</p>
            {live && (
              <div className="bm-live-controls">
                <LiveControlBar
                  showJump={false}
                  navigation={{
                    onPrevious: () => stepVerse(-1),
                    onNext: () => stepVerse(1),
                    previousDisabled: verseNumbers.length === 0 || verseAt <= 0,
                    nextDisabled: verseNumbers.length === 0 || verseAt >= verseNumbers.length - 1,
                  }}
                />
              </div>
            )}
          </div>
          {verses.length > 0 && (
            <ol className="bm-verses" ref={verseListRef}>
              {verses.map((verse) => (
                <li key={verse.verse} data-verse={verse.verse}>
                  <button
                    type="button"
                    className={`bm-verse ${pick.verse === verse.verse ? 'is-active' : ''} ${onScreen(verse.verse) ? 'is-on-screen' : ''}`}
                    onClick={() => project(verse.verse)}
                  >
                    <span className="bm-verse-number">{verse.verse}</span>
                    <span className="bm-verse-text">{verse.text}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}
