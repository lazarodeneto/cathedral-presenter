export const LOCALES = ['en', 'pt', 'pt-BR', 'es', 'fr', 'de', 'it'] as const
export type Locale = (typeof LOCALES)[number]

export type TextAlign = 'left' | 'center' | 'right'
export type SlideKind =
  | 'title'
  | 'body'
  | 'lyrics'
  | 'scripture'
  | 'announcement'
  | 'sermon'
  | 'media'
  | 'blank'
  | 'timer'

export type ContentType = 'song' | 'bible' | 'announcement' | 'sermon' | 'blank' | 'media' | 'timer'
export type ProviderAvailability = 'bundled' | 'online-only'
export type ProviderCachePolicy = 'bundled' | 'metadata-only' | 'provider-permitted'

export interface ProviderSecurityProfile {
  auth: 'none' | 'oauth'
  oauthScopes: string[]
  tokenStorage: 'none' | 'desktop-credential-store'
  cachePolicy: ProviderCachePolicy
}

export type BackgroundPreset =
  | 'aurora'
  | 'golden'
  | 'graphite'
  | 'copper'
  | 'ivory'
  | 'violet'
  | 'dawn'
  | 'linen'
  | 'ocean'
  | 'emerald'
  | 'sunset'
  | 'nebula'
  | 'midnight'
  | 'crimson'
  | 'mesh'
  | 'spotlight'
  | 'lagoon'
  | 'royal'
  | 'sky'
  | 'blush'
  | 'flow'
  | 'ember'
  | 'tide'
  | 'stars'
  | 'rays'
  | 'breathe'

export type ElementType = 'text' | 'image' | 'video' | 'shape' | 'qr' | 'embed' | 'message'

export type TextElementSettings = {
  fontSize?: number
  fontWeight?: number
  fontFamily?: 'serif' | 'sans'
  color?: string
  align?: TextAlign
  lineHeight?: number
  letterSpacing?: number
  textShadow?: boolean
  uppercase?: boolean
}

export type MediaElementSettings = {
  fit?: 'cover' | 'contain'
  objectPosition?: string
  radius?: number
  cropX?: number
  cropY?: number
  cropZoom?: number
  border?: boolean
  provider?: MediaAssetProvider
  providerLabel?: string
  youtubeId?: string
  localOnly?: boolean
  missing?: boolean
  /** Video placeholder from a template: invisible on outputs until a video fills it. */
  videoSlot?: boolean
  /** Gentle looping motion for decorative elements. */
  motion?: 'pulse' | 'float' | 'spin' | 'drift' | 'sway'
  onlineOnly?: boolean
  status?: MediaStatus
}

export type ShapeElementSettings = {
  shape?: 'rect' | 'line' | 'circle'
  fill?: string
  radius?: number
}

export type QRElementSettings = {
  payload?: string
  variant?: 'url' | 'text' | 'event' | 'contact'
  quietZone?: number
  foreground?: string
  background?: string
}

export type MessageBorderStyle = 'solid' | 'dashed' | 'dotted' | 'none'
export type MessageFontFamily = 'sans' | 'serif'
export type MessagePosition =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'center'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right'

/**
 * Message box style. Sizes are in slide pixels at a 1280-wide reference and
 * scale with the canvas, so editor, preview and projector render identically.
 */
export interface MessageBoxStyle {
  textColor: string
  backgroundColor: string
  /** 0–1 */
  backgroundOpacity: number
  borderEnabled: boolean
  borderStyle: MessageBorderStyle
  borderColor: string
  borderWidth: number
  borderRadius: number
  fontFamily: MessageFontFamily
  fontSize: number
  fontWeight: number
  lineHeight: number
  align: TextAlign
}

export type SlideElementSettings = TextElementSettings &
  MediaElementSettings &
  ShapeElementSettings &
  QRElementSettings & {
    /** Message box elements only. */
    message?: MessageBoxStyle
  }

export interface SlideElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  opacity: number
  visible: boolean
  text?: string
  source?: string
  settings?: SlideElementSettings
}

export interface SlideBackground {
  type: 'preset' | 'image'
  preset?: BackgroundPreset
  source?: string
  overlay?: number
  backgroundPosition?: string
  backgroundZoom?: number
  tone?: 'dark' | 'light'
}

