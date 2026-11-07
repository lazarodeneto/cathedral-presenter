import { Download } from 'lucide-react'
import { useT } from '../i18n/useT'

const base = 'https://github.com/lazarodeneto/cathedral-presenter-downloads/releases/latest/download/'
const downloads = [
  { file: 'Cathedral-Presenter-Windows-x64.exe', label: 'Windows · 64-bit' },
  { file: 'Cathedral-Presenter-macOS-Apple-Silicon.dmg', label: 'Mac · Apple Silicon' },
  { file: 'Cathedral-Presenter-macOS-Intel.dmg', label: 'Mac · Intel' },
]

export function DesktopDownloads() {
  const t = useT()
  return <section className="desktop-downloads" aria-label={t('cloud.downloadTitle')}>
    <strong>{t('cloud.downloadTitle')}</strong>
    <p>{t('cloud.downloadHint')}</p>
    <div className="desktop-downloads-actions">{downloads.map(({ file, label }) => <a className="btn btn-secondary btn-sm" key={file} href={`${base}${file}`}><Download size={15} />{label}</a>)}</div>
    <p className="field-hint">{t('cloud.downloadUnsigned')}</p>
  </section>
}
