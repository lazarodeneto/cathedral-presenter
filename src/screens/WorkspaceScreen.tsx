import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useResizablePane } from '../hooks/useResizablePane'
import {
  AlignCenter,
  CalendarDays,
  CaseSensitive,
  ALargeSmall,
  Bold,
  Shapes,
  Droplet,
  Crop,
  BookOpenText,
  Heading,
  Palette,
  Move,
  Paintbrush,
  MousePointer2,
  FileText,
  Clapperboard,
  StickyNote,
  SquareRoundCorner,
  RectangleHorizontal,

  Blend,
  MoveRight,
  Scissors,
  SlidersHorizontal,
  ZoomIn,
  AlignLeft,
  AlignRight,
  ArrowDown,
  Archive,
  ArrowLeft,
  Pencil,
  ArrowUp,
  BookOpen,
  Check,
  Clipboard,
  ClipboardPaste,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Copy,
  Film,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Menu,
  Megaphone,
  Mic2,
  Monitor,
  PanelRight,
  Music4,
  Plus,
  QrCode,
  Snowflake,
  Square,
  Trash2,
  Type,
  Video,
  X,
  ImagePlus,
  Timer as TimerIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ContentType, ElementType, Slide, SlideElement, SlideTransition } from '../types'
import { BACKGROUND_PRESETS } from '../data/templates'
import { useAppStore } from '../store/useAppStore'
import { useToasts } from '../store/useToasts'
import { useT } from '../i18n/useT'
import { navigate } from '../hooks/useHashRoute'
import { flatSlides, serviceSectionForItem } from '../store/serviceUtils'
import { formatTime, formatToolbarDate } from '../utils/dates'
import { createTemplateItem, isLikelyOverflow, makeElement, makeTextElement, SLIDE_TEXT_DEFAULTS, slideLabel } from '../utils/slides'
import { sanitizeEditableText, sanitizeText } from '../security/text'
import { webOutputProvider } from '../providers/output/WebOutputProvider'
import { SlideRenderer } from '../components/SlideRenderer'
import { AddContentModal } from '../components/AddContentModal'
import { ConfirmDialog, Modal } from '../components/Modal'
import { InspectorGroup, InspectorGroupList } from '../components/editor/InspectorGroup'
import { TextPositionGrid } from '../components/editor/TextPositionGrid'
import { ASPECT_RATIO, outputFormat, resolutionLabel } from '../utils/outputFormats'
import { OutputFormatPicker } from '../components/OutputFormatPicker'
import { CanvasGuidesRail, EditorToolbar, ElementActionRail, RailTooltip } from '../components/editor/EditorToolbar'
import { EditorMediaDialog, mediaError, type MediaDialogMode } from '../components/editor/EditorMediaDialog'
import { EditorBackgroundDialog } from '../components/editor/EditorBackgroundDialog'
import { LOGO_ERROR_KEYS, processLogoFile } from '../utils/logo'
import { TemplatePickerDialog } from '../components/editor/TemplatePickerDialog'
import { LogoPlacementDialog, type LogoCorner, type LogoShape } from '../components/editor/LogoPlacementDialog'
import { QrComposer } from '../components/editor/QrComposer'
import { LayersPanel } from '../components/editor/LayersPanel'
import { TimerControls } from '../components/timer/TimerControls'
import { MessageBoxInspector } from '../components/editor/MessageBoxInspector'
import { makeMessageElement } from '../utils/messageBox'
import { DEFAULT_TRANSITION, TRANSITION_TYPES, itemOrigin, presentationProblem } from '../utils/culto'
import { CultoFormDialog } from '../components/culto/CultoFormDialog'
import { StatusChip } from '../components/culto/StatusChip'
import { LiveControlBar } from '../components/editor/LiveControlBar'
import { useShortcutHandlers } from '../shortcuts/registry'
import { redo, undo } from '../store/history'
import { createTimer, timerStatusAt } from '../utils/timer'
import { TimerDurationField } from '../components/timer/TimerDurationField'
import {
  mediaElementFromAsset,
  prepareUploadedMedia,
  qrElement,
  type QrVariant,
} from '../providers/media/mediaWorkflow'
import { useContainFit } from '../hooks/useContainFit'
import { OutputStatusCard } from '../components/editor/OutputStatusCard'
import { useShortcutLabel } from '../shortcuts/useShortcutLabel'

// Same bounds the canvas uses for pointer and keyboard move/resize.
const GEOMETRY_FIELDS = [
  { key: 'x', label: 'X', min: -10, max: 100 },
  { key: 'y', label: 'Y', min: -10, max: 100 },
  { key: 'width', label: 'editor.width', min: 4, max: 160 },
  { key: 'height', label: 'editor.height', min: 4, max: 160 },
] as const

/** Thin spaces around a chapter:verse colon ("23 : 4") for easier reading in the rundown. Display only. */
function spacedReference(text: string): string {
  return text.replace(/(\d):(\d)/g, '$1\u2009:\u2009$2')
}

/** A reference with its verses ("4", "6–7") underlined after the spaced colon. */
function referenceWithVerses(text: string): React.ReactNode {
  const match = text.match(/^(.*\d):(\d[\d\s,–-]*)$/)
  if (!match) return spacedReference(text)
  return (
    <>
      {match[1]}
      {'\u2009:\u2009'}
      <span className="reference-verses">{match[2]}</span>
    </>
  )
}

/** Content type to the sidebar tone family, so a song or a Bible reading is recognisable at a glance. */
const ITEM_TONES: Partial<Record<string, string>> = {
  song: 'rose',
  bible: 'amber',
  announcement: 'blue',
  sermon: 'violet',
  media: 'cyan',
  timer: 'orange',
  blank: 'wash',
}

const TYPE_ICONS: Record<ContentType, typeof BookOpen> = {
  bible: BookOpen,
  song: Music4,
  announcement: Megaphone,
  sermon: Mic2,
  blank: Square,
  media: ImageIcon,
  timer: TimerIcon,
}

function shapeColorValue(value: string | undefined): { hex: string; alpha: number } {
  const rgba = value?.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i,
  )
  if (rgba) {
    const channels = rgba.slice(1, 4).map((channel) => Math.min(255, Math.max(0, Number(channel))))
    return {
      hex: '#' + channels.map((channel) => channel.toString(16).padStart(2, '0')).join(''),
      alpha: rgba[4] ? Math.min(1, Math.max(0, Number(rgba[4]))) : 1,
    }
  }
  if (/^#[0-9a-f]{6}$/i.test(value ?? '')) {
    return { hex: value as string, alpha: 1 }
  }
  return { hex: '#e8a44a', alpha: 0.22 }
}

function rgbaColor(hex: string, alpha: number): string {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16)) ?? [232, 164, 74]
  return 'rgba(' + channels.join(',') + ',' + alpha.toFixed(2) + ')'
}

function ElementIcon({ type }: { type: ElementType }) {
  if (type === 'image') return <ImageIcon size={13} />
  if (type === 'video') return <Film size={13} />
  if (type === 'shape') return <Circle size={13} />
  if (type === 'qr') return <QrCode size={13} />
  if (type === 'embed') return <Video size={13} />
  return <Type size={13} />
}

/** Which of the 9 grid places a box is at now, per axis; null when it sits elsewhere. */
function boxPlacement(element: { x: number; y: number; width: number; height: number }) {
  const near = (a: number, b: number) => Math.abs(a - b) < 0.6
  const align = near(element.x, 4) ? 'left' : near(element.x + element.width / 2, 50) ? 'center' : near(element.x + element.width, 96) ? 'right' : null
  const vertical = near(element.y, 4) ? 'top' : near(element.y + element.height / 2, 50) ? 'middle' : near(element.y + element.height, 96) ? 'bottom' : null
  return { align, vertical } as const
}