export interface ScriptureBlock {
  translationId: string
  translationName: string
  abbreviation: string
  language: Locale
  reference: string
  text: string
  licenseType: string
  copyrightNotice?: string
  sourceUrl?: string
}

export interface Slide {
  id: string
  kind: SlideKind
  title: string
  text: string
  reference?: string
  translationId?: string
  bible?: {
    primary: ScriptureBlock
    secondary?: ScriptureBlock
  }
  elements: SlideElement[]
  background: SlideBackground
  textAlign: TextAlign
  textVerticalAlign?: 'top' | 'middle' | 'bottom'
  fontFamily?: 'serif' | 'sans'
  fontSize?: number
  fontWeight?: number
  /**
   * Stacking order of the slide's own text (lyrics, Scripture, title or body)
   * among its elements, on the same scale as element zIndex. Unset means 2.
   */
  contentZ?: number
  notes?: string
  /** Overrides the service's default transition into this slide. */
  transition?: SlideTransition
  /** Timer slides only: configured countdown. Runtime state lives in TimerRuntime. */
  timer?: TimerConfig
}

export interface TimerConfig {
  /** 0–3600 (0 to 60 minutes). 0 completes immediately on start. */
  durationSeconds: number
}

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed'

/**
 * Live countdown state for one timer slide. Time is stored as wall-clock
 * timestamps, not as a ticking counter, so every view (editor, live, output
 * windows) computes the same remaining time and nothing drifts when a view
 * re-renders slowly or is hidden.
 */
export interface TimerRuntime {
  status: TimerStatus
  durationMs: number
  /** Remaining time when idle or paused; 0 when completed. */
  remainingMs: number
  /** Epoch ms when a running countdown reaches zero; null unless running. */
  endsAt: number | null
}

export interface SlideItemMetadata {
  provider?: string
  sourceLabel?: string
  license?: string
  author?: string
  songKey?: string
  sourceId?: string
}

export interface SlideItem {
  id: string
  type: ContentType
  title: string
  slides: Slide[]
  metadata?: SlideItemMetadata
}

export interface ServiceSection {
  id: string
  title: string
  itemIds: string[]
}

export type ServiceStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'archived'
export type TransitionType = 'fade' | 'cut' | 'slide' | 'zoom'

export interface SlideTransition {
  type: TransitionType
  /** 0–3000 ms; ignored for "cut". */
  durationMs: number
}

/**
 * A culto (church service). Dates and times are wall-clock values in the
 * church's local time on this computer: "2026-11-01" and "10:00".
 */
export interface Service {
  id: string
  /** The church this service belongs to; other churches' services are never shown or changed. */
  churchId: string
  title: string
  date: string
  /** Start time, HH:MM. */
  time: string
  /** End time, HH:MM, after the start time. Optional. */
  endTime?: string
  eventType?: string
  status: ServiceStatus
  /** Status to return to when an archived service is restored. */
  statusBeforeArchive?: Exclude<ServiceStatus, 'archived'>
  leader?: string
  pastor?: string
  worship?: string
  guests?: string
  description?: string
  notes?: string
  /** Default transition between slides; a slide may override it. */
  transition?: SlideTransition
  duplicatedFromId?: string
  spotifyUrl?: string
  sections: ServiceSection[]
  items: SlideItem[]
  createdAt: string
  updatedAt: string
  /** Increases on every change; edit forms use it to detect changes made elsewhere. */
  version: number
}

export interface FlatSlide {
  slide: Slide
  item: SlideItem
  section: ServiceSection
  index: number
}

export type MonitorRole = 'audience' | 'confidence' | 'broadcast' | 'disabled'
export type MonitorStatus = 'ready' | 'connecting' | 'disconnected' | 'test' | 'unsupported'

export interface Monitor {
  /** Operating-system display identifier; absent on browser preview windows. */
  displayId?: string
  isOperator?: boolean
  primary?: boolean
  outputOpen?: boolean
  id: string
  name: string
  displayName: string
  role: MonitorRole
  status: MonitorStatus
  width: number
  height: number
  fullscreen: boolean
  simulated: boolean
}

export type MediaKind = 'image' | 'video'
export type MediaStatus = 'ready' | 'loading' | 'missing' | 'unsupported' | 'offline'
export type MediaAssetProvider = 'upload' | 'url' | 'youtube'

