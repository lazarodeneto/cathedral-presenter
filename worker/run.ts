import { createCloudWorker } from '../server/cloudWorker'
const origin = process.env.CATHEDRAL_CLOUD_ORIGIN, token = process.env.CATHEDRAL_WORKER_TOKEN
if (!origin || !token) throw new Error('Configure CATHEDRAL_CLOUD_ORIGIN and CATHEDRAL_WORKER_TOKEN')
const worker = createCloudWorker({ origin, token, root: process.env.CATHEDRAL_WORKER_DATA || '/data' })
let stopping = false
process.on('SIGTERM', () => { stopping = true }); process.on('SIGINT', () => { stopping = true })
while (!stopping) {
  try { await worker.runOnce() } catch (error) { console.error(error instanceof Error && /^[a-z-]{1,80}$/.test(error.message) ? error.message : 'worker-request-failed') }
  if (!stopping) await new Promise((resolve) => setTimeout(resolve, 5000))
}
