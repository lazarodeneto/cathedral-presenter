import { useRef, useState } from 'react'
import { Copy, Download, FolderOpen, LayoutTemplate, Pencil, Plus, Save, Trash2, Upload } from 'lucide-react'
import type { SlideTemplate, UserTemplate } from '../types'
import { useAppStore } from '../store/useAppStore'
import { useToasts } from '../store/useToasts'
import { useT } from '../i18n/useT'
import { ConfirmDialog, Modal } from './Modal'
import { SlideRenderer } from './SlideRenderer'
import { createTemplateItem, makeSlide } from '../utils/slides'
import { createUserTemplate, exportUserTemplate, importUserTemplate } from '../utils/userTemplates'

export function TemplateManager({ bases, onAdd, canAdd, categoryLabel }: { bases: SlideTemplate[]; onAdd: (template: UserTemplate) => void; canAdd: boolean; categoryLabel: (category: string) => string }) {
  const t = useT(), push = useToasts((s) => s.push), templates = useAppStore((s) => s.userTemplates), branding = useAppStore((s) => s.branding)
  const [open, setOpen] = useState(false), [editing, setEditing] = useState<UserTemplate | null>(null), [deleting, setDeleting] = useState<UserTemplate | null>(null), [name, setName] = useState(''), [description, setDescription] = useState(''), [category, setCategory] = useState('Service'), [base, setBase] = useState('blank'), [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const state = useAppStore.getState(), selected = state.services.find((s) => s.id === state.activeServiceId)?.items.flatMap((i) => i.slides).find((slide) => slide.id === state.selectedSlideId)
  const categories = ['Scripture','Worship','Announcement','Message','Service','Blank']
  function edit(template?: UserTemplate) { setEditing(template ?? null); setName(template?.name ?? ''); setDescription(template?.description ?? ''); setCategory(template?.category ?? 'Service'); setBase('blank'); setOpen(true) }
  function save() {
    try {
      const starter = bases.find((entry) => entry.id === base)
      const slides = editing?.slides ?? (base === 'selected' && selected ? [selected] : starter ? createTemplateItem(starter, starter.name).slides : [makeSlide({kind:'body',title:name.trim(),text:''})])
      const template = createUserTemplate(name,slides,category,description,editing?.id)
      if (editing) template.createdAt = editing.createdAt
      if (!useAppStore.getState().saveUserTemplate(template)) throw new Error('template-limit')
      setOpen(false); push(t('templates.manage.saved'),'success')
    } catch { push(t('templates.manage.limit'),'error') }
  }
  async function select(file: File) {
    setBusy(true)
    try { const template = await importUserTemplate(file,useAppStore.getState().addMedia); if (!useAppStore.getState().saveUserTemplate(template)) throw new Error('template-limit'); push(t('templates.manage.imported'),'success') }
    catch (error) { push(t(error instanceof Error && error.message === 'virus-detected' ? 'storage.virusDetected' : error instanceof Error && error.message === 'scanner-unavailable' ? 'storage.scannerUnavailable' : 'templates.manage.failed'),'error') }
    finally { setBusy(false) }
  }
  function download(template: UserTemplate) {
    const url = URL.createObjectURL(new Blob([exportUserTemplate(template)],{type:'application/json'}))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${template.name.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,80) || 'Cathedral-template'}.cathedral.json`; anchor.click(); setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  return <section className="template-manager" aria-label={t('templates.manage.mine')}>
    <div className="template-manager-head"><h2><LayoutTemplate size={18} />{t('templates.manage.mine')} <span className="badge badge-quiet">{templates.length}</span></h2><div className="heading-actions"><button className="btn btn-secondary" disabled={busy} onClick={()=>input.current?.click()}><Upload size={16} />{t('templates.manage.import')}</button><button className="btn btn-primary" disabled={busy || templates.length>=75} onClick={()=>edit()}><Plus size={16} />{t('templates.manage.new')}</button></div></div>
    <p className="field-hint">{t('templates.manage.help')}</p>
    <input ref={input} type="file" hidden accept=".json,.pptx,.pdf,.png,.jpg,.jpeg,.webp,.gif,.avif" onChange={(e)=>{const file=e.target.files?.[0];e.target.value='';if(file) void select(file)}} />
    {busy && <p className="inline-note" role="status">{t('storage.scanning')}</p>}
    {templates.length>0 && <div className="template-grid">{templates.map((template)=><article key={template.id} className="template-card panel"><div className="template-preview"><SlideRenderer slide={template.slides[0]} branding={branding} compact /></div><div className="template-body"><div><span className="eyebrow">{categoryLabel(template.category)} · {t('common.slides')}: {template.slides.length}</span><h3>{template.name}</h3><p>{template.description}</p></div><button className="btn btn-secondary btn-sm" disabled={!canAdd} onClick={()=>onAdd(template)}><FolderOpen size={14} />{t('common.addToService')}</button><div className="template-manager-actions"><button className="icon-btn" aria-label={`${t('templates.manage.edit')}: ${template.name}`} title={t('templates.manage.edit')} onClick={()=>edit(template)}><Pencil size={16} /></button><button className="icon-btn" aria-label={`${t('templates.manage.saveCopy')}: ${template.name}`} title={t('templates.manage.saveCopy')} onClick={()=>{const copy=createUserTemplate(template.name,template.slides,template.category,template.description);if(!useAppStore.getState().saveUserTemplate(copy))push(t('templates.manage.limit'),'error')}}><Copy size={16} /></button><button className="icon-btn" aria-label={`${t('templates.manage.export')}: ${template.name}`} title={t('templates.manage.export')} onClick={()=>download(template)}><Download size={16} /></button><button className="icon-btn" aria-label={`${t('templates.manage.delete')}: ${template.name}`} title={t('templates.manage.delete')} onClick={()=>setDeleting(template)}><Trash2 size={16} /></button></div></div></article>)}</div>}
    {templates.length>0 && <p className="field-hint">{t('templates.manage.linkedMedia')}</p>}
    {open && <Modal title={t(editing?'templates.manage.edit':'templates.manage.new')} onClose={()=>setOpen(false)}><form className="form-stack" onSubmit={(e)=>{e.preventDefault();save()}}><label className="field"><span>{t('templates.manage.name')}</span><input autoFocus required maxLength={120} value={name} onChange={(e)=>setName(e.target.value)} /></label><label className="field"><span>{t('templates.manage.description')}</span><textarea maxLength={600} value={description} onChange={(e)=>setDescription(e.target.value)} /></label><label className="field"><span>{t('templates.manage.category')}</span><select value={category} onChange={(e)=>setCategory(e.target.value)}>{categories.map((c)=><option key={c} value={c}>{categoryLabel(c)}</option>)}</select></label>{!editing && <label className="field"><span>{t('templates.manage.base')}</span><select value={base} onChange={(e)=>setBase(e.target.value)}><option value="blank">{t('templates.manage.blank')}</option>{selected && <option value="selected">{t('templates.manage.selected')} · {selected.title}</option>}{bases.map((entry)=><option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>}<p className="field-hint">{t('templates.manage.limit')}</p><div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={()=>setOpen(false)}>{t('common.cancel')}</button><button className="btn btn-primary" disabled={!name.trim()}><Save size={16} />{t('templates.manage.save')}</button></div></form></Modal>}
    <ConfirmDialog open={Boolean(deleting)} title={t('templates.manage.delete')} copy={t('templates.manage.deleteCopy')} confirmLabel={t('templates.manage.delete')} onClose={()=>setDeleting(null)} onConfirm={()=>{if(deleting)useAppStore.getState().removeUserTemplate(deleting.id)}} />
  </section>
}
