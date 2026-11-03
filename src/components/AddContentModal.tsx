import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  ChevronRight,
  Image as ImageIcon,
  LayoutTemplate,
  Megaphone,
  Mic2,
  Music4,
  Search,
  ShieldCheck,
  Square,
  Timer as TimerIcon,
} from 'lucide-react'
import type { ContentType } from '../types'
import { useT } from '../i18n/useT'
import { useAppStore } from '../store/useAppStore'
import { useToasts } from '../store/useToasts'
import { navigate } from '../hooks/useHashRoute'
import {
  createAnnouncementItem,
  createBlankItem,
  createSermonItem,
  createTimerItem,
} from '../utils/slides'
import { DEFAULT_TIMER_SECONDS } from '../utils/timer'
import { Modal } from './Modal'
import { TimerDurationField } from './timer/TimerDurationField'

type ChoiceId = ContentType | 'templates'

const CHOICES: {
  id: ChoiceId
  icon: typeof BookOpen
  labelKey: string
  noteKey: string
  library?: string
}[] = [
  { id: 'bible', icon: BookOpen, labelKey: 'add.bible', noteKey: 'add.bibleNote', library: '/bible' },
  { id: 'song', icon: Music4, labelKey: 'add.song', noteKey: 'add.songNote', library: '/songs' },
  { id: 'blank', icon: Square, labelKey: 'add.blank', noteKey: 'add.blankNote' },
  {
    id: 'announcement',
    icon: Megaphone,
    labelKey: 'add.announcement',
    noteKey: 'add.announcementNote',
  },
  { id: 'sermon', icon: Mic2, labelKey: 'add.sermon', noteKey: 'add.sermonNote' },
  { id: 'timer', icon: TimerIcon, labelKey: 'add.timer', noteKey: 'add.timerNote' },
  { id: 'media', icon: ImageIcon, labelKey: 'add.media', noteKey: 'add.mediaNote', library: '/media' },
  {
    id: 'templates',
    icon: LayoutTemplate,
    labelKey: 'add.templates',
    noteKey: 'add.templatesNote',
    library: '/templates',
  },
]

