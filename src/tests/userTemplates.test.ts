import { describe, expect, it } from 'vitest'
import { createUserTemplate, exportUserTemplate, parseUserTemplate, userTemplateItem } from '../utils/userTemplates'
import { makeElement, makeSlide } from '../utils/slides'
import { normalizeUserTemplates } from '../security/backup'
import { useAppStore } from '../store/useAppStore'
import { partializeWorkspace, mergeWorkspace } from '../store/workspacePersistence'

describe('reusable church templates',()=>{
 it('round-trips layout and text without reusing service instance ids',()=>{
  const slide=makeSlide({title:'Sermon',text:'Welcome',elements:[makeElement('text',{text:'Good morning',x:8,y:12,width:60})]})
  const template=createUserTemplate('Church model',[slide],'Message','A reusable message layout')
  const imported=parseUserTemplate(exportUserTemplate(template)),first=userTemplateItem(imported),second=userTemplateItem(imported)
  expect(imported.id).not.toBe(template.id);expect(first.slides[0].text).toBe('Welcome')
  expect(first.slides[0].elements[0]).toMatchObject({text:'Good morning',x:8,y:12,width:60})
  expect(first.id).not.toBe(second.id);expect(first.slides[0].id).not.toBe(second.slides[0].id);expect(first.slides[0].elements[0].id).not.toBe(second.slides[0].elements[0].id)
 })
 it('rejects unrelated documents and caps imported templates',()=>{
  expect(()=>parseUserTemplate('{"app":"other","template":{}}')).toThrow('invalid-template')
  expect(()=>createUserTemplate('Too many',Array.from({length:21},()=>makeSlide()))).toThrow('template-limit')
  expect(normalizeUserTemplates([{name:'Bad',slides:[]}])).toEqual([])
 })
 it('keeps templates through local workspace and recovery merges',()=>{
  const initial=useAppStore.getState(),template=createUserTemplate('Persist',[makeSlide({text:'Keep me'})])
  try{
   expect(initial.saveUserTemplate(template)).toBe(true)
   const document=partializeWorkspace(useAppStore.getState())
   const restored=mergeWorkspace(document,initial)
   expect(restored.userTemplates[0]).toMatchObject({name:'Persist',slides:[{text:'Keep me'}]})
   useAppStore.getState().removeUserTemplate(template.id)
   expect(useAppStore.getState().userTemplates.some(t=>t.id===template.id)).toBe(false)
  }finally{useAppStore.setState(initial)}
 })
})
