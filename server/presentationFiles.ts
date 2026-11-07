import { randomUUID, createHash } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { mkdtemp, rm, writeFile, stat, readdir, open } from 'node:fs/promises'
import { join } from 'node:path'
import type { Connect } from 'vite'
import { accountSession } from './auth'
import { antivirus } from './antivirus'
import { officeReady, powerPointPdf } from './powerPoint'
const CHUNK=2*1024*1024
export function createPresentationFiles(root:string,env:Record<string,string|undefined>) {
 const directory=join(root,'.data','presentations');mkdirSync(directory,{recursive:true,mode:0o700});const engine=antivirus(root,env);let busy=false
 const handle:Connect.NextHandleFunction=(req,res,next)=>{
  const path=req.url?.split('?')[0] || '';if(!path.startsWith('/api/presentations/'))return next()
  const json=(status:number,data:unknown)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
  void(async()=>{
   const host=req.headers.host || ''
   if(!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '')||req.headers['sec-fetch-site']==='cross-site'||req.headers.origin&&!['http://'+host,'https://'+host].includes(req.headers.origin)||req.headers['x-cathedral-media']!=='1')throw new Error('forbidden')
   if(!await accountSession(req))return json(401,{reason:'sign-in-required'})
   if(path==='/api/presentations/status'&&req.method==='GET')return json(200,{converter:await officeReady(env)})
   if(path==='/api/presentations/convert'&&req.method==='POST'){
    if(busy)return json(429,{reason:'conversion-busy'});busy=true;let stage=''
    try{
     for(const name of await readdir(directory)){if(!name.startsWith('job-')&&!/^[0-9a-f-]{36}$/.test(name))continue;const p=join(directory,name);if(Date.now()-(await stat(p)).mtimeMs>86400000)await rm(p,{recursive:true,force:true})}
     const chunks:Buffer[]=[];let size=0
     for await(const chunk of req){size+=chunk.length;if(size>50*1024*1024)throw new Error('document-too-large');chunks.push(chunk)}
     const bytes=Buffer.concat(chunks);stage=await mkdtemp(join(directory,'job-'));const input=join(stage,'original.pptx');await writeFile(input,bytes,{mode:0o600})
     const clean=await engine.scan(input);if(clean!=='clean')throw new Error(clean==='infected'?'virus-detected':'scanner-unavailable')
     const pdf=await powerPointPdf(bytes,stage,env), output=join(stage,'presentation.pdf');const verdict=await engine.scan(output);if(verdict!=='clean')throw new Error(verdict==='infected'?'virus-detected':'scanner-unavailable')
     const id=randomUUID();await writeFile(join(directory,id),pdf,{mode:0o600});return json(200,{id,size:pdf.length,parts:Math.ceil(pdf.length/CHUNK),sha256:createHash('sha256').update(pdf).digest('hex')})
    }finally{busy=false;if(stage)await rm(stage,{recursive:true,force:true})}
   }
   const file=/^\/api\/presentations\/([0-9a-f-]{36})\/(\d+)$/.exec(path)
   if(file&&req.method==='GET'){
    const p=join(directory,file[1]),info=await stat(p),part=Number(file[2]);if(Date.now()-info.mtimeMs>86400000||part>=Math.ceil(info.size/CHUNK))return json(404,{reason:'not-found'})
    const handle=await open(p,'r'),bytes=Buffer.alloc(Math.min(CHUNK,info.size-part*CHUNK));try{let offset=0;while(offset<bytes.length){const {bytesRead}=await handle.read(bytes,offset,bytes.length-offset,part*CHUNK+offset);if(!bytesRead)throw new Error('conversion-failed');offset+=bytesRead}}finally{await handle.close()}
    res.writeHead(200,{'Content-Type':'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes);return
   }
   return json(404,{reason:'not-found'})
  })().catch((error)=>{if(!res.headersSent)json(409,{reason:error instanceof Error&&/^[a-z-]{1,80}$/.test(error.message)?error.message:'conversion-failed'})})
 };return {handle}
}
