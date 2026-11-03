import { useState } from 'react'
import { BookOpen, CalendarDays, ListChecks, House, Image as ImageIcon, LayoutTemplate, MoreHorizontal, Music4, Settings } from 'lucide-react'
import { useT } from '../i18n/useT'
import { navigate, type RouteName } from '../hooks/useHashRoute'
import { useDialogFocus } from '../hooks/useDialogFocus'

type NavEntry = { name: RouteName; key: string; icon: typeof House }

// Phone-width navigation. Same destinations and order as the sidebar:
// the first four are tabs, the rest live in the More sheet.
const PRIMARY: NavEntry[] = [
  { name: 'home', key: 'nav.home', icon: House },
  { name: 'services', key: 'nav.services', icon: ListChecks },
  { name: 'calendar', key: 'nav.calendar', icon: CalendarDays },
  { name: 'bible', key: 'nav.bible', icon: BookOpen },
]
const MORE: NavEntry[] = [
  { name: 'songs', key: 'nav.songs', icon: Music4 },
  { name: 'media', key: 'nav.media', icon: ImageIcon },
  { name: 'templates', key: 'nav.templates', icon: LayoutTemplate },
  { name: 'settings', key: 'nav.settings', icon: Settings },
]

function isCurrent(current: RouteName, name: RouteName) {
  return current === name || (current === 'service' && name === 'services')
}

export function MobileNav({ current }: { current: RouteName }) {
  const t = useT()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = MORE.some((entry) => isCurrent(current, entry.name))

  return (
    <>
      <nav className="mobile-nav" aria-label={t('app.name')}>
        {PRIMARY.map(({ name, key, icon: Icon }) => (
          <button
            key={name}
            className={`mobile-nav-item ${isCurrent(current, name) ? 'is-active' : ''}`}
            aria-current={isCurrent(current, name) ? 'page' : undefined}
            onClick={() => navigate(`/${name}`)}
          >
            <Icon size={20} strokeWidth={1.7} />
            <span>{t(key)}</span>
          </button>
        ))}
        <button
          className={`mobile-nav-item ${moreActive ? 'is-active' : ''}`}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          aria-current={moreActive ? 'page' : undefined}
          onClick={() => setMoreOpen(true)}
        >
          <MoreHorizontal size={20} strokeWidth={1.7} />
          <span>{t('nav.more')}</span>
        </button>
      </nav>
      {moreOpen && (
        <div className="mobile-sheet-backdrop" onMouseDown={() => setMoreOpen(false)}>
          <MoreSheet current={current} label={t('nav.more')} onClose={() => setMoreOpen(false)} />
        </div>
      )}
    </>
  )
}

function MoreSheet({ current, label, onClose }: { current: RouteName; label: string; onClose: () => void }) {
  const t = useT()
  const dialog = useDialogFocus<HTMLDivElement>(onClose)
  return (
    <div
      ref={dialog.ref}
      className="mobile-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      onKeyDown={dialog.onKeyDown}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <span className="mobile-sheet-grip" aria-hidden="true" />
      {MORE.map(({ name, key, icon: Icon }) => (
        <button
          key={name}
          className={`mobile-sheet-item ${isCurrent(current, name) ? 'is-active' : ''}`}
          aria-current={isCurrent(current, name) ? 'page' : undefined}
          onClick={() => {
            onClose()
            navigate(`/${name}`)
          }}
        >
          <Icon size={19} strokeWidth={1.7} />
          <span>{t(key)}</span>
        </button>
      ))}
    </div>
  )
}
