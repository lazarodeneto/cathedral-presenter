'use strict'
const { spawn } = require('node:child_process')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
let server
let desktop
async function health() {
  try {
    const response = await fetch('http://localhost:4173/api/app-health', {
      signal: AbortSignal.timeout(700),
    })
    return response.ok && (await response.json()).app === 'church-presenter'
  } catch {
    return false
  }
}
function stop() {
  desktop?.kill()
  server?.kill()
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
;(async () => {
  if (!(await health())) {
    server = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js')], {
      cwd: root,
      stdio: 'inherit',
    })
    server.on('exit', (code) => {
      if (!desktop && code) process.exitCode = code
    })
    let ready = false
    for (let attempt = 0; attempt < 60; attempt++) {
      if (await health()) {
        ready = true
        break
      }
      if (server.exitCode !== null) break
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    if (!ready) {
      stop()
      throw new Error('Could not start Cathedral Presenter on port 4173')
    }
  }
  const electron = require('electron')
  const desktopEnvironment = { ...process.env }
  delete desktopEnvironment.ELECTRON_RUN_AS_NODE
  // Development-shell launch; the HTTP/auth server stays in the host Node runtime.
  desktop = spawn(electron, [path.join(__dirname, 'main.cjs')], {
    cwd: root,
    stdio: 'inherit',
    env: desktopEnvironment,
  })
  desktop.on('exit', (code) => {
    server?.kill()
    process.exitCode = code || 0
  })
})().catch((error) => {
  console.error(error.message)
  stop()
  process.exitCode = 1
})