export function AddContentModal({
  open,
  onClose,
  serviceId,
  sectionId,
}: {
  open: boolean
  onClose: () => void
  serviceId: string
  sectionId: string
}) {
  const t = useT()
  const services = useAppStore((state) => state.services)
  const addItem = useAppStore((state) => state.addItem)
  const push = useToasts((state) => state.push)
  const service = services.find((entry) => entry.id === serviceId)
  const [focused, setFocused] = useState<ChoiceId>('bible')
  const [selected, setSelected] = useState<ContentType | null>(null)
  const [destination, setDestination] = useState(sectionId)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [query, setQuery] = useState('')
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_TIMER_SECONDS)
  const [timerValid, setTimerValid] = useState(true)

  const destinationSection = useMemo(
    () => service?.sections.find((section) => section.id === destination) ?? service?.sections[0],
    [destination, service],
  )

  const choices = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return CHOICES
    return CHOICES.filter((choice) =>
      `${t(choice.labelKey)} ${t(choice.noteKey)}`.toLowerCase().includes(needle),
    )
  }, [query, t])

  useEffect(() => {
    if (open && sectionId) setDestination(sectionId)
  }, [open, sectionId])

  useEffect(() => {
    if (!open) {
      setSelected(null)
      setTitle('')
      setBody('')
      setQuery('')
      setTimerSeconds(DEFAULT_TIMER_SECONDS)
      setTimerValid(true)
    }
  }, [open])

  if (!open || !service) return null

  const closeAndReset = () => {
    onClose()
    setSelected(null)
    setTitle('')
    setBody('')
    setQuery('')
  }

  const choice = CHOICES.find((entry) => entry.id === focused) ?? CHOICES[0]

  const openChoice = () => {
    if (choice.library) {
      closeAndReset()
      navigate(choice.library)
      return
    }
    if (choice.id === 'blank') {
      const item = createBlankItem(t('add.blank'))
      addItem(service.id, destinationSection?.id ?? service.sections[0]?.id ?? '', item)
      push(t('toast.contentAdded'), 'success')
      closeAndReset()
      return
    }
    if (choice.id === 'announcement' || choice.id === 'sermon' || choice.id === 'timer') setSelected(choice.id)
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!selected) return
    if (selected === 'timer') {
      if (!timerValid) return
      const item = createTimerItem(title.trim() || t('timer.defaultTitle'), timerSeconds)
      addItem(service.id, destinationSection?.id ?? service.sections[0]?.id ?? '', item)
      push(t('toast.contentAdded'), 'success')
      closeAndReset()
      return
    }
    const finalTitle = title.trim()
    if (!finalTitle) return
    const item =
      selected === 'announcement'
        ? createAnnouncementItem(finalTitle, body.trim())
        : createSermonItem(finalTitle, body.trim())
    addItem(service.id, destinationSection?.id ?? service.sections[0]?.id ?? '', item)
    push(t('toast.contentAdded'), 'success')
    closeAndReset()
  }

  return (
    <Modal
      title={t('add.title')}
      subtitle={t('add.subtitle')}
      onClose={closeAndReset}
      wide
      className="add-slide-modal"
    >
      {!selected ? (
        <div className="add-slide-layout">
          <aside className="add-slide-rail">
            <label className="search-field add-slide-search">
              <Search size={14} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('add.search')}
                autoFocus
              />
            </label>
            <span className="eyebrow">{t('add.chooseType')}</span>
            <div className="add-slide-types">
              {choices.map(({ id, icon: Icon, labelKey, noteKey, library }) => (
                <button
                  key={id}
                  className={`add-slide-type ${focused === id ? 'is-active' : ''}`}
                  onClick={() => {
                    setFocused(id)
                    setSelected(null)
                  }}
                >
                  <span className="add-slide-type-icon">
                    <Icon size={16} />
                  </span>
                  <span>
                    <strong>{t(labelKey)}</strong>
                    <small>{t(noteKey)}</small>
                  </span>
                  {library && <ChevronRight size={13} />}
                </button>
              ))}
              {!choices.length && <div className="empty-inline">{t('add.noResults')}</div>}
            </div>
          </aside>

          <div className="add-slide-detail">
            <div className="add-slide-detail-head">
              <span className="add-slide-detail-icon">
                <choice.icon size={22} />
              </span>
              <div>
                <h3>{t(choice.labelKey)}</h3>
                <p>{t(choice.noteKey)}</p>
              </div>
            </div>

            <div className="add-slide-preview">
              <span className="eyebrow">{t('add.preview')}</span>
              <div className={`add-slide-preview-canvas bg-${choice.id === 'media' ? 'aurora' : 'graphite'}`}>
                <span className="add-slide-preview-brand">{service.title}</span>
                <choice.icon size={30} />
                <strong>{t(choice.labelKey)}</strong>
                <span>{destinationSection?.title ?? t('add.selectSection')}</span>
              </div>
            </div>

            <label className="field">
              <span>{t('add.destination')}</span>
              <select value={destination} onChange={(event) => setDestination(event.target.value)}>
                {service.sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="choice-note">
              <ShieldCheck size={15} />
              <span>{t('add.choiceNote', { section: destinationSection?.title ?? '' })}</span>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={closeAndReset}>
                {t('common.cancel')}
              </button>
              <button className="btn btn-primary" onClick={openChoice}>
                {choice.library ? t('common.open') : choice.id === 'blank' ? t('add.create') : t('common.next')}
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form className="form-stack add-slide-form" onSubmit={submit}>
          <div className="add-slide-detail-head">
            <span className="add-slide-detail-icon">
              {selected === 'announcement' ? (
                <Megaphone size={22} />
              ) : selected === 'timer' ? (
                <TimerIcon size={22} />
              ) : (
                <Mic2 size={22} />
              )}
            </span>
            <div>
              <h3>{t(`add.${selected}`)}</h3>
              <p>{t(`add.${selected}Note`)}</p>
            </div>
          </div>
          <label className="field">
            <span>{t('common.title')}</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                selected === 'announcement'
                  ? t('add.announcementTitlePlaceholder')
                  : selected === 'timer'
                    ? t('timer.defaultTitle')
                    : t('add.sermonTitlePlaceholder')
              }
              autoFocus
            />
          </label>
          {selected === 'timer' ? (
            <TimerDurationField value={timerSeconds} onChange={setTimerSeconds} onValidityChange={setTimerValid} />
          ) : (
            <label className="field">
              <span>{t('add.enterBody')}</span>
              <textarea
                rows={6}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={
                  selected === 'announcement'
                    ? t('add.announcementBodyPlaceholder')
                    : t('add.sermonBodyPlaceholder')
                }
              />
            </label>
          )}
          <label className="field">
            <span>{t('add.destination')}</span>
            <select value={destination} onChange={(event) => setDestination(event.target.value)}>
              {service.sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          </label>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>
              {t('common.back')}
            </button>
            <button className="btn btn-primary" type="submit" disabled={selected === 'timer' && !timerValid}>
              {t('add.create')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
