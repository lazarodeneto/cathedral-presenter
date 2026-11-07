import { showOutputConnection } from '../components/OutputConnectionDialog'
import { BibleReference } from '../components/BibleReference'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BookOpen, Eraser, Languages, MonitorPlay, Radio, ScrollText } from 'lucide-react'
import type { BibleBookCatalogEntry, BibleVerse } from '../types'
import { LOCALES } from '../types'
import { useT } from '../i18n/useT'
import { useAppStore } from '../store/useAppStore'
import { useToasts } from '../store/useToasts'
import { navigate } from '../hooks/useHashRoute'
import { resolveBibleProvider } from '../providers/bible/BibleProviderRegistry'
import { bibleTranslationsWith } from '../providers/bible/customBibles'
import { getVersePassage, parseLocalReference } from '../providers/bible/LocalBibleProvider'
import { BIBLE_BOOKS, bookName } from '../data/bible'
import { BOOK_GROUPS, GROUP_TONES, OLD_TESTAMENT_COUNT, bookAbbreviation } from '../data/bibleModeBooks'
import { createBibleSlides } from '../utils/slides'
import { outputFormat } from '../utils/outputFormats'
import { flatSlides } from '../store/serviceUtils'
import { SlideRenderer } from '../components/SlideRenderer'
import { SCREEN_META } from '../components/ScreenIcon'
import { LiveControlBar } from '../components/editor/LiveControlBar'
import { SortSelect } from '../components/SortSelect'
import { LocaleFlag } from '../components/LocaleFlag'
import { webOutputProvider } from '../providers/output/WebOutputProvider'
import { useAudienceConnection } from '../hooks/useAudienceConnection'

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
  const visibleScripture = !live || live.blank ? null : live.frozen ? live.frozenScripture : live.scripture
  const audienceConfirmed = useAudienceConnection(visibleScripture?.id)
  const [connecting, setConnecting] = useState(false)
  const connectingRef = useRef(false)
  const liveReference = visibleScripture?.bible?.primary?.reference ?? visibleScripture?.reference
  const livePassage = liveReference ? parseLocalReference(liveReference) : null
  const projectedKey = livePassage?.startVerse != null ? keyOf(livePassage.bookId, livePassage.chapter, livePassage.startVerse) : null
  const [translationId, setTranslationId] = useState(() => valid(visibleScripture?.bible?.primary?.translationId ?? settings.defaultTranslationId))
  const [secondaryId, setSecondaryId] = useState(() => valid(settings.secondaryTranslationId))
  const [bilingual, setBilingual] = useState(false)
  const [catalog, setCatalog] = useState<BibleBookCatalogEntry[]>([])
  const [verses, setVerses] = useState<BibleVerse[]>([])
  const [pick, setPick] = useState<Pick>(() => {
    const index = livePassage ? BIBLE_BOOKS.findIndex((entry) => entry.id === livePassage.bookId) : -1
    return index >= 0 && livePassage ? { bookIndex: index, chapter: livePassage.chapter, verse: livePassage.startVerse } : { bookIndex: 42, chapter: null, verse: null }
  })
  const verseListRef = useRef<HTMLOListElement>(null)
  const chapterHeadingRef = useRef<HTMLHeadingElement>(null)
  const verseHeadingRef = useRef<HTMLHeadingElement>(null)
  const pendingVerseFocusRef = useRef(false)

  const translation = translations.find((entry) => entry.id === translationId)
  const secondaryTranslation = translations.find((entry) => entry.id === secondaryId)
  const book = BIBLE_BOOKS[pick.bookIndex]
  const chapters = useMemo(() => catalog.find((entry) => entry.id === book?.id)?.chapters ?? [], [catalog, book?.id])
  const aspect = outputFormat(settings.outputFormat).aspect
  const liveService = live ? services.find((service) => service.id === live.serviceId) : null
  const startService = liveService ?? services.find((service) => service.id === activeServiceId) ?? null
  const returnId = window.location.hash.split('/')[2]
  const returnService = services.find((service) => service.id === returnId) ?? startService

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
      .then((entries) => { if (alive) { const shouldFocus = pendingVerseFocusRef.current; pendingVerseFocusRef.current = false; setVerses(entries); if (shouldFocus && entries.length) requestAnimationFrame(() => { verseHeadingRef.current?.scrollIntoView({ block: 'start', inline: 'nearest' }); verseHeadingRef.current?.focus({ preventScroll: true }) }) } })
      .catch(() => alive && setVerses([]))
    return () => {
      alive = false
    }
  }, [translationId, book, pick.chapter])

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

  const project = (verse: number, explicitlyPresent = false) => {
    const built = slideFor(verse)
    if (!built || !book || pick.chapter === null) return
    setPick((current) => ({ ...current, verse }))
    // After clearing, selection stays in preview until explicitly presented.
    const currentLive = useAppStore.getState().live
    if (!currentLive || (!currentLive.scripture && !explicitlyPresent)) return
    if (showScriptureLive(built.slide)) {
      recordRecentPassage({ reference: built.primary.reference, translationId })
    }
  }

  const goLiveWithVerse = async (verse: number | null = pick.verse) => {
    if (connectingRef.current || verse === null || !slideFor(verse)) return
    if (!startService || flatSlides(startService).length === 0) {
      push(t('biblemode.noService'), 'error')
      return
    }
    connectingRef.current = true
    setConnecting(true)
    try {
      const result = await webOutputProvider.prepareAudience()
      if (result !== 'ready') {
        showOutputConnection(result)
        return
      }
      if (!useAppStore.getState().live && !startLive(startService.id, flatSlides(startService)[0].slide.id)) {
        push(t('biblemode.noService'), 'error')
        return
      }
      project(verse, true)
    } finally {
      connectingRef.current = false
      setConnecting(false)
    }
  }

  const chooseBook = (index: number) => {
    const entry = catalog.find((item) => item.id === BIBLE_BOOKS[index].id)
    if (index === pick.bookIndex && entry?.chapters.length === 1 && pick.chapter === entry.chapters[0].number && verses.length) {
      verseHeadingRef.current?.scrollIntoView({ block: 'start', inline: 'nearest' })
      verseHeadingRef.current?.focus({ preventScroll: true })
      return
    }
    // A one-chapter book (Obadiah, Jude…) goes straight to its verses.
    setVerses([])
    pendingVerseFocusRef.current = Boolean(entry && entry.chapters.length === 1)
    setPick({ bookIndex: index, chapter: entry && entry.chapters.length === 1 ? entry.chapters[0].number : null, verse: null })
    if (!entry || entry.chapters.length !== 1) requestAnimationFrame(() => { chapterHeadingRef.current?.scrollIntoView({ block: 'start', inline: 'nearest' }); chapterHeadingRef.current?.focus({ preventScroll: true }) })
  }

  // Keyboard: ← → previous / next verse (projected when live), Enter projects, Esc clears.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('button, input, select, textarea, a[href], [contenteditable]:not([contenteditable="false"]), [role="button"], [role="menu"], [role="listbox"], [role="dialog"]')) return
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
        void goLiveWithVerse(pick.verse)
      } else if (event.key === 'Escape' && live?.scripture) {
        event.preventDefault()
        clearScriptureLive()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Give the first and last verses enough scroll space to reach the center too.
  useEffect(() => {
    const list = verseListRef.current
    if (!list) return
    const item = pick.verse === null ? null : list.querySelector<HTMLElement>(`[data-verse="${pick.verse}"]`)
    const isLiveVerse = Boolean(item && visibleScripture && book && pick.chapter !== null && pick.verse !== null && projectedKey === keyOf(book.id, pick.chapter, pick.verse))
    if (!item || !isLiveVerse) {
      list.style.paddingTop = ''
      list.style.paddingBottom = ''
      if (item) item.scrollIntoView({ block: 'nearest' })
      return
    }
    const center = () => {
      const inset = Math.max(0, (list.clientHeight - item.offsetHeight) / 2)
      list.style.paddingTop = `${inset}px`
      list.style.paddingBottom = `${inset}px`
      const listRect = list.getBoundingClientRect()
      const itemRect = item.getBoundingClientRect()
      list.scrollTop += itemRect.top - listRect.top - (list.clientHeight - itemRect.height) / 2
    }
    center()
    const observer = new ResizeObserver(center)
    observer.observe(list)
    observer.observe(item)
    return () => observer.disconnect()
  }, [pick.verse, pick.chapter, book, projectedKey, visibleScripture, verses])

  // A scrolled verse must never leave a fragment of its last line under the reference.
  useEffect(() => {
    const list = verseListRef.current
    if (!list) return
    const clip = () => {
      const top = list.getBoundingClientRect().top
      for (const item of list.querySelectorAll<HTMLElement>('li')) {
        const rect = item.getBoundingClientRect()
        item.style.visibility = rect.top < top - 1 && rect.bottom > top ? 'hidden' : ''
      }
    }
    const frame = requestAnimationFrame(clip)
    list.addEventListener('scroll', clip, { passive: true })
    const observer = new ResizeObserver(clip)
    observer.observe(list)
    return () => { cancelAnimationFrame(frame); observer.disconnect(); list.removeEventListener('scroll', clip) }
  }, [verses])

  // Previous / Next in the live controls step through the verses of the chapter.
  const verseNumbers = verses.map((verse) => verse.verse)
  const verseAt = pick.verse === null ? -1 : verseNumbers.indexOf(pick.verse)
  const stepVerse = (direction: -1 | 1) => {
    const next = verseNumbers[verseAt < 0 ? 0 : verseAt + direction]
    if (next !== undefined) project(next)
  }

  const available = new Set(catalog.map((entry) => entry.id))
  const bookLabel = book ? bookName(book.id, locale) : ''
  const reference =
    pick.chapter !== null ? `${bookLabel} ${pick.chapter}${pick.verse !== null ? `:${pick.verse}` : ''}` : bookLabel
  const shownPassage = visibleScripture && livePassage ? livePassage : null
  const shownBook = shownPassage ? bookName(shownPassage.bookId, locale) : bookLabel
  const shownChapter = shownPassage ? shownPassage.chapter : pick.chapter
  const shownVerse = shownPassage ? shownPassage.startVerse : pick.verse
  const onScreen = (verse: number) => Boolean(audienceConfirmed && book && pick.chapter !== null && projectedKey === keyOf(book.id, pick.chapter, verse))
  const [liveBook, liveChapter] = (audienceConfirmed ? projectedKey ?? '' : '').split(':')

  const bookTile = (index: number) => {
    const entry = BIBLE_BOOKS[index]
    const name = bookName(entry.id, locale)
    const has = available.has(entry.id)
    return (
      <button
        key={entry.id}
        type="button"
        className={`bm-book ${/^\d/.test(entry.id) ? 'is-numbered' : ''} ${pick.bookIndex === index ? 'is-active' : ''} ${entry.id === liveBook ? 'is-on-screen' : ''}`}
        data-tone={GROUP_TONES[BOOK_GROUPS[index]]}
        disabled={!has}
        onClick={() => chooseBook(index)}
        aria-pressed={pick.bookIndex === index}
        aria-label={name}
        title={has ? `${name}${entry.id === liveBook ? ` · ${t('biblemode.onScreen')}` : ''}` : `${name} · ${t('biblemode.notInTranslation')}`}
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
          <h1 className="sr-only">{t('nav.biblemode')}</h1>
          {returnService && !live && (
            <button type="button" className="btn btn-secondary btn-sm bm-back-service" onClick={() => navigate(`/service/${returnService.id}`)}>
              <ArrowLeft size={14} />
              {t('biblemode.backToService')}
            </button>
          )}
        </div>
        <div className="bm-controls">
          <div className="bm-translation-select"><SortSelect value={translationId} label={t('biblemode.translation')} onChange={setTranslationId} selectedLabel={bilingual ? translation?.abbreviation : undefined} leading={translation && LOCALES.includes(translation.language) ? <LocaleFlag locale={translation.language} size={16} /> : undefined}
            options={translations.map((entry) => ({ value: entry.id, label: `${entry.abbreviation} · ${entry.name}`, icon: <LocaleFlag locale={entry.language} size={16} /> }))} /></div>
          <div className="bm-language-mode" role="group" aria-label={t('biblemode.translation')}>
            <button type="button" className={!bilingual ? 'is-on' : ''} aria-label={t('biblemode.oneLanguage')} title={t('biblemode.oneLanguage')} aria-pressed={!bilingual} onClick={() => setBilingual(false)}>
              <strong aria-hidden="true">1</strong> {t('biblemode.languageUnit')}
            </button>
            <button type="button" className={bilingual ? 'is-on' : ''} aria-label={t('biblemode.bilingual')} title={t('biblemode.bilingual')} aria-pressed={bilingual} onClick={() => setBilingual(true)}>
              <Languages size={14} aria-hidden="true" /> <strong aria-hidden="true">2</strong> {t('biblemode.languagesUnit')}
            </button>
          </div>
          {bilingual && (
            <div className="bm-translation-select"><SortSelect value={secondaryId} label={t('biblemode.secondary')} onChange={setSecondaryId} selectedLabel={secondaryTranslation?.abbreviation} leading={secondaryTranslation && LOCALES.includes(secondaryTranslation.language) ? <LocaleFlag locale={secondaryTranslation.language} size={16} /> : undefined}
              options={translations.map((entry) => ({ value: entry.id, label: `${entry.abbreviation} · ${entry.name}`, icon: <LocaleFlag locale={entry.language} size={16} /> }))} /></div>
          )}
        </div>
      </header>

      <div className="bm-layout">
        <section className="bm-panel bm-books" aria-label={t('biblemode.books')}>
          <h2><ScrollText size={15} aria-hidden="true" />{t('biblemode.oldTestament')}</h2>
          <div className="bm-book-grid bm-old-testament">{BIBLE_BOOKS.slice(0, OLD_TESTAMENT_COUNT).map((_, index) => bookTile(index))}</div>
          <h2><BookOpen size={15} aria-hidden="true" />{t('biblemode.newTestament')}</h2>
          <div className="bm-book-grid bm-new-testament">
            {BIBLE_BOOKS.slice(OLD_TESTAMENT_COUNT).map((_, index) => bookTile(index + OLD_TESTAMENT_COUNT))}
          </div>
        </section>

        <section className="bm-panel bm-numbers" aria-label={t('biblemode.chapter')}>
          <h2 ref={chapterHeadingRef} tabIndex={-1}>
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
                  className={`bm-number ${pick.chapter === entry.number ? 'is-active' : ''} ${book?.id === liveBook && String(entry.number) === liveChapter ? 'is-on-screen' : ''}`}
                  aria-label={`${t('biblemode.chapter')} ${entry.number}${book?.id === liveBook && String(entry.number) === liveChapter ? ` · ${t('biblemode.onScreen')}` : ''}`}
                  aria-pressed={pick.chapter === entry.number}
                  onClick={() => {
                    if (pick.chapter === entry.number && verses.length) {
                      verseHeadingRef.current?.scrollIntoView({ block: 'start', inline: 'nearest' })
                      verseHeadingRef.current?.focus({ preventScroll: true })
                    } else {
                      setVerses([])
                      pendingVerseFocusRef.current = true
                      setPick((current) => ({ ...current, chapter: entry.number, verse: null }))
                    }
                  }}
                >
                  {entry.number}
                </button>
              ))}
            </div>
          )}
          {pick.chapter !== null && verses.length > 0 && (
            <>
              <h2 ref={verseHeadingRef} tabIndex={-1} className="bm-verse-heading">
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
                    onDoubleClick={() => goLiveWithVerse(verse.verse)}
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
            <div className={`bm-preview-frame ${visibleScripture && audienceConfirmed ? 'is-on-screen' : ''}`}>
              {live?.modeTransitionPending ? <div className="bm-preview-empty bm-preview-black" role="img" aria-label={t('output.blank')} /> : visibleScripture || preview ? (
                <SlideRenderer
                  slide={visibleScripture ?? preview}
                  branding={branding}
                  aspectRatio={aspect}
                  compact
                  message={live?.message}
                  messageVisible={Boolean(visibleScripture && live?.messageVisible && live.message)}
                />
              ) : (
                <div className="bm-preview-empty" role="img" aria-label={t(pick.chapter === null ? 'biblemode.pickChapter' : 'biblemode.pickVerse')} />
              )}
              {visibleScripture && audienceConfirmed && (
                <span className="bm-on-screen">
                  <Radio size={12} />
                  {t('biblemode.onScreen')}
                </span>
              )}
            </div>
            <div className="bm-preview-actions">
              <BibleReference
                book={shownBook ? shownBook.toLocaleUpperCase(locale) : t('biblemode.pickBook')}
                chapter={shownChapter} verse={shownVerse} verseLabel={t('biblemode.verseShort')}
              />
              {live?.scripture && audienceConfirmed && (
                <button type="button" className="btn btn-ghost btn-sm bm-clear-verse" title={t('biblemode.clear')} aria-label={t('biblemode.clear')} onClick={clearScriptureLive}>
                  <Eraser size={14} aria-hidden="true" />
                  <span className="bm-action-label">{t('biblemode.clear')}</span>
                </button>
              )}
              {(!live || !live.scripture || !audienceConfirmed) && (
                <button type="button" className="btn btn-present btn-sm" title={t(connecting ? 'presentation.connecting' : 'biblemode.presentVerse')} aria-label={t(connecting ? 'presentation.connecting' : 'biblemode.presentVerse')} disabled={connecting || pick.verse === null || !startService} aria-busy={connecting} onClick={() => void goLiveWithVerse()}>
                  <MonitorPlay size={14} />
                  <span className="bm-action-label">{t(connecting ? 'presentation.connecting' : 'biblemode.presentVerse')}</span>
                </button>
              )}
            </div>
          </div>
          {verses.length > 0 && (
            <ol className="bm-verses" ref={verseListRef}>
              {verses.map((verse) => (
                <li key={verse.verse} data-verse={verse.verse}>
                  <button
                    type="button"
                    className={`bm-verse ${pick.verse === verse.verse ? 'is-active' : ''} ${onScreen(verse.verse) ? 'is-on-screen' : ''}`}
                    onClick={() => project(verse.verse)}
                    onDoubleClick={() => goLiveWithVerse(verse.verse)}
                  >
                    <span className="bm-verse-number">{verse.verse}</span>
                    <span className="bm-verse-text">{verse.text}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
          {live && (
            <div className="bm-live-controls">
              <LiveControlBar
                showJump={false}
                onBackToService={returnService ? () => navigate(`/service/${returnService.id}`) : undefined}
                navigation={{
                  onPrevious: () => stepVerse(-1),
                  onNext: () => stepVerse(1),
                  previousDisabled: verseNumbers.length === 0 || verseAt <= 0,
                  nextDisabled: verseNumbers.length === 0 || verseAt >= verseNumbers.length - 1,
                }}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
