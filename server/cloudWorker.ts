import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, open, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { antivirus, type ScanResult } from './antivirus'
import { officeReady, powerPointPdf } from './powerPoint'

interface ScanJob { id: string; lease: string; name: string; mime: string; size: number; sha256: string; parts: number; chunkBytes: number; scanOnly: boolean; publishing: boolean; convertPdf?: boolean }
export interface CloudWorkerOptions { origin: string; token: string; root: string; environment?: Record<string,string|undefined>; request?: typeof fetch; scan?: (path: string) => Promise<ScanResult>; allowLocalTests?: boolean }
export function createCloudWorker(options: CloudWorkerOptions) {
  const origin = new URL(options.origin)
  if (origin.username || origin.password || origin.pathname !== '/' || (origin.protocol !== 'https:' && !(options.allowLocalTests && origin.protocol === 'http:' && ['127.0.0.1','localhost'].includes(origin.hostname)))) throw new Error('invalid-cloud-origin')
  const request = options.request ?? fetch, engine = antivirus(options.root, options.environment ?? process.env), scan = options.scan ?? engine.scan
  let ready: { at: number; ready: boolean; converter: boolean } | undefined
  const api = async (path: string, body?: unknown, job?: ScanJob) => {
    const response = await request(`${origin.origin}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${options.token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(job ? { 'X-Cathedral-Job-Lease': job.lease } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(45000) })
    if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(typeof result.reason === 'string' && /^[a-z-]{1,80}$/.test(result.reason) ? result.reason : 'cloud-service-unavailable') }
    return response
  }
  return {
    async runOnce() {
      const directory = join(options.root, '.data', 'cloud-quarantine')
      await mkdir(directory, { recursive: true, mode: 0o700 })
      if (!ready || Date.now() - ready.at > 60000) {
        const probe = join(directory, 'scanner-health.txt'); await writeFile(probe, 'Cathedral Presenter cloud scanner', { mode: 0o600 })
        ready = { at: Date.now(), ready: await scan(probe) === 'clean', converter: await officeReady(options.environment ?? process.env) }
      }
      const { job } = await (await api('/api/worker/claim', { ready: ready.ready, converter: ready.converter, databaseUpdatedAt: engine.databaseUpdatedAt() })).json() as { job: ScanJob | null }
      if (!job) return { worked: false, ready: ready.ready }
      if (!/^[0-9a-f-]{36}$/.test(job.id) || !/^[A-Za-z0-9_-]{43}$/.test(job.lease) || job.chunkBytes !== 2 * 1024 * 1024 || !Number.isSafeInteger(job.size) || job.size < 1 || job.size > 300 * 1024 * 1024 || job.parts !== Math.ceil(job.size / job.chunkBytes)) throw new Error('invalid-scan-job')
      const stage = await mkdtemp(join(directory, 'job-')), file = join(stage, 'content')
      try {
        if (!job.publishing) {
          const handle = await open(file, 'wx', 0o600), hash = createHash('sha256'); let size = 0
          try {
            for (let i = 0; i < job.parts; i++) {
              const response = await api(`/api/worker/jobs/${job.id}/parts/${i}`, undefined, job), reader = response.body?.getReader()
              if (!reader) throw new Error('parts-missing')
              let partBytes = 0
              try {
                for (;;) {
                  const { value, done } = await reader.read(); if (done) break
                  partBytes += value.length; size += value.length
                  if (partBytes > job.chunkBytes || size > job.size) { await reader.cancel(); throw new Error('file-changed') }
                  hash.update(value)
                  let offset = 0
                  while (offset < value.length) {
                    const { bytesWritten } = await handle.write(value, offset, value.length - offset)
                    if (!bytesWritten) throw new Error('file-write-failed')
                    offset += bytesWritten
                  }
                }
              } finally { reader.releaseLock() }
              if (partBytes !== Math.min(job.chunkBytes, job.size - i * job.chunkBytes)) throw new Error('file-changed')
            }
          } finally { await handle.close() }
          if (size !== job.size || hash.digest('hex') !== job.sha256) throw new Error('file-changed')
          const verdict = await scan(file)
          await api(`/api/worker/jobs/${job.id}/verdict`, { verdict, sha256: job.sha256, size }, job)
          if(verdict==='clean'&&job.convertPdf){
            const heartbeat=setInterval(()=>{void api(`/api/worker/jobs/${job.id}/heartbeat`,{},job).catch(()=>{})},45000)
            try{
              const bytes=await powerPointPdf(await (await import('node:fs/promises')).readFile(file),join(stage,'converted'),options.environment ?? process.env)
              if(await scan(join(stage,'converted','presentation.pdf'))!=='clean')throw new Error('virus-detected')
              await api(`/api/worker/jobs/${job.id}/conversion`,{size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')},job)
              for(let i=0;i<Math.ceil(bytes.length/job.chunkBytes);i++){
                const response=await request(`${origin.origin}/api/worker/jobs/${job.id}/conversion/${i}`,{method:'PUT',headers:{Authorization:`Bearer ${options.token}`,'X-Cathedral-Job-Lease':job.lease,'X-Cathedral-Media':'1','Content-Type':'application/octet-stream'},body:bytes.subarray(i*job.chunkBytes,(i+1)*job.chunkBytes),signal:AbortSignal.timeout(45000)})
                if(!response.ok)throw new Error('conversion-failed')
              }
              await api(`/api/worker/jobs/${job.id}/conversion/complete`,{},job);return {worked:true,ready:ready.ready}
            }catch(error){await api(`/api/worker/jobs/${job.id}/error`,{reason:error instanceof Error?error.message:'conversion-failed'},job);return {worked:true,ready:ready.ready,blocked:true}}
            finally{clearInterval(heartbeat)}
          }
          if (verdict !== 'clean' || job.scanOnly) return { worked: true, ready: ready.ready, blocked: verdict !== 'clean' }
        }
        for (let i = 0; i <= job.parts; i++) {
          const result = await (await api(`/api/worker/jobs/${job.id}/publish`, {}, job)).json()
          if (result.done) return { worked: true, ready: ready.ready }
        }
        throw new Error('drive-upload-failed')
      } finally { await rm(stage, { recursive: true, force: true }) }
    },
  }
}
