'use strict'
const { mkdirSync, writeFileSync, existsSync } = require('node:fs')
const { join, resolve } = require('node:path')
const { spawn } = require('node:child_process')
const root = resolve(__dirname, '..')
const directory = join(root, '.data', 'antivirus')
const database = process.env.CLAMAV_DATABASE_DIR || join(directory, 'db')
mkdirSync(database, { recursive: true, mode: 0o700 })
const config = join(directory, 'freshclam.conf')
writeFileSync(config, `DatabaseDirectory ${database}\nDatabaseMirror database.clamav.net\nForeground yes\n`, { mode: 0o600 })
const candidates = process.platform === 'win32'
  ? [join(process.env.ProgramFiles || 'C:\\Program Files', 'ClamAV', 'freshclam.exe')]
  : ['/opt/homebrew/bin/freshclam', '/usr/local/bin/freshclam', '/usr/bin/freshclam']
const executable = process.env.FRESHCLAM_PATH || candidates.find(existsSync) || 'freshclam'
const child = spawn(executable, [`--config-file=${config}`, '--stdout'], { stdio: 'inherit', windowsHide: true })
child.on('error', () => { console.error('Install ClamAV and add freshclam to PATH, or set FRESHCLAM_PATH.'); process.exitCode = 1 })
child.on('exit', (code) => { process.exitCode = code || 0 })
