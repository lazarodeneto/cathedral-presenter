import type { Slide, MediaAsset } from '../types'
import { makeElement, makeSlide } from './slides'
import { webMediaProvider } from '../providers/media/MediaProvider'
import { scanPresentation } from './presentationImport'
import { isCloud } from '../runtime'
import { sha256 } from '@noble/hashes/sha2.js'
const CHUNK=2*1024*1024
const headers={'X-Cathedral-Media':'1'}
async function convertedPowerPoint(file:File):Promise<Uint8Array> {
 let metadata:{id:string;size:number;parts:number;sha256:string;uploadId?:string}
 if(isCloud){const {uploadCloudFile}=await import('../providers/media/cloudUpload');const result=await uploadCloudFile(file,'application/vnd.openxmlformats-officedocument.presentationml.presentation',true,true);if(!result.conversion)throw new Error('conversion-failed');metadata=result.conversion}
 else{const response=await fetch('/api/presentations/convert',{method:'POST',headers:{...headers,'Content-Type':'application/vnd.openxmlformats-officedocument.presentationml.presentation'},body:file,signal:AbortSignal.timeout(300000)});const data=await response.json();if(!response.ok)throw new Error(data.reason);metadata=data}
 if(!/^[0-9a-f-]{36}$/.test(metadata.id)||!Number.isSafeInteger(metadata.size)||metadata.size>50*1024*1024||metadata.parts!==Math.ceil(metadata.size/CHUNK))throw new Error('invalid-document')
 const bytes=new Uint8Array(metadata.size)
 for(let i=0;i<metadata.parts;i++){
  const path=isCloud?`/api/media/uploads/${metadata.uploadId}/conversion/${i}`:`/api/presentations/${metadata.id}/${i}`
  const response=await fetch(path,{headers,signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error('conversion-failed')
  const part=new Uint8Array(await response.arrayBuffer());if(part.length!==Math.min(CHUNK,metadata.size-i*CHUNK))throw new Error('file-changed');bytes.set(part,i*CHUNK)
 }
 if([...sha256(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('')!==metadata.sha256)throw new Error('file-changed')
 return bytes
}
export function imagePresentationSlide(asset:MediaAsset,title:string):Slide {
 return makeSlide({kind:'body',title,text:'',background:{type:'preset',preset:'graphite',tone:'dark',overlay:0},elements:[makeElement('image',{x:0,y:0,width:100,height:100,source:asset.source,text:asset.name,settings:{fit:'contain',cropX:50,cropY:50}})]})
}
export async function importVisualPresentation(files:File[],addMedia:(asset:MediaAsset)=>void,progress:(done:number,total:number)=>void,signal?:AbortSignal,maxPages=200):Promise<Slide[]> {
 if(!files.length||files.length>maxPages)throw new Error('document-too-large')
 const slides:Slide[]=[];let totalBytes=0
 const register=async(file:File,title:string)=>{signal?.throwIfAborted();const result=await webMediaProvider.registerFile(file);if(!result.ok||!result.asset)throw new Error(result.reason||'scan-failed');addMedia(result.asset);totalBytes+=file.size;if(totalBytes>250*1024*1024)throw new Error('document-too-large');slides.push(imagePresentationSlide(result.asset,title))}
 if(files.every(file=>/^image\/(?:png|jpeg|webp|gif|avif)$/.test(file.type))){
  const ordered=files.slice().sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}))
  for(let i=0;i<ordered.length;i++){await register(ordered[i],ordered[i].name);progress(i+1,ordered.length)}
  return slides
 }
 if(files.length!==1)throw new Error('invalid-document')
 const file=files[0];if(file.size>50*1024*1024)throw new Error('document-too-large')
 let bytes:Uint8Array
 if(/\.pptx$/i.test(file.name))bytes=await convertedPowerPoint(file)
 else if(/\.pdf$/i.test(file.name)){await scanPresentation(file);bytes=new Uint8Array(await file.arrayBuffer())}
 else throw new Error('invalid-document')
 const pdfjs=await import('pdfjs-dist'),worker=await import('pdfjs-dist/build/pdf.worker.min.mjs?url'),renderer=await import('pdfjs-dist/build/pdf.renderer.min.mjs?url')
 pdfjs.GlobalWorkerOptions.workerSrc=worker.default;pdfjs.GlobalWorkerOptions.rendererSrc=renderer.default
 const task=pdfjs.getDocument({data:bytes,enableXfa:false,useWorkerFetch:false,stopAtErrors:true,maxImageSize:16*1024*1024,canvasMaxAreaInBytes:64*1024*1024,disableAutoFetch:true,disableStream:true,cMapUrl:'/pdfjs/cmaps/',standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/'})
 const document=await task.promise
 try{
  if(document.numPages>maxPages)throw new Error('document-too-large')
  for(let i=1;i<=document.numPages;i++){
   signal?.throwIfAborted();const page=await document.getPage(i),unit=page.getViewport({scale:1})
   const viewport=page.getViewport({scale:Math.min(1920/unit.width,1080/unit.height)}),canvas=window.document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height)
   try{
    await page.render({canvas,viewport,background:'#fff',annotationMode:pdfjs.AnnotationMode.DISABLE}).promise
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('render-failed')),'image/png'))
    await register(new File([blob],`${file.name.replace(/\.[^.]+$/,'')}-${i}.png`,{type:'image/png'}),`${file.name.replace(/\.[^.]+$/,'')} · ${i}`);progress(i,document.numPages)
   }finally{canvas.width=0;canvas.height=0;page.cleanup()}
  }
 }finally{await task.destroy()}
 return slides
}
