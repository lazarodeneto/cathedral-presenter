import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Unzip, UnzipInflate } from 'fflate'

export function officeExecutable(env: Record<string,string|undefined>) {
  return env.CATHEDRAL_SOFFICE_PATH || (process.platform === 'win32' ? [join(env.ProgramFiles || 'C:\\Program Files','LibreOffice','program','soffice.exe')] : ['/Applications/LibreOffice.app/Contents/MacOS/soffice','/usr/bin/soffice','/usr/local/bin/soffice','/opt/homebrew/bin/soffice']).find(existsSync) || 'soffice'
}
export function officeReady(env: Record<string,string|undefined>): Promise<boolean> {
  return new Promise((resolve)=>execFile(officeExecutable(env),['--version'],{timeout:8000,maxBuffer:4096,windowsHide:true},(error)=>resolve(!error)))
}
export function verifyPowerPoint(bytes: Uint8Array) {
  if (bytes.length>50*1024*1024 || bytes[0]!==80 || bytes[1]!==75) throw new Error('invalid-document')
  let entries=0,expanded=0
  const unzip=new Unzip((file)=>{
    if(++entries>4096) throw new Error('document-too-large')
    if(!file.name.endsWith('.rels')) return
    let text=''
    file.ondata=(error,data)=>{if(error)throw error;expanded+=data.length;if(expanded>4*1024*1024)throw new Error('document-too-large');text+=new TextDecoder().decode(data);if([...text.matchAll(/<(?:[\w.-]+:)?Relationship\b[^>]*>/gi)].some(([tag])=> !/Type\s*=\s*["'][^"']*\/hyperlink["']/i.test(tag)&&/Target\s*=\s*["'](?:[a-z][a-z0-9+.-]*:|\/\/|\\\\)/i.test(tag)))throw new Error('external-media-not-supported');if(text.includes('\0')||/<!DOCTYPE|<!ENTITY|&#/i.test(text))throw new Error('unsafe-document');if(/<(?:[\w.-]+:)?Relationship\b[^>]*TargetMode\s*=\s*["']External["'][^>]*>/i.test(text) && [...text.matchAll(/<(?:[\w.-]+:)?Relationship\b[^>]*>/gi)].some(([tag])=>/TargetMode\s*=\s*["']External["']/i.test(tag)&& !/Type\s*=\s*["'][^"']*\/hyperlink["']/i.test(tag))) throw new Error('external-media-not-supported')}
    file.start()
  });unzip.register(UnzipInflate)
  for(let i=0;i<bytes.length;i+=65536)unzip.push(bytes.subarray(i,i+65536));unzip.push(new Uint8Array(),true)
}
/** Fresh profile, disabled macros and fixed arguments; no shell and no user-selected executable. */
export async function powerPointPdf(bytes: Uint8Array, directory: string, env: Record<string,string|undefined>) {
  verifyPowerPoint(bytes)
  const profile=join(directory,'profile'), input=join(directory,'presentation.pptx')
  await mkdir(profile,{recursive:true,mode:0o700})
  await writeFile(join(profile,'registrymodifications.xcu'),'<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item></oor:items>',{mode:0o600})
  await writeFile(input,bytes,{mode:0o600})
  await new Promise<void>((resolve,reject)=>execFile(officeExecutable(env),[`-env:UserInstallation=${pathToFileURL(profile).href}`,'--headless','--nologo','--nodefault','--norestore','--nolockcheck','--convert-to','pdf:impress_pdf_Export','--outdir',directory,input],{timeout:120000,maxBuffer:8192,windowsHide:true},(error)=>error?reject(new Error('conversion-unavailable')):resolve()))
  const result=await readFile(join(directory,'presentation.pdf'))
  if(result.length>50*1024*1024 || result.subarray(0,5).toString()!=='%PDF-')throw new Error('conversion-failed')
  return result
}
