import { useRef, useState } from 'react'
import { FileStack, Upload } from 'lucide-react'
import { useT } from '../i18n/useT'
import { useAppStore } from '../store/useAppStore'
import { useToasts } from '../store/useToasts'
import { importPowerPointText, importOpenLyrics, scanPresentation } from '../utils/presentationImport'
import { importVisualPresentation } from '../utils/visualPresentationImport'
import { createLibrarySongItem } from '../utils/songLibrary'
import { makeSlide } from '../utils/slides'
import { newId } from '../utils/id'
import { isoDate } from '../utils/dates'
import { navigate } from '../hooks/useHashRoute'
import { Modal } from './Modal'
import { SlideRenderer } from './SlideRenderer'
import type { LibrarySong, Slide } from '../types'

export function PresentationImport() {
 const t=useT(),push=useToasts(s=>s.push),services=useAppStore(s=>s.services),branding=useAppStore(s=>s.branding)
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[title,setTitle]=useState(''),[slides,setSlides]=useState<Slide[]>([]),[song,setSong]=useState<LibrarySong|null>(null),[mode,setMode]=useState('visual'),[destination,setDestination]=useState('new'),[progress,setProgress]=useState('')
 const abort=useRef<AbortController|null>(null)
 function close(){abort.current?.abort();setOpen(false)}
 async function select(files:File[]) {
  setBusy(true);setSlides([]);setSong(null);setProgress(t('storage.scanning'));abort.current=new AbortController()
  const file=files[0];if(!file){setBusy(false);return}
  try {
   setTitle(file.name.replace(/\.[^.]+$/,''))
   if(files.every(f=>f.type.startsWith('image/'))||/\.pdf$/i.test(file.name)||(/\.pptx$/i.test(file.name)&&mode==='visual')){
    const imported=await importVisualPresentation(files,useAppStore.getState().addMedia,(done,total)=>setProgress(`${done} / ${total}`),abort.current.signal);if(!abort.current.signal.aborted)setSlides(imported)
   } else {
    if(files.length!==1)throw new Error('invalid-document');await scanPresentation(file)
    let texts:string[]
    if(/\.pptx$/i.test(file.name))texts=importPowerPointText(new Uint8Array(await file.arrayBuffer()))
    else if(/\.xml$/i.test(file.name)){const imported=importOpenLyrics(await file.text(),file.name);setSong(imported);setTitle(imported.title);texts=imported.lyrics.split(/\n{2,}/)}
    else texts=(await file.text()).split(/\n\s*---\s*\n/).map(v=>v.trim().slice(0,12000)).filter(Boolean).slice(0,200)
    setSlides(texts.map((text,i)=>makeSlide({kind:'body',title:`${file.name} · ${i+1}`,text})))
   }
  }catch(error){if(!abort.current?.signal.aborted)push(t(error instanceof Error&&error.message==='conversion-unavailable'?'imports.converterUnavailable':error instanceof Error&&error.message==='virus-detected'?'storage.virusDetected':error instanceof Error&&error.message==='sign-in-required'?'storage.signIn':error instanceof Error&&error.message==='scanner-unavailable'?'storage.scannerUnavailable':'control.importFailed'),'error')}
  finally{setBusy(false);setProgress('')}
 }
 function insert(){
  const state=useAppStore.getState(),id=destination==='new'?state.createService({title:title.trim()||t('control.import'),date:isoDate(new Date()),time:'10:00',status:'draft'}):destination
  const service=useAppStore.getState().services.find(s=>s.id===id);if(!service?.sections[0])return
  if(destination==='new') for(const item of service.items) state.removeItem(id,item.id)
  if(song){state.createLibrarySong(song);state.addItem(id,service.sections[0].id,createLibrarySongItem(song))}
  else state.addItem(id,service.sections[0].id,{id:newId('item'),type:'sermon',title,slides})
  setOpen(false);state.selectService(id);navigate(`/service/${id}`)
 }
 return <><button className="btn btn-secondary" onClick={()=>{setOpen(true);setSlides([]);setSong(null);setDestination('new')}}><Upload size={15}/>{t('control.import')}</button>
 {open&&<Modal title={t('control.import')} subtitle={t('imports.help')} onClose={close}><div className="form-stack">
 <label className="field"><span>{t('imports.pptxMode')}</span><select value={mode} disabled={busy} onChange={e=>{setMode(e.target.value);setSlides([])}}><option value="visual">{t('imports.visual')}</option><option value="text">{t('imports.text')}</option></select></label>
 <input type="file" multiple accept=".pptx,.pdf,.png,.jpg,.jpeg,.webp,.gif,.avif,.xml,.txt,.md" disabled={busy} onChange={e=>{const files=[...(e.target.files||[])];e.target.value='';if(files.length)void select(files)}} aria-label={t('media.chooseFile')}/>
 {busy&&<p role="status">{progress}</p>}
 {slides.length>0&&<><label className="field"><span>{t('common.title')}</span><input maxLength={160} value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="field"><span>{t('add.destination')}</span><select value={destination} onChange={e=>setDestination(e.target.value)}><option value="new">{t('culto.newTitle')}</option>{services.filter(s=>s.sections.length>0&&s.status!=='archived').map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label><p><FileStack size={16}/> {slides.length} {t('common.slides')}</p><div className="import-slide-previews">{slides.slice(0,4).map(slide=><div key={slide.id}><SlideRenderer slide={slide} branding={branding} compact/></div>)}</div><p className="field-hint">{t('imports.review')}</p><button className="btn btn-primary" disabled={busy||!title.trim()} onClick={insert}>{t(destination==='new'?'culto.newTitle':'common.addToService')}</button></>}
 </div></Modal>}
 </>
}
