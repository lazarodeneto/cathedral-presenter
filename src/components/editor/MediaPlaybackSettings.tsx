import { Film, Repeat2, StepForward, Square, Pause } from 'lucide-react'
import type { SlideElementSettings } from '../../types'
import { SortSelect } from '../SortSelect'
import { useT } from '../../i18n/useT'

export function MediaPlaybackSettings({ settings = {}, onChange }: { settings?: SlideElementSettings; onChange(settings: SlideElementSettings): void }) {
  const t = useT()
  return <div className="media-playback-settings">
    <SortSelect label={t('playback.mode')} value={settings.playbackMode ?? (settings.motion ? 'background' : 'foreground')}
      options={[
        { value: 'foreground', label: t('playback.foreground'), icon: <Film size={16} /> },
        { value: 'background', label: t('playback.background'), icon: <Repeat2 size={16} /> },
      ]}
      onChange={(value) => onChange({ ...settings, playbackMode: value, muted: value === 'background', loop: value === 'background' })} />
    <SortSelect label={t('playback.endAction')} value={settings.endAction ?? 'hold'}
      options={[
        { value: 'hold', label: t('playback.hold'), icon: <Pause size={16} /> },
        { value: 'next', label: t('playback.next'), icon: <StepForward size={16} /> },
        { value: 'black', label: t('playback.black'), icon: <Square size={16} /> },
      ]}
      onChange={(value) => onChange({ ...settings, endAction: value })} />
  </div>
}
