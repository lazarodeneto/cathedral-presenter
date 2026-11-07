import type { Plugin, Connect } from 'vite'
import { createMediaLibrary } from './mediaLibrary'
import { createOutputRelay } from './outputRelay'
import { createWorkspace } from './workspace'
import { createNativeCloud } from './nativeCloud'
import { createControllerApi } from './controllerApi'
import { createPresentationFiles } from './presentationFiles'

export function createLocalServices(root: string, environment: Record<string,string|undefined>) {
  const relay = createOutputRelay(), workspace = createWorkspace(root)
  const cloud = createNativeCloud({ root, environment, relay, workspace })
  const media = createMediaLibrary(root, environment, undefined, undefined, cloud.remote)
  cloud.setMediaCache(media.ensureCached)
  return { handlers: [createControllerApi(relay.dispatch), relay.handler, cloud.handler, createPresentationFiles(root, environment).handle, media.handle, workspace.handle], close() { cloud.close(); relay.close(); media.close(); workspace.close() } }
}
export function localServices(environment: Record<string,string>): Plugin {
  const install = (server: { config: { root: string }; middlewares: { use(handler: Connect.NextHandleFunction): unknown }; httpServer?: { once(event: string, listener: () => void): unknown } | null }) => {
    const service = createLocalServices(server.config.root, { ...environment, ...process.env })
    for (const handler of service.handlers) server.middlewares.use(handler)
    server.httpServer?.once('close', service.close)
  }
  return { name: 'cathedral-local-services', apply: (_config, env) => env.mode !== 'test', configureServer: install, configurePreviewServer: install }
}
