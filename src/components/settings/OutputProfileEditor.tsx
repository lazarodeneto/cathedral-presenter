import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { SortSelect } from '../SortSelect'
import type { OutputProfile } from '../../types'

export function OutputProfileEditor({ id, confidence = false }: { id: string; confidence?: boolean }) {
  const t = useT(), settings = useAppStore((s) => s.settings), services = useAppStore((s) => s.services), update = useAppStore((s) => s.updateSettings)
  const profile = settings.outputProfiles?.[id] ?? { source: 'live', layout: 'full' }
  const save = (patch: Partial<OutputProfile>) => update({ outputProfiles: { ...settings.outputProfiles, [id]: { ...profile, ...patch, updatedAt: Date.now() } } })
  return <div className="output-profile-editor">
    {!confidence && <>
      <SortSelect label={t('routing.source')} value={profile.source} onChange={(source) => save({ source })} options={[{ value: 'live', label: t('routing.follow') }, { value: 'slide', label: t('routing.independent') }]} />
      {profile.source === 'slide' && <SortSelect label={t('routing.slide')} value={profile.slideId ?? ''} onChange={(slideId) => save({ slideId })} options={[{ value: '', label: t('routing.choose') }, ...services.flatMap((s) => s.items.flatMap((item) => item.slides.map((slide) => ({ value: slide.id, label: `${s.title} · ${item.title} · ${slide.title || slide.reference || '—'}` }))))]} />}
    </>}
    <SortSelect label={t('routing.layout')} value={profile.layout} onChange={(layout) => save({ layout })} options={(confidence ? ['full', 'stage-lyrics', 'stage-speaker'] as const : ['full', 'text', 'lower-third'] as const).map((value) => ({ value, label: t(`routing.${value}`) }))} />
    {!confidence && <label className="field"><span>{t('routing.margin')} · {profile.margin ?? 0}%</span><input type="range" min={0} max={15} step={1} value={profile.margin ?? 0} onChange={(e) => save({ margin: Number(e.target.value) })} /></label>}
  </div>
}