export interface MediaAsset {
  id: string
  name: string
  kind: MediaKind
  mime: string
  size: number
  source: string
  status: MediaStatus
  addedAt: string
  tags?: string[]
  localOnly?: boolean
  provider: MediaAssetProvider
}

export interface BibleTranslation {
  id: string
  providerId: string
  name: string
  abbreviation: string
  language: Locale
  licenseType: 'public-domain' | 'cc0' | 'cc-by' | 'provider' | 'church-import'
  licenseText: string
  sourceUrl?: string
  copyrightNotice: string
  bundled: boolean
  sample: boolean
  verseCount: number
  availability: ProviderAvailability
  /** Publication year (Ano), when known. */
  year?: number
  /** Publisher (Editora), when known. */
  publisher?: string
}

/** Imported Scripture text keyed by book, chapter, and verse. */
export type BibleBookTexts = Record<string, Record<number, Record<number, string>>>

export interface CustomBibleTranslation {
  translation: BibleTranslation
  books: BibleBookTexts
}

export interface BibleBookChapter {
  number: number
  firstVerse: number
  lastVerse: number
}

export interface BibleBookCatalogEntry {
  id: string
  name: string
  chapters: BibleBookChapter[]
}

export interface BibleVerse {
  translationId: string
  bookId: string
  bookName: string
  chapter: number
  verse: number
  text: string
}

export interface BiblePassage {
  id: string
  translationId: string
  translationName: string
  translationAbbreviation: string
  language: Locale
  bookId: string
  bookName: string
  startChapter: number
  startVerse: number
  endChapter: number
  endVerse: number
  reference: string
  verses: BibleVerse[]
  licenseType: string
  copyrightNotice: string
  sourceUrl?: string
}

export interface BibleSearchResult {
  passages: BiblePassage[]
  mode: 'reference' | 'keyword'
  message?: string
  messageKey?: string
}

export type SongTag =
  | 'adoration'
  | 'assurance'
  | 'communion'
  | 'grace'
  | 'prayer'
  | 'worship'

export interface Song {
  id: string
  title: string
  author: string
  year?: string
  key: string
  language: Locale
  tags: SongTag[]
  license: string
  sourceLabel: string
  stanzas: string[]
  ccli?: string
}

export interface SongSearchFilters {
  query: string
  language: Locale | 'all'
  tags: SongTag[]
}

export interface SongFacets {
  languages: Locale[]
  tags: SongTag[]
}

export interface SongSearchResult {
  songs: Song[]
  message?: string
  messageKey?: string
}

export interface LibrarySong {
  id: string
  title: string
  lyrics: string
  author?: string
  language?: Locale
  category?: string
  tags?: string[]
  key?: string
  notes?: string
  copyright?: string
  createdAt: string
  updatedAt: string
}

export interface SlideTemplate {
  id: string
  name: string
  description: string
  category: string
  kind: SlideKind
  background: BackgroundPreset
  text: string
  textAlign: TextAlign
  elementPreset?:
    | 'image-right'
    | 'centered'
    | 'two-column'
    | 'lower-third'
    | 'cross'
    | 'quote-bar'
    | 'frame'
    | 'band'
    | 'halo'
    | 'tag'
    | 'split'
    | 'underline'
    | 'glass'
    | 'diagonal'
    | 'ring'
    | 'corners'
    | 'glow'
    | 'video'
    | 'art-water'
    | 'art-night'
    | 'art-dove'
    | 'art-calvary'
    | 'art-kneeling'
    | 'art-worship'
  /** Small label drawn by presets that carry one (tag, band, split, quote-bar reference). */
  label?: string
  /** Accent colour (any CSS colour) for the preset's lines, panels and glows. Gold by default. */
  accent?: string
  /** Gentle looping motion applied to the preset's decorative shapes. */
  motion?: 'pulse' | 'float' | 'spin' | 'drift' | 'sway'
  fontFamily?: 'serif' | 'sans'
  fontSize?: number
  fontWeight?: number
  textVerticalAlign?: 'top' | 'middle' | 'bottom'
}

export interface BrandingTheme {
  /** Action colour: primary buttons, icons, links, focus rings (#rrggbb). */
  primary: string
  /** Selection colour: active navigation, selected items (#rrggbb). */
  accent: string
  /** App background; null keeps the default Sanctuary Dark (#rrggbb). */
  background: string | null
}

