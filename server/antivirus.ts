import { execFile } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

export type ScanResult = 'clean' | 'infected' | 'unavailable'

export function antivirus(root: string, env: Record<string, string | undefined>) {
  const candidates = process.platform === 'win32'
    ? [join(env.ProgramFiles ?? 'C:\\Program Files', 'ClamAV', 'clamscan.exe')]
    : ['/opt/homebrew/bin/clamscan', '/usr/local/bin/clamscan', '/usr/bin/clamscan']
  const executable = env.CLAMSCAN_PATH || candidates.find(existsSync) || 'clamscan'
  const localDatabase = join(root, '.data', 'antivirus', 'db')
  const database = env.CLAMAV_DATABASE_DIR || (existsSync(join(localDatabase, 'daily.cvd')) ? localDatabase : undefined)
  return {
    databaseUpdatedAt: () => {
      try { return database ? statSync(join(database, 'daily.cvd')).mtime.toISOString() : null } catch { return null }
    },
    scan: (file: string): Promise<ScanResult> => new Promise((resolve) => {
      const args = ['--no-summary', '--infected', '--max-filesize=350M', '--max-scansize=600M', '--alert-exceeds-max=yes', ...(database ? [`--database=${database}`] : []), file]
      execFile(executable, args, { timeout: 120000, maxBuffer: 1024 * 1024, windowsHide: true }, (error) => {
        if (!error) resolve('clean')
        else if ('code' in error && error.code === 1) resolve('infected')
        else resolve('unavailable')
      })
    }),
  }
}
