import type { Config, Context } from '@netlify/functions'
import { createCloudApp } from '../../server/cloud/app'

const app = createCloudApp(process.env)
export default (request: Request, context: Context) => app.handle(request, { ip: context.ip })
export const config: Config = { path: '/api/*' }