export interface Branding {
  /** Church name shown in the sidebar, slides, and output screens. */
  name: string
  /** Application title shown in the header and browser tab. */
  appTitle: string
  /** Validated raster data URL (SVG uploads are converted to PNG), or null. */
  logoUrl: string | null
  /** Use the logo as the browser tab icon when one is set. */
  logoAsFavicon: boolean
  theme: BrandingTheme
}

export interface AppSettings {
  locale: Locale
  /** Sunday-first weekday index to softly emphasize in the service calendar, or null. */
  highlightWeekday?: number | null
  defaultTranslationId: string
  secondaryTranslationId: string
  reducedTransparency: boolean
  /** Tint strength of the chrome glass (toolbar, sidebar, inspector), 0.55 to 1. 1 is opaque. */
  glassOpacity?: number
  reducedMotion: boolean
  shortcutsEnabled: boolean
  /** Customized keyboard shortcuts by action id; [] disables one. Missing ids use defaults. */
  shortcutOverrides: Record<string, string[]>
  transition: 'fade' | 'cut' | 'slide' | 'zoom'
  transitionDuration: number
  lastBackupAt: string | null
  showSetupChecklist: boolean
  defaultSectionTitle: string
  /** Editor canvas: draw the alignment grid. */
  showGrid?: boolean
  /** Editor canvas: snap elements to the canvas, other elements and the grid. On when missing. */
  snapToObjects?: boolean
  /** Projection format (resolution and proportion) for the editor canvas and the audience output. */
  outputFormat?: import('./utils/outputFormats').OutputFormatId
  /** Left menu: true shows icons only, false keeps labels; missing follows the screen width. */
  sidebarCollapsed?: boolean
  /** Format of the broadcast window captured by OBS or a streaming tool. */
  broadcastFormat?: import('./utils/outputFormats').OutputFormatId
}

export interface LiveSession {
  isLive: true
  serviceId: string
  currentSlideId: string
  history: string[]
  startedAt: string
  blank: boolean
  /** The output is black while waiting for content after changing presenter modes. */
  modeTransitionPending?: boolean
  frozen: boolean
  frozenSlideId: string | null
  message: string | null
  messageVisible: boolean
  /**
   * A verse projected from Bible Mode, outside the service's slides. It is on
   * the audience screen until the operator moves to a service slide again.
   */
  scripture?: Slide | null
  /** The Bible Mode verse that was on screen when Freeze was pressed. */
  frozenScripture?: Slide | null
}

export interface Toast {
  id: string
  message: string
  tone: 'info' | 'success' | 'error'
}

export interface AudienceOutputState {
  mode: 'idle' | 'live' | 'blank' | 'test' | 'ended'
  slide: Slide | null
  message: string | null
  messageVisible: boolean
  branding: Branding
  monitorName: string
  testMonitorName?: string
  isFrozen?: boolean
  /** How the audience screen moves into `slide`: the slide's own transition, else the service default. */
  transition?: SlideTransition
  /** Projection format chosen in the editor or Settings; the output letterboxes to it. */
  format?: import('./utils/outputFormats').OutputFormatId
  updatedAt: string
}

export interface ConfidenceOutputState {
  mode: 'idle' | 'live' | 'test' | 'ended'
  current: Slide | null
  next: Slide | null
  notes: string | null
  itemTitle: string | null
  sectionTitle: string | null
  position: string | null
  branding: Branding
  startedAt: string | null
  monitorName: string
  testMonitorName?: string
  updatedAt: string
}

export interface ServiceBackup {
  app: 'church-presenter'
  version: 1
  exportedAt: string
  services: Service[]
  settings: AppSettings
  branding: Branding
  monitors: Monitor[]
  media: Omit<MediaAsset, 'source'>[]
  lastBackupAt?: string | null
}

export interface AddBibleOptions {
  sectionId: string
  primaryTranslationId: string
  secondaryTranslationId?: string
  format: 'verse' | 'multi' | 'single'
  bilingual: boolean
  versesPerSlide?: number
  passage: BiblePassage
  secondaryPassage?: BiblePassage
}

export interface AddSongOptions {
  sectionId: string
  song: Song
}

export interface NewServiceInput {
  title: string
  date: string
  time: string
  endTime?: string
  eventType?: string
  status?: 'draft' | 'scheduled'
  leader?: string
  pastor?: string
  worship?: string
  guests?: string
  description?: string
  notes?: string
}
