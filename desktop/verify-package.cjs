'use strict'
const { spawn } = require('node:child_process')
const { mkdtemp, rm } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const path = require('node:path')
;(async () => {
  const profile = await mkdtemp(path.join(tmpdir(), 'cathedral-smoke-'))
  const binary = process.platform === 'win32' ? 'release/win-unpacked/Cathedral Presenter.exe' : (process.arch === 'arm64' ? 'release/mac-arm64/Cathedral Presenter.app/Contents/MacOS/Cathedral Presenter' : 'release/mac/Cathedral Presenter.app/Contents/MacOS/Cathedral Presenter')
  const env = { ...process.env, CATHEDRAL_PROFILE_DIR: profile }; delete env.ELECTRON_RUN_AS_NODE
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(path.resolve(binary), ['--verify-runtime'], { env })
      let result = ''
      const deadline = setTimeout(() => { child.kill(); reject(new Error('Packaged app did not become ready')) }, 30000)
      child.stdout.on('data', (data) => { result += data; process.stdout.write(data) })
      child.stderr.on('data', (data) => process.stderr.write(data))
      child.once('error', (error) => { clearTimeout(deadline); reject(error) })
      child.once('close', (code) => {
        clearTimeout(deadline)
        if (code === 0 && result.includes('"rendererReady":true')) resolve()
        else reject(new Error(`Packaged app failed (${code})`))
      })
    })
  } finally { await rm(profile, { recursive: true, force: true }) }
})().catch((error) => { console.error(error.message); process.exitCode = 1 })
