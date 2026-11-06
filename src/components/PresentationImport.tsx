import { useState } from 'react'
import { Upload } from 'lucide-react'
import { useT } from '../i18n/useT'
import { useAppStore } from '../store/useAppStore'
import { useToasts } from '../store/useToasts'
import { importPowerPointText, importOpenLyrics, scanPresentation } from '../utils/presentationImport'
import { createLibrarySongItem } from '../utils/songLibrary'
import { makeSlide } from '../utils/slides'
import { newId } from '../utils/id'
import { isoDate } from '../utils/dates'
import { navigate } from '../hooks/useHashRoute'
import { Modal } from './Modal'
import type { LibrarySong } from '../types'

export function PresentationImport() {
  const t = useT(), push = useToasts((s) => s.push)
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [title, setTitle] = useState(''), [texts, setTexts] = useState<string[]>([]), [song, setSong] = useState<LibrarySong | null>(null)
  async function select(file: File) {
    setBusy(true); setTexts([]); setSong(null)
    try {
      await scanPresentation(file)
      setTitle(file.name.replace(/\.[^.]+$/, ''))
      if (/\.pptx$/i.test(file.name)) setTexts(importPowerPointText(new Uint8Array(await file.arrayBuffer())))
      else if (/\.xml$/i.test(file.name)) { const imported = importOpenLyrics(await file.text(), file.name); setSong(imported); setTitle(imported.title); setTexts(imported.lyrics.split(/\n{2,}/)) }
      else setTexts((await file.text()).split(/\n\s*---\s*\n/).map((t) => t.trim().slice(0, 12000)).filter(Boolean).slice(0, 200))
    } catch { push(t('control.importFailed'), 'error') } finally { setBusy(false) }
  }
  function insert() {
    const state = useAppStore.getState()
    const id = state.createService({ title: title.trim() || t('control.import'), date: isoDate(new Date()), time: '10:00', status: 'draft' })
    const service = useAppStore.getState().services.find((s) => s.id === id)!
    if (song) { state.createLibrarySong(song); state.addItem(id, service.sections[0].id, createLibrarySongItem(song)) }
    else state.addItem(id, service.sections[0].id, { id: newId('item'), type: 'sermon', title, slides: texts.map((text, i) => makeSlide({ kind: 'body', title: `${title} · ${i + 1}`, text })) })
    setOpen(false); state.selectService(id); navigate(`/service/${id}`)
  }
  return <><button className="btn btn-secondary" onClick={() => { setOpen(true); setTexts([]); setSong(null) }}><Upload size={15} />{t('control.import')}</button>
    {open && <Modal title={t('control.import')} subtitle={t('control.importHelp')} onClose={() => { if (!busy) setOpen(false) }}>
      <div className="form-stack"><input type="file" accept=".pptx,.xml,.txt,.md" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void select(file) }} aria-label={t('media.chooseFile')} />
      {busy && <p role="status">{t('storage.scanning')}</p>}
      {texts.length > 0 && <><label className="field"><span>{t('common.title')}</span><input maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} /></label><p>{texts.length} {t('common.slides')}</p><blockquote className="import-text-preview">{texts[0]}</blockquote><button className="btn btn-primary" disabled={busy || !title.trim()} onClick={insert}>{t('culto.newTitle')}</button></>}
      </div>
    </Modal>}
  </>
}