export function WorkspaceScreen({ serviceId, presentOnOpen = false }: { serviceId?: string; presentOnOpen?: boolean }) {
  const t = useT()
  const services = useAppStore((state) => state.services)
  const activeServiceId = useAppStore((state) => state.activeServiceId)
  const selectedItemId = useAppStore((state) => state.selectedItemId)
  const selectedSlideId = useAppStore((state) => state.selectedSlideId)
  const selectedElementId = useAppStore((state) => state.selectedElementId)
  const branding = useAppStore((state) => state.branding)
  const saveBranding = useAppStore((state) => state.saveBranding)
  const pasteSlide = useAppStore((state) => state.pasteSlide)
  const selectService = useAppStore((state) => state.selectService)
  const selectItem = useAppStore((state) => state.selectItem)
  const selectSlide = useAppStore((state) => state.selectSlide)
  const selectElement = useAppStore((state) => state.selectElement)
  const updateSlide = useAppStore((state) => state.updateSlide)
  const updateNotes = useAppStore((state) => state.updateNotes)
  const setSlideBackground = useAppStore((state) => state.setSlideBackground)
  const addBlankSlide = useAppStore((state) => state.addBlankSlide)
  const moveSlide = useAppStore((state) => state.moveSlide)
  const uiLocale = useAppStore((state) => state.settings.locale)
  const showGrid = useAppStore((state) => state.settings.showGrid ?? false)
  const snapToObjects = useAppStore((state) => state.settings.snapToObjects ?? true)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const moveItemNextTo = useAppStore((state) => state.moveItemNextTo)
  const moveItemToSection = useAppStore((state) => state.moveItemToSection)
  const moveSectionNextTo = useAppStore((state) => state.moveSectionNextTo)
  const addItem = useAppStore((state) => state.addItem)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const duplicateSlide = useAppStore((state) => state.duplicateSlide)
  const deleteSlide = useAppStore((state) => state.deleteSlide)
  const removeItem = useAppStore((state) => state.removeItem)
  const addElement = useAppStore((state) => state.addElement)
  const updateElement = useAppStore((state) => state.updateElement)
  const addMediaAsset = useAppStore((state) => state.addMedia)
  const removeElement = useAppStore((state) => state.removeElement)
  const duplicateElement = useAppStore((state) => state.duplicateElement)
  const reorderElement = useAppStore((state) => state.reorderElement)
  const addSection = useAppStore((state) => state.addSection)
  const deleteSection = useAppStore((state) => state.deleteSection)
  const moveItem = useAppStore((state) => state.moveItem)
  const startLive = useAppStore((state) => state.startLive)
  const live = useAppStore((state) => state.live)
  const endLive = useAppStore((state) => state.endLive)
  const nextLive = useAppStore((state) => state.nextLive)
  const prevLive = useAppStore((state) => state.prevLive)
  const jumpLive = useAppStore((state) => state.jumpLive)
  const toggleBlank = useAppStore((state) => state.toggleBlank)
  const toggleFreeze = useAppStore((state) => state.toggleFreeze)
  const setMessageVisible = useAppStore((state) => state.setMessageVisible)
  const updateItemTitle = useAppStore((state) => state.updateItemTitle)
  const push = useToasts((state) => state.push)

  const service = services.find((entry) => entry.id === serviceId) ?? null
  const [addOpen, setAddOpen] = useState(false)
  const inspectorPane = useResizablePane('church-presenter:inspector-width', { initial: 288, min: 260, max: 420 })
  const [sectionForAdd, setSectionForAdd] = useState('')
  const [addElementOpen, setAddElementOpen] = useState(false)
  const [mediaDialog, setMediaDialog] = useState<{ open: boolean; mode: MediaDialogMode }>({
    open: false,
    mode: 'image',
  })
  const [qrOpen, setQrOpen] = useState(false)
  const [layersOpen, setLayersOpen] = useState(false)
  const [backgroundOpen, setBackgroundOpen] = useState(false)
  const [logoPlacementOpen, setLogoPlacementOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  // Drag and drop in the service sequence: sections, items and the selected item's slides.
  const [rundownDrag, setRundownDrag] = useState<{ kind: 'section' | 'item' | 'slide'; id: string; itemId?: string } | null>(null)
  const [rundownDrop, setRundownDrop] = useState<{ id: string; side: 'before' | 'after' | 'into' } | null>(null)
  const endRundownDrag = () => {
    setRundownDrag(null)
    setRundownDrop(null)
  }
  const dropSide = (event: React.DragEvent<HTMLElement>): 'before' | 'after' => {
    const rect = event.currentTarget.getBoundingClientRect()
    return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
  }
  const markDrop = (id: string, side: 'before' | 'after' | 'into') => {
    if (rundownDrop?.id !== id || rundownDrop.side !== side) setRundownDrop({ id, side })
  }
  const dropClass = (id: string) => (rundownDrop?.id === id ? `drop-${rundownDrop.side}` : '')
  // Every drag in the sequence has a keyboard and touch twin: buttons, and Alt+↑ / Alt+↓.
  const moveSectionBy = (sectionId: string, direction: -1 | 1) => {
    if (!service) return
    const index = service.sections.findIndex((section) => section.id === sectionId)
    const target = service.sections[index + direction]
    if (index < 0 || !target) return
    moveSectionNextTo(service.id, sectionId, target.id, direction < 0 ? 'before' : 'after')
  }
  const moveSlideBy = (itemId: string, slideId: string, direction: -1 | 1) => {
    const item = service?.items.find((entry) => entry.id === itemId)
    if (!service || !item) return
    const index = item.slides.findIndex((slide) => slide.id === slideId)
    const to = index + direction
    if (index < 0 || to < 0 || to >= item.slides.length) return
    moveSlide(service.id, itemId, slideId, to)
  }
  const altArrow = (event: React.KeyboardEvent, move: (direction: -1 | 1) => void) => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
    event.preventDefault()
    event.stopPropagation()
    move(event.key === 'ArrowUp' ? -1 : 1)
  }
  const [copiedSlide, setCopiedSlide] = useState<Slide | null>(null)
  // Projection format, saved in Settings: the canvas and the audience output use the same one.
  const projection = outputFormat(useAppStore((state) => state.settings.outputFormat))
  const slideAspectRatio = projection.aspect
  const [sectionInputOpen, setSectionInputOpen] = useState(false)
  const [sectionTitle, setSectionTitle] = useState('')
  const [confirm, setConfirm] = useState<
    | { kind: 'item'; itemId: string }
    | { kind: 'slide'; itemId: string; slideId: string }
    | { kind: 'section'; sectionId: string }
    | null
  >(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const restoreService = useAppStore((state) => state.restoreService)
  const duplicateItem = useAppStore((state) => state.duplicateItem)
  const [canvasDrop, setCanvasDrop] = useState<'idle' | 'over' | 'uploading'>('idle')
  /** How much each message box shrank its text to fit, reported by the canvas. */
  const [messageFit, setMessageFit] = useState<Record<string, number>>({})
  const [mobileRundown, setMobileRundown] = useState(false)
  const [mobileInspector, setMobileInspector] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const thumbsRef = useRef<HTMLDivElement>(null)
  // Keep the live slide in view in the slide strip as the presenter moves through the service.
  const liveSlideId = live?.currentSlideId ?? null
  useEffect(() => {
    const strip = thumbsRef.current
    if (!strip || !liveSlideId) return
    const thumb = strip.querySelector<HTMLElement>(`[data-slide-id="${CSS.escape(liveSlideId)}"]`)
    if (!thumb) return
    const stripBox = strip.getBoundingClientRect()
    const thumbBox = thumb.getBoundingClientRect()
    const left = strip.scrollLeft + (thumbBox.left - stripBox.left) - (strip.clientWidth - thumbBox.width) / 2
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    strip.scrollTo?.({ left: Math.max(0, left), behavior: reduce ? 'auto' : 'smooth' })
  }, [liveSlideId])
  const [draggedSlide, setDraggedSlide] = useState<{ itemId: string; slideId: string } | null>(null)
  const [slideDropTarget, setSlideDropTarget] = useState<{ slideId: string; side: 'before' | 'after' } | null>(null)
  const canvasAreaRef = useRef<HTMLDivElement>(null)
  const canvasRailRef = useRef<HTMLDivElement>(null)
  // The canvas fills its area at the exact slide format: 16:9 (1920 × 1080) or 4:3.
  const canvasFit = useContainFit(canvasAreaRef, ASPECT_RATIO[slideAspectRatio], canvasRailRef, 2)
  // Which way the slide strip can still scroll, so the arrows show only when useful.
  const [thumbScroll, setThumbScroll] = useState({ left: false, right: false })
  const updateThumbScroll = useCallback(() => {
    const strip = thumbsRef.current
    if (!strip) return
    const left = strip.scrollLeft > 2
    const right = strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 2
    setThumbScroll((current) => (current.left === left && current.right === right ? current : { left, right }))
  }, [])
  useEffect(() => {
    const strip = thumbsRef.current
    if (!strip) return
    updateThumbScroll()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateThumbScroll)
    observer?.observe(strip)
    return () => observer?.disconnect()
  })
  /** Scroll the strip by most of its visible width, keeping one slide of overlap. */
  const scrollThumbs = (direction: 1 | -1) => {
    const strip = thumbsRef.current
    if (strip) strip.scrollBy({ left: direction * Math.max(160, strip.clientWidth - 140), behavior: 'smooth' })
  }
  // A transition picked in the inspector, waiting for "this slide" or "all slides".
  const [transitionChoice, setTransitionChoice] = useState<SlideTransition | null>(null)
  const [fontApplyAll, setFontApplyAll] = useState<{
    itemId: string
    patch: Partial<Pick<Slide, 'fontFamily' | 'fontSize' | 'fontWeight'>>
  } | null>(null)
  const isLive = Boolean(live && live.serviceId === serviceId)

  useEffect(() => {
    if (serviceId && activeServiceId !== serviceId) {
      selectService(serviceId)
    }
  }, [activeServiceId, selectService, serviceId])

  const activeItem = useMemo(() => {
    if (!service) return null
    const direct = service.items.find((item) => item.id === selectedItemId)
    if (direct) return direct
    const firstId = service.sections[0]?.itemIds[0]
    return service.items.find((item) => item.id === firstId) ?? service.items[0] ?? null
  }, [selectedItemId, service])

  const activeSlide =
    activeItem?.slides.find((slide) => slide.id === selectedSlideId) ?? activeItem?.slides[0] ?? null
  const activeSlideRef = useRef(activeSlide)
  activeSlideRef.current = activeSlide
  const presentShortcut = useShortcutLabel('editor.present')
  const audienceOutputName = useAppStore((state) => {
    const audience = state.monitors.find((monitor) => monitor.role === 'audience')
    return audience ? `${t('output.audience')} · ${audience.name}` : null
  })
  /** While this service is live, a double click puts that slide on the audience screen. */
  const sendSlideLive = (slideId: string) => {
    if (!isLive || live?.currentSlideId === slideId) return
    if (jumpLive(slideId)) push(t('live.sentLive'), 'success')
  }
  const isLiveRef = useRef(isLive)
  isLiveRef.current = isLive
  const goLiveRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!presentOnOpen || !serviceId || !activeSlideRef.current || isLiveRef.current) return
    goLiveRef.current()
    window.history.replaceState(null, '', `#/service/${serviceId}`)
  }, [presentOnOpen, serviceId])

  const activeSection = service && activeItem ? serviceSectionForItem(service, activeItem.id) : null
  const selectedElement =
    activeSlide?.elements.find((element) => element.id === selectedElementId) ?? null
  const allSlides = service ? flatSlides(service) : []
  const itemSlideIndex = activeSlide && activeItem ? activeItem.slides.findIndex((slide) => slide.id === activeSlide.id) : -1
  const overflow = activeSlide ? isLikelyOverflow(activeSlide) : false

  // Editor shortcuts (configurable in Settings → Shortcuts). They run the same
  // actions as the Present button, the timer controls, and the undo history.
  const timerCommand = useAppStore((state) => state.timerCommand)
  const timers = useAppStore((state) => state.timers)
  const timerOnSlide = (command: 'pause' | 'reset') => {
    if (activeSlide?.kind !== 'timer') return false
    timerCommand(activeSlide.id, command)
  }
  useShortcutHandlers('editor', {
    'editor.present': () => {
      if (!activeSlide) return false
      toggleLive()
    },
    'timer.start': () => {
      if (activeSlide?.kind !== 'timer') return false
      const runtime = timers[activeSlide.id] ?? createTimer(activeSlide.timer?.durationSeconds ?? 0)
      timerCommand(activeSlide.id, timerStatusAt(runtime, Date.now()) === 'paused' ? 'resume' : 'start')
    },
    'timer.pause': () => timerOnSlide('pause'),
    'timer.reset': () => timerOnSlide('reset'),
    'app.undo': () => {
      push(undo() ? t('shortcuts.undone') : t('shortcuts.nothingToUndo'), 'info')
    },
    'app.redo': () => {
      push(redo() ? t('shortcuts.redone') : t('shortcuts.nothingToRedo'), 'info')
    },
  })

  const liveSlides = service ? flatSlides(service) : []
  const liveCurrentSlide = live ? liveSlides.find((s) => s.slide.id === live.currentSlideId) ?? null : null
  // Live: the inspector folds down to the speaker notes of the slide on screen. Opening it
  // is remembered per live session (by start time), so the next session starts folded again.
  const [inspectorOpenForSession, setInspectorOpenForSession] = useState<string | null>(null)
  const liveNotesOnly = isLive && inspectorOpenForSession !== (live?.startedAt ?? null)
  useShortcutHandlers(
    'presentation',
    {
      'live.next': () => nextLive(),
      'live.prev': () => prevLive(),
      'live.first': () => { if (liveSlides[0]) jumpLive(liveSlides[0].slide.id) },
      'live.last': () => { const last = liveSlides.at(-1); if (last) jumpLive(last.slide.id) },
      'live.blank': () => toggleBlank(),
      'live.freeze': () => toggleFreeze(),
      'live.message': () => {
        if (live?.message && live.messageVisible) setMessageVisible(false)
        else if (live?.message) setMessageVisible(true)
      },
      'live.exit': () => setEndOpen(true),
      'timer.start': () => {
        if (liveCurrentSlide?.slide.kind !== 'timer') return false
        const runtime = timers[liveCurrentSlide.slide.id] ?? createTimer(liveCurrentSlide.slide.timer?.durationSeconds ?? 0)
        timerCommand(liveCurrentSlide.slide.id, timerStatusAt(runtime, Date.now()) === 'paused' ? 'resume' : 'start')
      },
      'timer.pause': () => {
        if (liveCurrentSlide?.slide.kind !== 'timer') return false
        timerCommand(liveCurrentSlide.slide.id, 'pause')
      },
      'timer.reset': () => {
        if (liveCurrentSlide?.slide.kind !== 'timer') return false
        timerCommand(liveCurrentSlide.slide.id, 'reset')
      },
    },
    isLive,
  )

  const confirmEndLive = () => {
    endLive()
    setEndOpen(false)
    push(t('live.ended'), 'info')
  }

  const deleteSelected = useCallback(() => {
    if (!service || !selectedElement || !activeItem || !activeSlide) return
    removeElement(service.id, activeItem.id, activeSlide.id, selectedElement.id)
    push(t('toast.elementDeleted'), 'success')
  }, [activeItem, activeSlide, push, removeElement, selectedElement, service, t])

  useEffect(() => {
    const handleDeleteKey = (event: KeyboardEvent) => {
      if (event.key !== 'Backspace' && event.key !== 'Delete') return
      if (!selectedElement || !activeItem || !activeSlide) return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"]')
      ) {
        return
      }
      event.preventDefault()
      deleteSelected()
    }
    window.addEventListener('keydown', handleDeleteKey)
    return () => window.removeEventListener('keydown', handleDeleteKey)
  }, [activeItem, activeSlide, deleteSelected, selectedElement])

  const goLive = () => {
    if (!service || !activeSlide) return
    webOutputProvider.openOutput('audience')
    startLive(service.id, activeSlide.id)
  }
  goLiveRef.current = goLive

  if (!service) {
    return (
      <div className="empty-workspace">
        <LayoutGrid size={34} />
        <h2>{t('editor.noService')}</h2>
        <p>{t('editor.serviceNotFoundCopy')}</p>
        <button className="btn btn-primary" onClick={() => navigate('/home')}>
          {t('editor.backHome')}
        </button>
      </div>
    )
  }

  const openAdd = (sectionId: string) => {
    setSectionForAdd(sectionId)
    setAddOpen(true)
  }

  const commitBibleText = (which: 'primary' | 'secondary', value: string) => {
    if (!activeItem || !activeSlide?.bible) return
    const text = sanitizeText(value, 12000)
    const bible = {
      ...activeSlide.bible,
      primary:
        which === 'primary'
          ? { ...activeSlide.bible.primary, text }
          : activeSlide.bible.primary,
      secondary:
        which === 'secondary' && activeSlide.bible.secondary
          ? { ...activeSlide.bible.secondary, text }
          : activeSlide.bible.secondary,
    }
    updateSlide(service.id, activeItem.id, activeSlide.id, {
      bible,
      text: which === 'primary' ? text : activeSlide.text,
    })
  }

  const insertElement = (element: SlideElement) => {
    if (!activeItem || !activeSlide) return
    addElement(service.id, activeItem.id, activeSlide.id, element)
    setAddElementOpen(false)
    push(t('toast.elementAdded'), 'success')
  }

  const addText = () => {
    const element = makeTextElement(t('editor.text'), {
      x: 22,
      y: 44,
      width: 56,
      height: 9,
      settings: { fontSize: 54, fontWeight: 600, align: 'center', lineHeight: 1.1, textShadow: true },
    })
    insertElement(element)
  }

  const addShape = () => {
    const element = makeElement('shape', {
      x: 34,
      y: 34,
      width: 32,
      height: 26,
      settings: { shape: 'rect', fill: 'rgba(232,164,74,0.22)', radius: 18 },
    })
    insertElement(element)
  }

  const addMessage = () => insertElement(makeMessageElement(t('message.defaultText')))

  const addQrPayload = (payload: string, variant: QrVariant) => {
    insertElement(qrElement(payload, variant))
  }

  const addMedia = (asset: Parameters<typeof mediaElementFromAsset>[0]) => {
    // A template's empty video slot takes the first video added to its slide, keeping its frame.
    const slot = asset.kind === 'video'
      ? activeSlide?.elements.find((element) => element.type === 'video' && element.settings?.videoSlot && !element.source)
      : undefined
    if (slot && activeItem && activeSlide) {
      const filled = mediaElementFromAsset(asset, {
        providerLabel: t(asset.provider === 'url' ? 'media.remote' : 'media.localOnly'),
        fallbackText: t('editor.video'),
      })
      updateElement(service.id, activeItem.id, activeSlide.id, slot.id, {
        source: filled.source,
        text: filled.text,
        settings: { ...filled.settings, ...slot.settings, ...{ fit: 'cover' as const }, videoSlot: false, missing: false, status: filled.settings?.status },
      })
      selectElement(slot.id)
      return
    }
    insertElement(
      mediaElementFromAsset(asset, {
        providerLabel: t(
          asset.provider === 'youtube'
            ? 'editor.youtubeProvider'
            : asset.provider === 'url'
              ? 'media.remote'
              : 'media.localOnly',
        ),
        fallbackText: t(asset.kind === 'image' ? 'editor.image' : 'editor.video'),
      }),
    )
  }

  const dropFilesOnCanvas = async (files: FileList) => {
    if (!activeSlide || !files.length) return
    setCanvasDrop('uploading')
    for (const file of Array.from(files)) {
      const result = await prepareUploadedMedia(file)
      if (!result.ok || !result.asset) {
        push(mediaError(result.reason, t), 'error')
        continue
      }
      addMediaAsset(result.asset)
      addMedia(result.asset)
    }
    setCanvasDrop('idle')
  }

  const toggleSelectedVisible = () => {
    if (!selectedElement || !activeItem || !activeSlide) return
    updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, {
      visible: !selectedElement.visible,
    })
  }

  const duplicateSelected = () => {
    if (!selectedElement || !activeItem || !activeSlide) return
    duplicateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id)
  }

  const fillBackgroundWithSelectedImage = () => {
    if (
      !selectedElement ||
      selectedElement.type !== 'image' ||
      !selectedElement.source ||
      !activeItem ||
      !activeSlide
    ) {
      return
    }
    setSlideBackground(service.id, activeItem.id, activeSlide.id, {
      type: 'image',
      source: selectedElement.source,
      overlay: 0.46,
      backgroundPosition: '50% 50%',
      backgroundZoom: 100,
      tone: 'dark',
    })
    removeElement(service.id, activeItem.id, activeSlide.id, selectedElement.id)
    push(t('editor.useAsBackground'), 'success')
  }

  const uploadLogo = async (file: File): Promise<boolean> => {
    const result = await processLogoFile(file)
    if (!result.ok) {
      push(t(LOGO_ERROR_KEYS[result.reason]), 'error')
      return false
    }
    saveBranding({ ...branding, logoUrl: result.logo.dataUrl })
    return true
  }

  const addLogoToSlide = (corner: LogoCorner, shape: LogoShape, allSlides: boolean) => {
    const logoUrl = useAppStore.getState().branding.logoUrl
    if (!activeItem || !activeSlide || !logoUrl) {
      push(t('settings.uploadLogo'), 'error')
      return
    }
    const margin = 4
    const size = 11
    // height% must compensate for the canvas aspect ratio so square/circle render as square/circle.
    // Percentages are relative to canvas width and height independently; canvas is 1920:1080 (wide) or 4:3 (classic).
    const [aw, ah] = [projection.width, projection.height]
    const height = Math.round(size * aw / ah * 10) / 10
    const makeLogo = () => makeElement('image', {
      source: logoUrl,
      text: branding.name,
      x: corner.includes('right') ? 100 - margin - size : margin,
      y: corner.includes('bottom') ? 100 - margin - height : margin,
      width: size,
      height,
      settings: {
        fit: 'contain',
        radius: shape === 'circle' ? 999 : 0,
        cropX: 50,
        cropY: 50,
        cropZoom: 1,
      },
    })
    if (!allSlides) {
      addElement(service.id, activeItem.id, activeSlide.id, makeLogo())
      return
    }
    // Every slide of the service, skipping slides that already carry this logo.
    let added = 0
    for (const item of service.items) {
      for (const slide of item.slides) {
        if (slide.elements.some((element) => element.type === 'image' && element.source === logoUrl)) continue
        addElement(service.id, item.id, slide.id, makeLogo())
        added += 1
      }
    }
    push(t('editor.logoAddedAll', { count: added }), 'success')
  }

  /** Moves the selected box to one of 9 places inside the 4% safe margin. */
  const placeSelected = (align: 'left' | 'center' | 'right', vertical: 'top' | 'middle' | 'bottom') => {
    if (!selectedElement || !activeItem || !activeSlide) return
    updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, {
      x: align === 'left' ? 4 : align === 'center' ? 50 - selectedElement.width / 2 : 96 - selectedElement.width,
      y: vertical === 'top' ? 4 : vertical === 'middle' ? 50 - selectedElement.height / 2 : 96 - selectedElement.height,
    })
  }

  const toggleLive = () => {
    if (isLive) {
      setEndOpen(true)
    } else {
      goLive()
    }
  }

  return (
    <div className="screen workspace-screen">
      {service.status === 'archived' && (
        <div className="workspace-banner" role="status">
          <Archive size={15} />
          <span>{t('culto.archivedBanner')}</span>
          <button
            className="text-link"
            onClick={() => {
              if (restoreService(service.id)) push(t('culto.restored', { title: service.title }), 'success')
            }}
          >
            {t('culto.restore')}
          </button>
        </div>
      )}
      <CultoFormDialog open={detailsOpen} service={service} onClose={() => setDetailsOpen(false)} />

      <div className="workspace" style={{ '--inspector-w': `${inspectorPane.width}px` } as CSSProperties}>
        {mobileRundown && <button className="drawer-scrim" onClick={() => setMobileRundown(false)} aria-label={t('common.close')} />}
        {mobileInspector && <button className="drawer-scrim" onClick={() => setMobileInspector(false)} aria-label={t('common.close')} />}
        <aside className={`rundown panel ${mobileRundown ? 'is-drawer-open' : ''}`}>
          <div className="rundown-identity">
            <button className="icon-btn rundown-back" onClick={() => navigate('/services')} aria-label={t('nav.services')} title={t('nav.services')}>
              <ArrowLeft size={16} />
            </button>
            <h1 title={service.title}>{service.title}</h1>
            <div className="rundown-identity-meta">
              <StatusChip status={service.status} />
              <span className="rundown-identity-when">
                <CalendarDays size={12} aria-hidden="true" />
                {formatToolbarDate(service.date, uiLocale)}
                {service.time ? ` · ${formatTime(service.time, uiLocale)}` : ''}
              </span>
            </div>
          </div>
          <div className="rundown-head">
            <div>
              <h2>{t('editor.rundown')}</h2>
            </div>
            <button className="icon-btn" onClick={() => setSectionInputOpen(true)} aria-label={t('editor.addSection')}>
              <Plus size={16} />
            </button>
          </div>
          <div className="rundown-scroll">
            {service.sections.map((section, sectionIndex) => {
              const isCollapsed = collapsed.has(section.id)
              return (
                <div
                  key={section.id}
                  className={`rundown-section ${rundownDrag?.kind === 'section' && rundownDrag.id === section.id ? 'is-dragging' : ''}`}
                >
                  <div
                    className={`rundown-section-head ${dropClass(section.id)}`}
                    draggable
                    title={t('rundown.dragHint')}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData('text/plain', section.id)
                      setRundownDrag({ kind: 'section', id: section.id })
                    }}
                    onDragOver={(event) => {
                      if (!rundownDrag || rundownDrag.kind === 'slide') return
                      if (rundownDrag.kind === 'section' && rundownDrag.id === section.id) return
                      event.preventDefault()
                      event.dataTransfer.dropEffect = 'move'
                      markDrop(section.id, rundownDrag.kind === 'item' ? 'into' : dropSide(event))
                    }}
                    onDragLeave={(event) => {
                      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
                      setRundownDrop((current) => (current?.id === section.id ? null : current))
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      if (rundownDrag?.kind === 'item') moveItemToSection(service.id, rundownDrag.id, section.id)
                      else if (rundownDrag?.kind === 'section' && rundownDrop?.id === section.id && rundownDrop.side !== 'into') {
                        moveSectionNextTo(service.id, rundownDrag.id, section.id, rundownDrop.side)
                      }
                      endRundownDrag()
                    }}
                    onDragEnd={endRundownDrag}
                  >
                    <button
                      className="section-collapse"
                      aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                      onKeyDown={(event) => altArrow(event, (direction) => moveSectionBy(section.id, direction))}
                      onClick={() => {
                        const next = new Set(collapsed)
                        if (next.has(section.id)) next.delete(section.id)
                        else next.add(section.id)
                        setCollapsed(next)
                      }}
                    >
                      {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      <span>{section.title}</span>
                      <small className="rundown-count">{section.itemIds.length}</small>
                    </button>
                    <div className="section-actions">
                      <button
                        className="icon-btn icon-btn-xs"
                        onClick={() => moveSectionBy(section.id, -1)}
                        disabled={sectionIndex === 0}
                        aria-label={`${t('common.moveUp')}: ${section.title}`}
                        title={t('common.moveUp')}
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        className="icon-btn icon-btn-xs"
                        onClick={() => moveSectionBy(section.id, 1)}
                        disabled={sectionIndex === service.sections.length - 1}
                        aria-label={`${t('common.moveDown')}: ${section.title}`}
                        title={t('common.moveDown')}
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        className="icon-btn icon-btn-xs"
                        onClick={() => openAdd(section.id)}
                        aria-label={t('editor.addContent')}
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        className="icon-btn icon-btn-xs"
                        onClick={() => setConfirm({ kind: 'section', sectionId: section.id })}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  {!isCollapsed &&
                    section.itemIds.map((itemId) => {
                      const item = service.items.find((entry) => entry.id === itemId)
                      if (!item) return null
                      const Icon = TYPE_ICONS[item.type] ?? Square
                      const selected = item.id === activeItem?.id
                      return (
                        <div
                          key={item.id}
                          className={`rundown-item-wrap ${selected ? 'is-selected' : ''} ${
                            rundownDrag?.kind === 'item' && rundownDrag.id === item.id ? 'is-dragging' : ''
                          } ${dropClass(item.id)}`}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = 'move'
                            event.dataTransfer.setData('text/plain', item.id)
                            setRundownDrag({ kind: 'item', id: item.id })
                          }}
                          onDragOver={(event) => {
                            if (rundownDrag?.kind !== 'item' || rundownDrag.id === item.id) return
                            event.preventDefault()
                            event.dataTransfer.dropEffect = 'move'
                            markDrop(item.id, dropSide(event))
                          }}
                          onDragLeave={(event) => {
                            if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
                            setRundownDrop((current) => (current?.id === item.id ? null : current))
                          }}
                          onDrop={(event) => {
                            if (rundownDrag?.kind !== 'item') return
                            event.preventDefault()
                            if (rundownDrop?.id === item.id && rundownDrop.side !== 'into') {
                              moveItemNextTo(service.id, rundownDrag.id, item.id, rundownDrop.side)
                            }
                            endRundownDrag()
                          }}
                          onDragEnd={endRundownDrag}
                        >
                          <div className="rundown-item">
                            <button
                              type="button"
                              className="rundown-item-main"
                              aria-current={selected ? 'true' : undefined}
                              aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                              onKeyDown={(event) => altArrow(event, (direction) => moveItem(service.id, item.id, direction))}
                              onClick={() => { selectItem(item.id); setMobileRundown(false) }}
                            >
                              <span className="rundown-type tone-chip" data-tone={ITEM_TONES[item.type] ?? 'wash'} aria-hidden="true">
                                <Icon size={15} />
                              </span>
                              <span className="rundown-copy">
                                <strong>{spacedReference(item.title)}</strong>
                                <span>
                                  {item.slides.length} {t(item.slides.length === 1 ? 'common.slide' : 'common.slides')} · {t(`type.${item.type}`)}
                                </span>
                              </span>
                            </button>
                            <span className="rundown-actions">
                              <button
                                type="button"
                                className="icon-btn icon-btn-xs"
                                onClick={() => moveItem(service.id, item.id, -1)}
                                aria-label={`${t('common.moveUp')}: ${item.title}`}
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn icon-btn-xs"
                                onClick={() => moveItem(service.id, item.id, 1)}
                                aria-label={`${t('common.moveDown')}: ${item.title}`}
                              >
                                <ArrowDown size={12} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn icon-btn-xs"
                                onClick={() => {
                                  if (duplicateItem(service.id, item.id)) push(t('culto.itemDuplicated'), 'success')
                                }}
                                aria-label={`${t('culto.duplicateItem')}: ${item.title}`}
                                title={t('culto.duplicateItem')}
                              >
                                <Copy size={12} />
                              </button>
                            </span>
                          </div>
                          {selected && (
                            <div className="rundown-slides">
                              {item.slides.map((slide, index) => (
                                <div key={slide.id} className="rundown-slide-row">
                                <button
                                  className={`rundown-slide ${slide.id === activeSlide?.id ? 'is-active' : ''} ${live?.currentSlideId === slide.id ? 'is-live' : ''} ${
                                    rundownDrag?.kind === 'slide' && rundownDrag.id === slide.id ? 'is-dragging' : ''
                                  } ${dropClass(slide.id)}`}
                                  draggable
                                  aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                                  onKeyDown={(event) => altArrow(event, (direction) => moveSlideBy(item.id, slide.id, direction))}
                                  onDragStart={(event) => {
                                    // Slides move within their item; keep the item itself from starting a drag.
                                    event.stopPropagation()
                                    event.dataTransfer.effectAllowed = 'move'
                                    event.dataTransfer.setData('text/plain', slide.id)
                                    setRundownDrag({ kind: 'slide', id: slide.id, itemId: item.id })
                                  }}
                                  onDragOver={(event) => {
                                    if (rundownDrag?.kind !== 'slide' || rundownDrag.itemId !== item.id || rundownDrag.id === slide.id) return
                                    event.preventDefault()
                                    event.stopPropagation()
                                    event.dataTransfer.dropEffect = 'move'
                                    markDrop(slide.id, dropSide(event))
                                  }}
                                  onDrop={(event) => {
                                    if (rundownDrag?.kind !== 'slide' || rundownDrag.itemId !== item.id) return
                                    event.preventDefault()
                                    event.stopPropagation()
                                    if (rundownDrop?.id === slide.id && rundownDrop.side !== 'into') {
                                      const from = item.slides.findIndex((entry) => entry.id === rundownDrag.id)
                                      let to = index + (rundownDrop.side === 'after' ? 1 : 0)
                                      if (from < to) to -= 1
                                      moveSlide(service.id, item.id, rundownDrag.id, to)
                                    }
                                    endRundownDrag()
                                  }}
                                  onDragEnd={(event) => {
                                    event.stopPropagation()
                                    endRundownDrag()
                                  }}
                                  aria-label={live?.currentSlideId === slide.id ? `${t('status.live')}: ${slideLabel(slide, slide.text.slice(0, 42)) || t('editor.blankSlide')}` : undefined}
                                  onClick={() => { selectSlide(item.id, slide.id); setMobileRundown(false) }}
                                  onDoubleClick={() => sendSlideLive(slide.id)}
                                  title={isLive ? t('live.doubleClickHint') : undefined}
                                >
                                  <span>{index + 1}</span>
                                  {(() => {
                                    // "Salmos 23:4 · KJA + WEB": the reference stands out, the translations step back.
                                    const label = slideLabel(slide, slide.text.slice(0, 42)) || t('editor.blankSlide')
                                    const split = label.indexOf(' · ')
                                    return split > 0 ? (
                                      <span className="rundown-slide-label">
                                        <strong>{referenceWithVerses(label.slice(0, split))}</strong>
                                        <small>{label.slice(split + 3)}</small>
                                      </span>
                                    ) : (
                                      <span className="rundown-slide-label">
                                        <strong>{label}</strong>
                                      </span>
                                    )
                                  })()}
                                </button>
                                {slide.id === activeSlide?.id && item.slides.length > 1 && (
                                  <span className="rundown-slide-move">
                                    <button
                                      type="button"
                                      className="icon-btn icon-btn-xs"
                                      disabled={index === 0}
                                      onClick={() => moveSlideBy(item.id, slide.id, -1)}
                                      aria-label={`${t('common.moveUp')}: ${t('common.slide')} ${index + 1}`}
                                      title={t('common.moveUp')}
                                    >
                                      <ArrowUp size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      className="icon-btn icon-btn-xs"
                                      disabled={index === item.slides.length - 1}
                                      onClick={() => moveSlideBy(item.id, slide.id, 1)}
                                      aria-label={`${t('common.moveDown')}: ${t('common.slide')} ${index + 1}`}
                                      title={t('common.moveDown')}
                                    >
                                      <ArrowDown size={12} />
                                    </button>
                                  </span>
                                )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              )
            })}
            {sectionInputOpen && (
              <form
                className="new-section-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!sectionTitle.trim()) return
                  addSection(service.id, sectionTitle.trim())
                  setSectionTitle('')
                  setSectionInputOpen(false)
                  push(t('toast.sectionAdded'), 'success')
                }}
              >
                <input
                  autoFocus
                  value={sectionTitle}
                  onChange={(event) => setSectionTitle(event.target.value)}
                  placeholder={t('editor.sectionTitle')}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setSectionInputOpen(false)
                  }}
                />
                <button className="icon-btn" type="submit">
                  <Check size={14} />
                </button>
              </form>
            )}
            <button className="rundown-add-section" onClick={() => setSectionInputOpen(true)}>
              <Plus size={14} />
              {t('editor.addSection')}
            </button>
          </div>
        </aside>

        <section className="editor-center">
          <div className="editor-stage">
            <div className="editor-stage-head">
              <button className="mobile-drawer-toggle mobile-rundown-toggle" onClick={() => setMobileRundown(true)} aria-label={t('editor.rundown')}>
                <Menu size={18} />
              </button>
              <div className="stage-breadcrumb">
                <span>{activeSection?.title ?? t('editor.sectionTitle')}</span>
                <ChevronRight size={12} />
                <strong>{activeItem?.title ?? t('editor.noSelection')}</strong>
              </div>
              <div className="stage-actions">
                <span className="muted-note">
                  {activeSlide
                    ? t('editor.slidePosition', {
                        current: itemSlideIndex + 1,
                        total: activeItem?.slides.length ?? 0,
                      })
                    : t('editor.noSelection')}
                </span>
                <div className="popover-wrap">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setAddElementOpen(!addElementOpen)}
                    disabled={!activeSlide}
                  >
                    <Plus size={14} />
                    <span>{t('editor.element')}</span>
                    <ChevronDown size={13} />
                  </button>
                  {addElementOpen && (
                    <>
                      <button className="popover-scrim" onClick={() => setAddElementOpen(false)} aria-label={t('common.close')} />
                      <div className="popover">
                        <button onClick={addText}>
                          <Type size={15} />
                          {t('editor.text')}
                        </button>
                        <button onClick={addShape}>
                          <Circle size={15} />
                          {t('editor.shape')}
                        </button>
                        <button
                          onClick={() => {
                            setAddElementOpen(false)
                            setQrOpen(true)
                          }}
                        >
                          <QrCode size={15} />
                          {t('editor.qr')}
                        </button>
                        <button
                          onClick={() => {
                            setAddElementOpen(false)
                            setMediaDialog({ open: true, mode: 'image' })
                          }}
                        >
                          <ImageIcon size={15} />
                          {t('editor.image')}
                        </button>
                        <button
                          onClick={() => {
                            setAddElementOpen(false)
                            setMediaDialog({ open: true, mode: 'video' })
                          }}
                        >
                          <Film size={15} />
                          {t('editor.video')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <button
                  className="icon-btn"
                  onClick={() => {
                    if (!activeSlide) return
                    setCopiedSlide(activeSlide)
                    push(t('toast.copied'), 'success')
                  }}
                  disabled={!activeSlide}
                  aria-label={t('editor.copySlide')}
                  title={t('editor.copySlide')}
                >
                  <Clipboard size={15} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => {
                    if (!activeItem || !copiedSlide) return
                    pasteSlide(service.id, activeItem.id, copiedSlide)
                    push(t('toast.slidePasted'), 'success')
                  }}
                  disabled={!activeItem || !copiedSlide}
                  aria-label={t('editor.pasteSlide')}
                  title={t('editor.pasteSlide')}
                >
                  <ClipboardPaste size={15} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => activeSlide && duplicateSlide(service.id, activeItem!.id, activeSlide.id)}
                  disabled={!activeSlide}
                  aria-label={t('editor.duplicate')}
                >
                  <Copy size={15} />
                </button>
                <button
                  className="icon-btn danger-text"
                  onClick={() =>
                    activeSlide &&
                    setConfirm({ kind: 'slide', itemId: activeItem!.id, slideId: activeSlide.id })
                  }
                  disabled={!activeSlide}
                  aria-label={t('editor.delete')}
                >
                  <Trash2 size={15} />
                </button>
                <button className="mobile-drawer-toggle mobile-inspector-toggle" onClick={() => setMobileInspector(true)} aria-label={t('editor.inspector')}>
                  <PanelRight size={18} />
                </button>
              </div>
            </div>

            <EditorToolbar
              disabled={!activeSlide}
              layersOpen={layersOpen}
              onText={addText}
              onMedia={(mode) => setMediaDialog({ open: true, mode })}
              onLogo={() => setLogoPlacementOpen(true)}
              onQr={() => setQrOpen(true)}
              onShape={addShape}
              onMessage={addMessage}
              onBackground={() => setBackgroundOpen(true)}
              onToggleLayers={() => setLayersOpen((value) => !value)}
              onTemplates={() => setTemplatePickerOpen(true)}
            />

            <div className="canvas-area" ref={canvasAreaRef}>
              <div className="canvas-stage-row">
                <div
                  className={`canvas-frame is-aspect-${slideAspectRatio} ${canvasFit ? 'is-fitted' : ''} ${canvasDrop !== 'idle' ? `is-drop-${canvasDrop}` : ''}`}
                  style={canvasFit ? { width: canvasFit.width, height: canvasFit.height } : undefined}
                  onDragOver={(event) => {
                    if (!activeSlide || !event.dataTransfer.types.includes('Files')) return
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'copy'
                    if (canvasDrop === 'idle') setCanvasDrop('over')
                  }}
                  onDragLeave={(event) => {
                    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
                    if (canvasDrop === 'over') setCanvasDrop('idle')
                  }}
                  onDrop={(event) => {
                    if (!activeSlide || !event.dataTransfer.files.length) return
                    event.preventDefault()
                    void dropFilesOnCanvas(event.dataTransfer.files)
                  }}
                >
                  <SlideRenderer
                    slide={activeSlide}
                    branding={branding}
                    aspectRatio={slideAspectRatio}
                    songFooter={activeItem?.type === 'song' ? {
                      title: activeItem.title,
                      author: activeItem.metadata?.author,
                    } : undefined}
                    interactive
                    showGrid={showGrid}
                    snapToObjects={snapToObjects}
                    selectedElementId={selectedElementId}
                    onSelectElement={selectElement}
                    onMoveElement={(id, x, y) => {
                      if (!activeItem || !activeSlide) return
                      updateElement(service.id, activeItem.id, activeSlide.id, id, { x, y })
                    }}
                    onResizeElement={(id, box) => {
                      if (!activeItem || !activeSlide) return
                      updateElement(service.id, activeItem.id, activeSlide.id, id, box)
                    }}
                    onEditElementText={(id, text) => {
                      if (!activeItem || !activeSlide) return
                      updateElement(service.id, activeItem.id, activeSlide.id, id, {
                        text: sanitizeEditableText(text, 12000),
                      })
                    }}
                    onEditSlideText={(text) => {
                      if (!activeItem || !activeSlide) return
                      updateSlide(service.id, activeItem.id, activeSlide.id, { text })
                    }}
                    keyboardHintId="canvas-keyboard-hint"
                    onMessageFit={(id, scale) => setMessageFit((current) => ({ ...current, [id]: scale }))}
                  />
                  {canvasDrop !== 'idle' && (
                    <div className="canvas-drop-overlay" role="status" aria-live="polite">
                      <ImagePlus size={22} />
                      <span>{canvasDrop === 'uploading' ? t('media.uploading') : t('editor.dropHint')}</span>
                    </div>
                  )}
                </div>
                <div className="canvas-rail-column" ref={canvasRailRef}>
                  <ElementActionRail
                    selectedElement={selectedElement}
                    onAddContent={() => openAdd(activeSection?.id ?? service.sections[0]?.id ?? '')}
                    onAddSlide={() => activeItem && addBlankSlide(service.id, activeItem.id)}
                    onFillBackground={fillBackgroundWithSelectedImage}
                    onToggleVisible={toggleSelectedVisible}
                    onDuplicate={duplicateSelected}
                    onDelete={deleteSelected}
                  />
                  <CanvasGuidesRail
                    showGrid={showGrid}
                    snapToObjects={snapToObjects}
                    onToggleGrid={() => updateSettings({ showGrid: !showGrid })}
                    onToggleSnap={() => updateSettings({ snapToObjects: !snapToObjects })}
                  />
                  <button
                    className="editor-tool slide-delete-btn"
                    disabled={!activeSlide || !activeItem}
                    aria-label={t('rail.deleteSlide')}
                    aria-description={t('rail.deleteSlideHint')}
                    onClick={() => {
                      if (activeItem && activeSlide) {
                        setConfirm({ kind: 'slide', itemId: activeItem.id, slideId: activeSlide.id })
                      }
                    }}
                  >
                    <Trash2 size={16} />
                    <RailTooltip title={t('rail.deleteSlide')} hint={t('rail.deleteSlideHint')} />
                  </button>
                </div>
              </div>
              <span id="canvas-keyboard-hint" className="sr-only">
                {t('editor.canvasHint')} · {t('editor.keyboardHint')}
              </span>
            </div>
            <div className="workspace-bible-actions">
              <button type="button" className="btn btn-secondary workspace-bible-mode"
                onClick={() => navigate(`/biblemode/${encodeURIComponent(service.id)}`)}>
                <BookOpenText size={16} aria-hidden="true" />
                {t('nav.biblemode')}
              </button>
            </div>

            <div className="slide-strip">
              <div className="slide-strip-head">
                <span className="eyebrow">{t('common.slides')}</span>
                {isLive && <span className="slide-strip-live-hint">{t('live.doubleClickHint')}</span>}
                <button
                  className="text-link"
                  onClick={() => activeItem && addBlankSlide(service.id, activeItem.id)}
                >
                  <Plus size={13} />
                  {t('editor.addSlide')}
                </button>
              </div>
              <div className="slide-thumbs-row">
                <button
                  type="button"
                  className="slide-thumbs-arrow slide-thumbs-arrow-left"
                  onClick={() => scrollThumbs(-1)}
                  disabled={!thumbScroll.left}
                  aria-label={t('editor.scrollLeft')}
                  title={t('editor.scrollLeft')}
                >
                  <ChevronLeft size={20} strokeWidth={2.4} />
                </button>
                <div className="slide-thumbs" ref={thumbsRef} onScroll={updateThumbScroll}>
                {allSlides.map((entry, index) => {
                  const isActive = entry.slide.id === activeSlide?.id && entry.item.id === activeItem?.id
                  const isLiveSlide = live?.currentSlideId === entry.slide.id
                  const prevItem = index > 0 ? allSlides[index - 1].item.id : null
                  const showDivider = prevItem !== null && prevItem !== entry.item.id
                  return (
                    <div
                      key={entry.slide.id}
                      data-slide-id={entry.slide.id}
                      className={`slide-thumb-wrap ${draggedSlide?.slideId === entry.slide.id ? 'is-dragging' : ''} ${
                        slideDropTarget?.slideId === entry.slide.id ? `drop-${slideDropTarget.side}` : ''
                      }`}
                      style={showDivider ? { marginLeft: 12 } : undefined}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData('text/plain', entry.slide.id)
                        setDraggedSlide({ itemId: entry.item.id, slideId: entry.slide.id })
                      }}
                      onDragOver={(event) => {
                        // Same item: reorder slides. Another item: move the dragged slide's whole item.
                        if (!draggedSlide || draggedSlide.slideId === entry.slide.id) return
                        event.preventDefault()
                        event.dataTransfer.dropEffect = 'move'
                        const rect = event.currentTarget.getBoundingClientRect()
                        const side = event.clientX < rect.left + rect.width / 2 ? 'before' : 'after'
                        if (slideDropTarget?.slideId !== entry.slide.id || slideDropTarget.side !== side) {
                          setSlideDropTarget({ slideId: entry.slide.id, side })
                        }
                      }}
                      onDragLeave={(event) => {
                        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
                        setSlideDropTarget((current) => (current?.slideId === entry.slide.id ? null : current))
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        if (draggedSlide && slideDropTarget) {
                          if (draggedSlide.itemId === entry.item.id) {
                            const slides = entry.item.slides
                            const from = slides.findIndex((slide) => slide.id === draggedSlide.slideId)
                            let to = slides.findIndex((slide) => slide.id === entry.slide.id)
                            if (slideDropTarget.side === 'after') to += 1
                            if (from < to) to -= 1
                            moveSlide(service.id, entry.item.id, draggedSlide.slideId, to)
                          } else {
                            moveItemNextTo(service.id, draggedSlide.itemId, entry.item.id, slideDropTarget.side)
                          }
                        }
                        setDraggedSlide(null)
                        setSlideDropTarget(null)
                      }}
                      onDragEnd={() => {
                        setDraggedSlide(null)
                        setSlideDropTarget(null)
                      }}
                    >
                      <button
                        className={`slide-thumb ${isActive ? 'is-active' : ''} ${isLiveSlide ? 'is-live' : ''}`}
                        onKeyDown={(event) => {
                          if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
                          event.preventDefault()
                          const from = entry.item.slides.findIndex((slide) => slide.id === entry.slide.id)
                          moveSlide(service.id, entry.item.id, entry.slide.id, from + (event.key === 'ArrowLeft' ? -1 : 1))
                          const button = event.currentTarget
                          requestAnimationFrame(() => button.focus())
                        }}
                        onClick={() => {
                          selectItem(entry.item.id)
                          selectSlide(entry.item.id, entry.slide.id)
                        }}
                        onDoubleClick={() => {
                          selectItem(entry.item.id)
                          selectSlide(entry.item.id, entry.slide.id)
                          selectElement(null)
                          sendSlideLive(entry.slide.id)
                        }}
                        title={isLive ? t('live.doubleClickHint') : undefined}
                      >
                        <span className="slide-thumb-canvas">
                          <SlideRenderer slide={entry.slide} branding={branding} aspectRatio={slideAspectRatio} compact thumbnail />
                          {isLiveSlide && <span className="slide-thumb-live">{t('status.live')}</span>}
                        </span>
                        <span className="slide-thumb-label">
                          <span className="slide-thumb-number">{index + 1}</span>
                          <small title={slideLabel(entry.slide, entry.item.title)}>{slideLabel(entry.slide, entry.item.title, { short: true })}</small>
                        </span>
                      </button>
                    </div>
                  )
                })}
                <button
                  className="slide-thumb-add"
                  onClick={() => activeItem && addBlankSlide(service.id, activeItem.id)}
                  disabled={!activeItem}
                >
                  <Plus size={20} />
                  {t('editor.addSlide')}
                </button>
                </div>
                <button
                  type="button"
                  className="slide-thumbs-arrow slide-thumbs-arrow-right"
                  onClick={() => scrollThumbs(1)}
                  disabled={!thumbScroll.right}
                  aria-label={t('editor.scrollRight')}
                  title={t('editor.scrollRight')}
                >
                  <ChevronRight size={20} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          </div>
          {layersOpen && activeSlide && (
            <div className="layers-drawer panel">
              <button
                className="icon-btn layers-close"
                onClick={() => setLayersOpen(false)}
                aria-label={t('common.close')}
              >
                <X size={14} />
              </button>
              <LayersPanel
                slide={activeSlide}
                selectedElementId={selectedElementId}
                onSelect={(id) => {
                  selectElement(id)
                  setLayersOpen(false)
                }}
                onToggleVisible={(element) => {
                  if (!activeItem) return
                  updateElement(service.id, activeItem.id, activeSlide.id, element.id, {
                    visible: !element.visible,
                  })
                }}
                onReorder={(id, action) => {
                  if (!activeItem) return
                  reorderElement(service.id, activeItem.id, activeSlide.id, id, action)
                }}
                onDuplicate={(id) => {
                  if (!activeItem) return
                  duplicateElement(service.id, activeItem.id, activeSlide.id, id)
                }}
                onDelete={(id) => {
                  if (!activeItem) return
                  removeElement(service.id, activeItem.id, activeSlide.id, id)
                  push(t('toast.elementDeleted'), 'success')
                }}
              />
            </div>
          )}
        </section>

        <aside className={`inspector panel ${mobileInspector ? 'is-drawer-open' : ''}`}>
          <div className="pane-grip" aria-label={t('editor.resizeInspector')} {...inspectorPane.gripProps} />
          <OutputStatusCard
            isLive={isLive}
            startedAt={live?.startedAt ?? null}
            outputName={audienceOutputName}
            problem={presentationProblem(service) ? t(`culto.problem.${presentationProblem(service)}`) : null}
            presentShortcut={presentShortcut}
            onPresent={() => { if (!isLive) goLive() }}
            onEnd={() => setEndOpen(true)}
            tools={
              <>
            <OutputFormatPicker
              value={projection.id}
              onChange={(id) => updateSettings({ outputFormat: id })}
              label={t('editor.slideFormat')}
              trigger={
                <>
                  <Monitor size={14} />
                  <span>
                    {resolutionLabel(projection)} <small className="workspace-aspect-ratio">{projection.ratio}</small>
                  </span>
                </>
              }
            />
            <button
              className="btn btn-secondary btn-sm inspector-edit-details-btn"
              onClick={() => setDetailsOpen(true)}
              title={t('culto.editDetails')}
              aria-label={t('culto.editDetails')}
            >
              <Pencil size={13} />
              <span className="inspector-edit-details-text">{t('common.edit')}</span>
            </button>
              </>
            }
          />
          {isLive && liveCurrentSlide && (
            <div className="inspector-output-preview">
              <SlideRenderer
                slide={
                  live?.blank
                    ? { ...liveCurrentSlide.slide, elements: [] }
                    : // A verse projected from Bible Mode is what the audience sees.
                      live?.scripture ?? liveCurrentSlide.slide
                }
                branding={branding}
                aspectRatio={slideAspectRatio}
                compact
                message={live?.message ?? undefined}
                messageVisible={Boolean(live?.messageVisible && live.message && !live.blank)}
              />
              {live?.frozen && !live.blank && (
                <span className="inspector-output-frozen"><Snowflake size={11} /></span>
              )}
            </div>
          )}
          {liveNotesOnly && liveCurrentSlide ? (
            <>
              <div className="inspector-head">
                <span className="eyebrow">{t('editor.notes')}</span>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setInspectorOpenForSession(live?.startedAt ?? null)}
                >
                  <SlidersHorizontal size={13} />
                  {t('editor.showInspector')}
                </button>
              </div>
              <div className="inspector-scroll live-notes">
                <p className="live-notes-slide">
                  <span className="live-notes-dot" aria-hidden="true" />
                  {slideLabel(liveCurrentSlide.slide, liveCurrentSlide.item.title)}
                </p>
                <textarea
                  className="live-notes-text"
                  aria-label={t('editor.notes')}
                  value={liveCurrentSlide.slide.notes ?? ''}
                  placeholder={t('editor.liveNotesEmpty')}
                  onChange={(event) =>
                    updateNotes(service.id, liveCurrentSlide.item.id, liveCurrentSlide.slide.id, event.target.value)
                  }
                />
                <p className="live-notes-hint">{t('editor.notesPlaceholder')}</p>
              </div>
            </>
          ) : (
          <>
          <div className="inspector-head">
            <span className="eyebrow">{t('editor.inspector')}</span>
            {isLive && (
              <button type="button" className="text-link inspector-fold" onClick={() => setInspectorOpenForSession(null)}>
                {t('editor.hideInspector')}
              </button>
            )}
            <div className="segmented segmented-sm">
              <button className={!selectedElement ? 'is-active' : ''} onClick={() => selectElement(null)} title={t('inspector.designHint')}>
                <Paintbrush size={13} />
                {t('editor.design')}
              </button>
              <button
                className={selectedElement ? 'is-active' : ''}
                disabled={!selectedElement}
                title={selectedElement ? t('inspector.elementHint') : t('rail.needsSelection')}
              >
                <MousePointer2 size={13} />
                {t('editor.element')}
              </button>
            </div>
          </div>

          <div className="inspector-scroll">
            {activeItem && activeSlide && selectedElement ? (
              <>
                <div className="element-type-row">
                  <span className="element-type-icon">
                    <ElementIcon type={selectedElement.type} />
                  </span>
                  <strong>{selectedElement.type}</strong>
                  <span className="badge badge-quiet">z {selectedElement.zIndex}</span>
                </div>
                <label className="field">
                  <FieldTitle icon={Type}>{t('editor.elementText')}</FieldTitle>
                  <textarea
                    rows={3}
                    value={
                      selectedElement.type === 'qr'
                        ? selectedElement.settings?.payload ?? selectedElement.text ?? ''
                        : selectedElement.text ?? ''
                    }
                    onChange={(event) => {
                      if (selectedElement.type === 'qr') {
                        updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, {
                          text: sanitizeText(event.target.value, 1200),
                          settings: {
                            ...selectedElement.settings,
                            payload: sanitizeText(event.target.value, 1200),
                          },
                        })
                      } else {
                        updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, {
                          text: sanitizeEditableText(event.target.value, 12000),
                        })
                      }
                    }}
                  />
                </label>
                <div className="field-grid">
                  {GEOMETRY_FIELDS.map(({ key, label, min, max }) => (
                    <label key={key} className="field compact">
                      <span>
                        {label.startsWith('editor.') ? t(label) : label}
                        <small className="field-unit">%</small>
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={min}
                        max={max}
                        step={1}
                        value={Math.round(selectedElement[key])}
                        onChange={(event) => {
                          const value = event.target.valueAsNumber
                          if (!Number.isFinite(value)) return
                          updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, {
                            [key]: Math.max(min, Math.min(max, value)),
                          })
                        }}
                      />
                    </label>
                  ))}
                </div>
                <label className="field">
                  <span>
                    {t('editor.opacity')} · {Math.round(selectedElement.opacity * 100)}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={selectedElement.opacity}
                    onChange={(event) =>
                      updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, {
                        opacity: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <ToggleRow
                  label={t('editor.visible')}
                  value={selectedElement.visible}
                  onChange={(value) =>
                    updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, {
                      visible: value,
                    })
                  }
                />
                {selectedElement.type === 'message' && (
                  <MessageBoxInspector
                    element={selectedElement}
                    fitScale={messageFit[selectedElement.id] ?? 1}
                    onChange={(patch) =>
                      updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, patch)
                    }
                  />
                )}
                {selectedElement.type === 'text' && (
                  <>
                    <label className="field compact">
                      <FieldTitle icon={CaseSensitive}>{t('editor.fontFamily')}</FieldTitle>
                      <select
                        value={selectedElement.settings?.fontFamily ?? SLIDE_TEXT_DEFAULTS.fontFamily}
                        onChange={(event) =>
                          updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, {
                            settings: {
                              ...selectedElement.settings,
                              fontFamily: event.target.value as 'serif' | 'sans',
                            },
                          })
                        }
                      >
                        <option value="serif">Serif (Noto Serif)</option>
                        <option value="sans">Sans (Inter)</option>
                      </select>
                    </label>
                    <div className="field-grid">
                      <label className="field compact">
                        <FieldTitle icon={ALargeSmall}>{t('editor.fontSize')}</FieldTitle>
                        <input
                          type="number"
                          min={8}
                          max={200}
                          value={selectedElement.settings?.fontSize ?? SLIDE_TEXT_DEFAULTS.fontSize}
                          onChange={(event) =>
                            updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, {
                              settings: {
                                ...selectedElement.settings,
                                fontSize: Number(event.target.value),
                              },
                            })
                          }
                        />
                      </label>
                      <label className="field compact">
                        <FieldTitle icon={Bold}>{t('editor.weight')}</FieldTitle>
                        <select
                          value={selectedElement.settings?.fontWeight ?? SLIDE_TEXT_DEFAULTS.fontWeight}
                          onChange={(event) =>
                            updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, {
                              settings: {
                                ...selectedElement.settings,
                                fontWeight: Number(event.target.value),
                              },
                            })
                          }
                        >
                          <option value={300}>300</option>
                          <option value={400}>400</option>
                          <option value={500}>500</option>
                          <option value={600}>600</option>
                          <option value={700}>700</option>
                          <option value={800}>800</option>
                        </select>
                      </label>
                    </div>
                    <div className="align-row">
                      {(['left', 'center', 'right'] as const).map((align) => (
                        <button
                          key={align}
                          className={`icon-toggle ${selectedElement.settings?.align === align ? 'is-active' : ''}`}
                          onClick={() =>
                            updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, {
                              settings: { ...selectedElement.settings, align },
                            })
                          }
                          aria-label={align}
                        >
                          {align === 'left' ? <AlignLeft size={15} /> : align === 'center' ? <AlignCenter size={15} /> : <AlignRight size={15} />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {selectedElement.type === 'shape' && (
                  <>
                    <div className="field-grid">
                      <label className="field compact">
                        <FieldTitle icon={Shapes}>{t('editor.shapeType')}</FieldTitle>
                        <select
                          value={
                            selectedElement.settings?.shape === 'circle'
                              ? 'circle'
                              : (selectedElement.settings?.radius ?? 0) > 0
                                ? 'rounded'
                                : 'rectangle'
                          }
                          onChange={(event) => {
                            const value = event.target.value
                            updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, {
                              settings: {
                                ...selectedElement.settings,
                                shape: value === 'circle' ? 'circle' : 'rect',
                                radius: value === 'rounded' ? 18 : 0,
                              },
                            })
                          }}
                        >
                          <option value="rectangle">{t('editor.rectangle')}</option>
                          <option value="rounded">{t('editor.rounded')}</option>
                          <option value="circle">{t('editor.circle')}</option>
                        </select>
                      </label>
                      <label className="field compact">
                        <FieldTitle icon={SquareRoundCorner}>{t('editor.cornerRadius')} · {selectedElement.settings?.radius ?? 0}px</FieldTitle>
                        <input
                          type="range"
                          min={0}
                          max={50}
                          value={selectedElement.settings?.radius ?? 0}
                          disabled={selectedElement.settings?.shape === 'circle'}
                          onChange={(event) =>
                            updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, {
                              settings: {
                                ...selectedElement.settings,
                                shape: 'rect',
                                radius: Number(event.target.value),
                              },
                            })
                          }
                        />
                      </label>
                    </div>
                    <label className="field">
                      <FieldTitle icon={Droplet}>{t('editor.color')}</FieldTitle>
                      <div className="shape-color-picker">
                        <input
                          type="color"
                          value={shapeColorValue(selectedElement.settings?.fill).hex}
                          onChange={(event) =>
                            updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, {
                              settings: {
                                ...selectedElement.settings,
                                fill: rgbaColor(
                                  event.target.value,
                                  shapeColorValue(selectedElement.settings?.fill).alpha,
                                ),
                              },
                            })
                          }
                          aria-label={t('editor.color')}
                        />
                        <code>{selectedElement.settings?.fill ?? 'rgba(232,164,74,0.22)'}</code>
                      </div>
                      <span className="field-hint">
                        {t('editor.opacity')} · {Math.round(shapeColorValue(selectedElement.settings?.fill).alpha * 100)}%
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={shapeColorValue(selectedElement.settings?.fill).alpha}
                        onChange={(event) =>
                          updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, {
                            settings: {
                              ...selectedElement.settings,
                              fill: rgbaColor(
                                shapeColorValue(selectedElement.settings?.fill).hex,
                                Number(event.target.value),
                              ),
                            },
                          })
                        }
                        aria-label={t('editor.opacity')}
                      />
                    </label>
                  </>
                )}
                <div className="field">
                  <FieldTitle icon={Move}>{t('editor.boxPosition')}</FieldTitle>
                  <TextPositionGrid
                    align={boxPlacement(selectedElement).align}
                    vertical={boxPlacement(selectedElement).vertical}
                    label={t('editor.boxPosition')}
                    onChange={(align, vertical) => placeSelected(align, vertical)}
                  />
                </div>
                {(selectedElement.type === 'image' || selectedElement.type === 'video') && (
                  <>
                    <div className="field-grid">
                      <label className="field compact">
                        <FieldTitle icon={Crop}>{t('editor.crop')}</FieldTitle>
                        <select
                          value={selectedElement.settings?.fit ?? (selectedElement.type === 'image' ? 'cover' : 'contain')}
                          onChange={(event) =>
                            updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, {
                              settings: {
                                ...selectedElement.settings,
                                fit: event.target.value as 'cover' | 'contain',
                              },
                            })
                          }
                        >
                          <option value="cover">{t('editor.fitCover')}</option>
                          <option value="contain">{t('editor.fitContain')}</option>
                        </select>
                      </label>
                      <label className="field compact">
                        <FieldTitle icon={ZoomIn}>{t('editor.zoom')}</FieldTitle>
                        <input
                          type="number"
                          min={1}
                          max={3}
                          step={0.05}
                          value={selectedElement.settings?.cropZoom ?? 1}
                          onChange={(event) =>
                            updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, {
                              settings: {
                                ...selectedElement.settings,
                                cropZoom: Math.max(1, Math.min(3, Number(event.target.value))),
                              },
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="field-grid">
                      <label className="field compact">
                        <span>X · {Math.round(selectedElement.settings?.cropX ?? 50)}%</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={selectedElement.settings?.cropX ?? 50}
                          onChange={(event) =>
                            updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, {
                              settings: { ...selectedElement.settings, cropX: Number(event.target.value) },
                            })
                          }
                        />
                      </label>
                      <label className="field compact">
                        <span>Y · {Math.round(selectedElement.settings?.cropY ?? 50)}%</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={selectedElement.settings?.cropY ?? 50}
                          onChange={(event) =>
                            updateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, {
                              settings: { ...selectedElement.settings, cropY: Number(event.target.value) },
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="inline-note">
                      {selectedElement.settings?.providerLabel ?? t('media.localOnly')}
                      {selectedElement.settings?.status ? ` · ${selectedElement.settings.status}` : ''}
                    </div>
                  </>
                )}
                {selectedElement.type === 'qr' && (
                  <div className="inline-note">
                    {selectedElement.settings?.variant ?? 'text'} · {(selectedElement.settings?.payload ?? selectedElement.text ?? '').length} chars
                  </div>
                )}
                {selectedElement.type === 'embed' && (
                  <div className="inline-note">
                    {selectedElement.settings?.providerLabel ?? t('editor.youtubeProvider')}
                  </div>
                )}
                <div className="layer-buttons">
                  <button className="btn btn-ghost btn-sm" onClick={() => reorderElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, 'front')}>
                    <Layers size={13} />
                    {t('editor.bringFront')}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => reorderElement(service.id, activeItem.id, activeSlide.id, selectedElement.id, 'back')}>
                    {t('editor.sendBack')}
                  </button>
                </div>
                <div className="inspector-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => duplicateElement(service.id, activeItem.id, activeSlide.id, selectedElement.id)}
                  >
                    <Copy size={14} />
                    {t('editor.duplicateElement')}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm danger-text"
                    onClick={() => {
                      removeElement(service.id, activeItem.id, activeSlide.id, selectedElement.id)
                      push(t('toast.elementDeleted'), 'success')
                    }}
                  >
                    <Trash2 size={14} />
                    {t('editor.deleteElement')}
                  </button>
                </div>
              </>
            ) : activeItem && activeSlide ? (
              <>
                {overflow && <div className="inline-warning">{t('editor.overflowWarning')}</div>}
                <p className="item-origin">
                  <span className="badge badge-quiet">{t(`culto.origin.${itemOrigin(activeItem)}`)}</span>
                  <span>{t(`culto.originNote.${itemOrigin(activeItem) === 'here' ? 'here' : 'copy'}`)}</span>
                </p>
                <InspectorGroupList dragHint={t('rundown.dragHint')} moveUpLabel={t('common.moveUp')} moveDownLabel={t('common.moveDown')}>
                <InspectorGroup id="content" icon={FileText} title={t('inspector.content')}>
                {activeSlide.bible ? (
                  <>
                    <div className="inspector-label">
                      <FieldTitle icon={BookOpen}>{t('editor.scriptureContent')}</FieldTitle>
                      <span className="badge badge-amber">{activeSlide.bible.primary.abbreviation}</span>
                    </div>
                    <label className="field">
                      <FieldTitle icon={BookOpenText}>{t('editor.primaryText')}</FieldTitle>
                      <textarea
                        rows={5}
                        value={activeSlide.bible.primary.text}
                        onChange={(event) => commitBibleText('primary', event.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>
                        {t('editor.reference')} · {activeSlide.bible.primary.abbreviation}
                      </span>
                      <input
                        value={activeSlide.bible.primary.reference}
                        onChange={(event) =>
                          updateSlide(service.id, activeItem.id, activeSlide.id, {
                            bible: {
                              ...activeSlide.bible!,
                              primary: {
                                ...activeSlide.bible!.primary,
                                reference: event.target.value,
                              },
                            },
                          })
                        }
                      />
                    </label>
                    {activeSlide.bible.secondary && (
                      <>
                        <label className="field">
                          <span>
                            {t('editor.secondaryText')} · {activeSlide.bible.secondary.abbreviation}
                          </span>
                          <textarea
                            rows={4}
                            value={activeSlide.bible.secondary.text}
                            onChange={(event) => commitBibleText('secondary', event.target.value)}
                          />
                        </label>
                        <label className="field">
                          <span>
                            {t('editor.reference')} · {activeSlide.bible.secondary.abbreviation}
                          </span>
                          <input
                            value={activeSlide.bible.secondary.reference}
                            onChange={(event) =>
                              updateSlide(service.id, activeItem.id, activeSlide.id, {
                                bible: {
                                  ...activeSlide.bible!,
                                  secondary: {
                                    ...activeSlide.bible!.secondary!,
                                    reference: event.target.value,
                                  },
                                },
                              })
                            }
                          />
                        </label>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <label className="field">
                      <FieldTitle icon={Heading}>{t('common.title')}</FieldTitle>
                      <input
                        value={activeItem.title}
                        onChange={(event) =>
                          updateItemTitle(service.id, activeItem.id, event.target.value)
                        }
                      />
                    </label>
                    <label className="field">
                      <FieldTitle icon={RectangleHorizontal}>{t('editor.slideField')}</FieldTitle>
                      <input
                        value={activeSlide.title}
                        onChange={(event) =>
                          updateSlide(service.id, activeItem.id, activeSlide.id, {
                            title: event.target.value,
                          })
                        }
                      />
                    </label>
                    {activeSlide.kind === 'timer' ? (
                      <div className="inspector-timer">
                        <TimerDurationField
                          value={activeSlide.timer?.durationSeconds ?? 0}
                          onChange={(seconds) =>
                            updateSlide(service.id, activeItem.id, activeSlide.id, {
                              timer: { durationSeconds: seconds },
                            })
                          }
                        />
                        <TimerControls slide={activeSlide} />
                        <p className="timer-note">{t('timer.sessionNote')}</p>
                      </div>
                    ) : (
                      <label className="field">
                        <FieldTitle icon={Type}>{t('editor.textField')}</FieldTitle>
                        <textarea
                          rows={6}
                          value={activeSlide.text}
                          onChange={(event) =>
                            updateSlide(service.id, activeItem.id, activeSlide.id, {
                              text: event.target.value,
                            })
                          }
                        />
                      </label>
                    )}
                  </>
                )}
                </InspectorGroup>
                <InspectorGroup id="text" icon={Type} title={t('inspector.typography')}>
                <div className="field">
                  <FieldTitle icon={Move}>{t('editor.boxPosition')}</FieldTitle>
                  <TextPositionGrid
                    align={activeSlide.textAlign}
                    vertical={activeSlide.textVerticalAlign ?? 'middle'}
                    label={t('editor.boxPosition')}
                    onChange={(textAlign, textVerticalAlign) =>
                      updateSlide(service.id, activeItem.id, activeSlide.id, { textAlign, textVerticalAlign })
                    }
                  />
                </div>
                {activeSlide.kind !== 'timer' && (
                  <>
                    <label className="field compact">
                      <FieldTitle icon={CaseSensitive}>{t('editor.fontFamily')}</FieldTitle>
                      <select
                        value={activeSlide.fontFamily ?? SLIDE_TEXT_DEFAULTS.fontFamily}
                        onChange={(event) => {
                          const patch = { fontFamily: event.target.value as 'serif' | 'sans' }
                          updateSlide(service.id, activeItem.id, activeSlide.id, patch)
                          if (activeItem.slides.length > 1) setFontApplyAll({ itemId: activeItem.id, patch })
                        }}
                      >
                        <option value="serif">Serif (Noto Serif)</option>
                        <option value="sans">Sans (Inter)</option>
                      </select>
                    </label>
                    <div className="field-grid">
                      <label className="field compact">
                        <FieldTitle icon={ALargeSmall}>{t('editor.fontSize')}</FieldTitle>
                        <input
                          type="number"
                          min={16}
                          max={200}
                          value={activeSlide.fontSize ?? SLIDE_TEXT_DEFAULTS.fontSize}
                          onChange={(event) => {
                            const patch = { fontSize: Number(event.target.value) }
                            updateSlide(service.id, activeItem.id, activeSlide.id, patch)
                            if (activeItem.slides.length > 1) setFontApplyAll({ itemId: activeItem.id, patch })
                          }}
                        />
                      </label>
                      <label className="field compact">
                        <FieldTitle icon={Bold}>{t('editor.fontWeight')}</FieldTitle>
                        <input
                          type="number"
                          min={100}
                          max={900}
                          step={100}
                          value={activeSlide.fontWeight ?? SLIDE_TEXT_DEFAULTS.fontWeight}
                          onChange={(event) => {
                            const patch = { fontWeight: Number(event.target.value) }
                            updateSlide(service.id, activeItem.id, activeSlide.id, patch)
                            if (activeItem.slides.length > 1) setFontApplyAll({ itemId: activeItem.id, patch })
                          }}
                        />
                      </label>
                    </div>
                  </>
                )}
                </InspectorGroup>
                <InspectorGroup id="background" icon={Palette} title={t('editor.background')} meta={activeSlide.background.preset}>
                <div className="preset-grid">
                  {BACKGROUND_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      className={`preset-swatch bg-${preset.id} ${activeSlide.background.preset === preset.id ? 'is-active' : ''}`}
                      onClick={() =>
                        setSlideBackground(service.id, activeItem.id, activeSlide.id, {
                          type: 'preset',
                          preset: preset.id,
                          tone: preset.tone,
                        })
                      }
                      aria-label={t(preset.nameKey)}
                    >
                      <span />
                    </button>
                  ))}
                </div>
                </InspectorGroup>
                <InspectorGroup
                  id="transition"
                  icon={Clapperboard}
                  title={t('editor.transition')}
                  meta={activeSlide.transition ? `${(activeSlide.transition.durationMs / 1000).toFixed(1)} s` : t('editor.transitionDefault')}
                >
                {(() => {
                  const current = activeSlide.transition ?? service.transition ?? DEFAULT_TRANSITION
                  const icons = { fade: Blend, cut: Scissors, slide: MoveRight, zoom: ZoomIn }
                  return (
                    <div className="transition-picker" role="radiogroup" aria-label={t('editor.transition')}>
                      {TRANSITION_TYPES.map((type) => {
                        const Icon = icons[type]
                        return (
                          <button
                            key={type}
                            type="button"
                            role="radio"
                            aria-checked={current.type === type}
                            className={`transition-option ${current.type === type ? 'is-active' : ''}`}
                            onClick={() => setTransitionChoice({ type, durationMs: current.durationMs || DEFAULT_TRANSITION.durationMs })}
                          >
                            <Icon size={18} />
                            <span>{t(`culto.transitionName.${type}`)}</span>
                          </button>
                        )
                      })}
                    </div>
                  )
                })()}
                </InspectorGroup>
                <InspectorGroup id="notes" icon={StickyNote} title={t('editor.notes')}>
                <label className="field">
                  <textarea
                    rows={4}
                    aria-label={t('editor.notes')}
                    value={activeSlide.notes ?? ''}
                    placeholder={t('editor.notesPlaceholder')}
                    onChange={(event) =>
                      updateNotes(service.id, activeItem.id, activeSlide.id, event.target.value)
                    }
                  />
                </label>
                </InspectorGroup>
                </InspectorGroupList>
                <div className="inspector-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => duplicateSlide(service.id, activeItem.id, activeSlide.id)}
                  >
                    <Copy size={14} />
                    {t('editor.duplicate')}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm danger-text"
                    onClick={() =>
                      setConfirm({ kind: 'slide', itemId: activeItem.id, slideId: activeSlide.id })
                    }
                  >
                    <Trash2 size={14} />
                    {t('editor.delete')}
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-inline">
                <Layers size={25} />
                <p>{t('editor.noSelection')}</p>
              </div>
            )}
          </div>
          </>
          )}
          {isLive && <LiveControlBar />}
        </aside>
      </div>

      <AddContentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        serviceId={service.id}
        sectionId={sectionForAdd || service.sections[0]?.id || ''}
      />

      <EditorMediaDialog
        open={mediaDialog.open}
        mode={mediaDialog.mode}
        onClose={() => setMediaDialog((value) => ({ ...value, open: false }))}
        onInsert={addMedia}
      />

      <QrComposer open={qrOpen} onClose={() => setQrOpen(false)} onInsert={addQrPayload} />

      {activeItem && (
        <EditorBackgroundDialog
          open={backgroundOpen}
          slide={activeSlide}
          serviceId={service.id}
          itemId={activeItem.id}
          onClose={() => setBackgroundOpen(false)}
        />
      )}

      <TemplatePickerDialog
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onPick={(template) => {
          const sectionId =
            service.sections.find((section) => activeItem && section.itemIds.includes(activeItem.id))?.id ??
            activeSection?.id ??
            service.sections[0]?.id ??
            ''
          const item = createTemplateItem(template, template.name)
          addItem(service.id, sectionId, item)
          if (activeItem) moveItemNextTo(service.id, item.id, activeItem.id, 'after')
          push(t('templates.added'), 'success')
        }}
      />

      <LogoPlacementDialog
        open={logoPlacementOpen}
        logoUrl={branding.logoUrl}
        onClose={() => setLogoPlacementOpen(false)}
        onSelect={addLogoToSlide}
        onUpload={uploadLogo}
      />

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm?.kind === 'item' || confirm?.kind === 'slide'
            ? t('confirm.deleteSlide')
            : t('editor.deleteSection')
        }
        copy={confirm?.kind === 'section' ? t('settings.clearConfirm') : t('confirm.deleteSlideCopy')}
        confirmLabel={t('common.delete')}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return
          if (confirm.kind === 'slide') {
            deleteSlide(service.id, confirm.itemId, confirm.slideId)
            push(t('toast.slideDeleted'), 'success')
          }
          if (confirm.kind === 'item') {
            removeItem(service.id, confirm.itemId)
            push(t('toast.serviceDeleted'), 'success')
          }
          if (confirm.kind === 'section') {
            deleteSection(service.id, confirm.sectionId)
            push(t('toast.sectionDeleted'), 'success')
          }
        }}
      />

      <ConfirmDialog
        open={endOpen}
        title={t('live.confirmEnd')}
        copy={t('live.confirmEndCopy')}
        confirmLabel={t('live.endLive')}
        onClose={() => setEndOpen(false)}
        onConfirm={confirmEndLive}
      />

      {transitionChoice && service && activeItem && activeSlide && (
        <Modal
          title={t('editor.transitionApplyTitle', { name: t(`culto.transitionName.${transitionChoice.type}`) })}
          onClose={() => setTransitionChoice(null)}
        >
          <p className="modal-copy">{t('editor.transitionApplyCopy')}</p>
          {transitionChoice.type !== 'cut' && (
            <label className="field">
              <span>{t('culto.transitionDuration')}</span>
              <select
                value={transitionChoice.durationMs}
                onChange={(event) => setTransitionChoice({ ...transitionChoice, durationMs: Number(event.target.value) })}
              >
                {[200, 400, 600, 900, 1200, 2000].map((ms) => (
                  <option key={ms} value={ms}>
                    {(ms / 1000).toFixed(1)} s
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="modal-actions">
            <button
              className="btn btn-secondary"
              onClick={() => {
                updateSlide(service.id, activeItem.id, activeSlide.id, { transition: transitionChoice })
                setTransitionChoice(null)
              }}
            >
              {t('editor.transitionThisSlide')}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                for (const item of service.items) {
                  for (const slide of item.slides) {
                    updateSlide(service.id, item.id, slide.id, { transition: transitionChoice })
                  }
                }
                setTransitionChoice(null)
                push(t('editor.transitionAppliedAll', { count: allSlides.length }), 'success')
              }}
            >
              {t('editor.transitionAllSlides', { count: allSlides.length })}
            </button>
          </div>
        </Modal>
      )}
      {fontApplyAll && (
        <Modal title={t('editor.fontApplyAll')} onClose={() => setFontApplyAll(null)}>
          <p className="modal-copy">{t('editor.fontApplyAllCopy')}</p>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setFontApplyAll(null)}>
              {t('editor.fontThisSlide')}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!service) return
                const item = service.items.find((i) => i.id === fontApplyAll.itemId)
                if (item) {
                  for (const slide of item.slides) {
                    updateSlide(service.id, item.id, slide.id, fontApplyAll.patch)
                  }
                }
                setFontApplyAll(null)
              }}
            >
              {t('editor.fontAllSlides')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/** A field title with a small icon, so each inspector section is quick to find. */
function FieldTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="field-title">
      <Icon size={13} aria-hidden="true" />
      <span>{children}</span>
    </span>
  )
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="switch-row">
      <span>{label}</span>
      <button
        className={`switch ${value ? 'is-on' : ''}`}
        onClick={() => onChange(!value)}
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
      >
        <span />
      </button>
    </div>
  )
}
