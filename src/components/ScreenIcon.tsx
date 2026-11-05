import {
  BookOpen,
  BookOpenText,
  CalendarDays,
  House,
  Image as ImageIcon,
  LayoutTemplate,
  ListChecks,
  Music4,
  Settings,
} from 'lucide-react'

export type ScreenTone = 'blue' | 'indigo' | 'violet' | 'rose' | 'amber' | 'orange' | 'cyan' | 'wash'

/**
 * One icon and category tone per screen, shared by the sidebar and each
 * screen's heading so a section looks the same everywhere (DESIGN.md →
 * Category tones).
 */
export const SCREEN_META = {
  home: { icon: House, tone: 'blue' },
  services: { icon: ListChecks, tone: 'indigo' },
  calendar: { icon: CalendarDays, tone: 'orange' },
  bible: { icon: BookOpen, tone: 'amber' },
  biblemode: { icon: BookOpenText, tone: 'amber' },
  songs: { icon: Music4, tone: 'rose' },
  media: { icon: ImageIcon, tone: 'cyan' },
  templates: { icon: LayoutTemplate, tone: 'violet' },
  settings: { icon: Settings, tone: 'wash' },
} as const satisfies Record<string, { icon: typeof House; tone: ScreenTone }>

export type ScreenName = keyof typeof SCREEN_META

/** Tinted icon chip shown beside a screen's title. */
export function ScreenIcon({ screen }: { screen: ScreenName }) {
  const { icon: Icon, tone } = SCREEN_META[screen]
  return (
    <span className="screen-icon tone-chip" data-tone={tone} aria-hidden="true">
      <Icon size={22} strokeWidth={1.8} />
    </span>
  )
}
