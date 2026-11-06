'use strict'
const { mkdtemp, mkdir, cp, writeFile, rm } = require('node:fs/promises')
const { readFileSync } = require('node:fs')
const { tmpdir } = require('node:os')
const path = require('node:path')
const { spawn } = require('node:child_process')
const root = path.resolve(__dirname, '..')
async function run(command, args, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', env: process.env, shell: process.platform === 'win32' && command === 'npm' })
    child.on('error', reject)
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Release build stopped (${code})`)))
  })
}
;(async () => {
  if ((process.argv.includes('--win') && process.platform !== 'win32') || (process.argv.includes('--mac') && process.platform !== 'darwin')) throw new Error('Build on the target operating system: the SQLite native module cannot be cross-compiled. Use the Desktop validation workflow for Windows and macOS artifacts.')
  const stage = await mkdtemp(path.join(tmpdir(), 'cathedral-release-'))
  try {
    const original = JSON.parse(readFileSync(path.join(root, 'package.json')))
    const lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json')))
    const dependencies = Object.fromEntries(['better-auth', 'better-sqlite3', 'fflate'].map((name) => [name, lock.packages[`node_modules/${name}`].version]))
    const metadata = { private: true, name: original.name, version: original.version, description: original.description, author: original.author ?? 'Cathedral Presenter', main: 'desktop/main.cjs', dependencies, devDependencies: { electron: lock.packages['node_modules/electron'].version } }
    await writeFile(path.join(stage, 'package.json'), JSON.stringify(metadata, null, 2))
    await cp(path.join(root, 'dist'), path.join(stage, 'dist'), { recursive: true })
    await mkdir(path.join(stage, 'desktop'))
    for (const name of ['main.cjs', 'preload.cjs', 'display-manager.cjs', 'cathedral.icns', 'cathedral.ico']) await cp(path.join(root, 'desktop', name), path.join(stage, 'desktop', name))
    await cp(path.join(root, 'desktop/build'), path.join(stage, 'desktop/build'), { recursive: true })
    await cp(path.join(root, 'electron-builder.yml'), path.join(stage, 'electron-builder.yml'))
    // Native rebuild happens here, never in the operator's development checkout.
    await run('npm', ['install', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], stage)
    await run(process.execPath, [require.resolve('electron-builder/cli.js'), '--projectDir', stage, '--config', path.join(stage, 'electron-builder.yml'), '--config.directories.output', path.join(root, 'release'), '--publish', 'never', ...process.argv.slice(2)], stage)
  } finally { await rm(stage, { recursive: true, force: true }) }
})().catch((error) => { console.error(error.message); process.exitCode = 1 })
