'use strict'
const { app, BrowserWindow, ipcMain, screen, session, shell } = require('electron')
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { createDisplayManager } = require('./display-manager.cjs')
const { autoUpdater } = require('electron-updater')

// Only the local application receives native capabilities. Never disable web security.
const verifying = process.argv.includes('--verify-runtime')
let BASE = 'http://localhost:4173'
app.setName('Cathedral Presenter')
if (app.isPackaged) app.setAsDefaultProtocolClient('cathedral-presenter')
const profile = process.env.CATHEDRAL_PROFILE_DIR || path.join(app.getPath('appData'), 'Cathedral Presenter')
mkdirSync(profile, { recursive: true })
app.setPath('userData', profile)
if (!app.requestSingleInstanceLock()) app.quit()
let operator
app.on('open-url', (event, value) => {
  event.preventDefault()
  try {
    const url = new URL(value)
    if (url.protocol !== 'cathedral-presenter:' || url.hostname !== 'open' || !['', '/'].includes(url.pathname) || url.search || url.hash || url.username || url.password) return
    if (operator && !operator.isDestroyed()) { if (operator.isMinimized()) operator.restore(); operator.show(); operator.focus() }
  } catch { /* Only the fixed open-app link is accepted. */ }
})
app.on('second-instance', () => { if (operator && !operator.isDestroyed()) { if (operator.isMinimized()) operator.restore(); operator.show(); operator.focus() } })
let displays
let quitting = false
let updaterReady = false
function sendUpdateStatus(status) {
  if (operator && !operator.isDestroyed()) operator.webContents.send('app:update-status', status)
}
function configureUpdater() {
  if (!app.isPackaged) return
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.setFeedURL({ provider: 'github', owner: 'lazarodeneto', repo: 'church-presenter' })
  autoUpdater.on('checking-for-update', () => sendUpdateStatus({ state: 'checking' }))
  autoUpdater.on('update-available', (info) => sendUpdateStatus({ state: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => sendUpdateStatus({ state: 'current', version: app.getVersion() }))
  autoUpdater.on('download-progress', (progress) => sendUpdateStatus({ state: 'downloading', percent: Math.round(progress.percent) }))
  autoUpdater.on('update-downloaded', (info) => sendUpdateStatus({ state: 'downloaded', version: info.version }))
  autoUpdater.on('error', (error) => sendUpdateStatus({ state: 'error', message: error.message }))
  updaterReady = true
}
function protect(window) {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event, url) => {
    try {
      const target = new URL(url)
      if (target.origin !== BASE || target.pathname !== '/') event.preventDefault()
    } catch {
      event.preventDefault()
    }
  })
  window.webContents.on('will-redirect', (event, url) => {
    try {
      const target = new URL(url)
      if (target.origin !== BASE || target.pathname !== '/') event.preventDefault()
    } catch {
      event.preventDefault()
    }
  })
  window.webContents.on('will-attach-webview', (event) => event.preventDefault())
}
function preferences() {
  return {
    preload: path.join(__dirname, 'preload.cjs'),
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
    backgroundThrottling: false,
    autoplayPolicy: 'no-user-gesture-required',
    partition: 'persist:cathedral-presenter',
  }
}
function operatorOnly(event) {
  if (
    !operator ||
    event.sender !== operator.webContents ||
    event.senderFrame !== operator.webContents.mainFrame ||
    new URL(event.senderFrame.url).origin !== BASE ||
    new URL(event.senderFrame.url).pathname !== '/'
  )
    throw new Error('Native operation denied')
}
app.whenReady().then(async () => {
  if (app.isPackaged) {
    const { startServer } = await import(pathToFileURL(path.join(__dirname, 'build/server.mjs')).href)
    const port = Number(process.env.CATHEDRAL_PORT) || 4173
    let localServer
    try { localServer = await startServer(profile, path.join(app.getAppPath(), 'dist'), port) }
    catch (error) { if (error.code !== 'EADDRINUSE') throw error; localServer = await startServer(profile, path.join(app.getAppPath(), 'dist'), 0) }
    BASE = `http://localhost:${localServer.address().port}`
    app.once('will-quit', () => { localServer.closeAllConnections(); localServer.close() })
  }
  session
    .fromPartition('persist:cathedral-presenter')
    .setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  const configFile = path.join(app.getPath('userData'), 'display-roles.json')
  let roles = {}
  try {
    const saved = JSON.parse(readFileSync(configFile, 'utf8'))
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) roles = saved
  } catch {
    /* New installation. */
  }
  operator = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 760,
    minHeight: 560,
    title: 'Cathedral Presenter',
    show: !verifying,
    backgroundColor: '#0b0b0c',
    webPreferences: preferences(),
  })
  configureUpdater()
  protect(operator)
  displays = createDisplayManager({
    screen,
    roles,
    getOperatorDisplayId: () =>
      operator.isDestroyed()
        ? screen.getPrimaryDisplay().id
        : screen.getDisplayMatching(operator.getBounds()).id,
    saveRoles: (next) => writeFileSync(configFile, JSON.stringify(next), { mode: 0o600 }),
    notify: (items) => {
      if (!quitting && !operator.isDestroyed()) operator.webContents.send('displays:changed', items)
    },
    createWindow: ({ id, role, bounds }) => {
      const output = new BrowserWindow({
        ...bounds,
        show: false,
        frame: false,
        resizable: false,
        movable: false,
        focusable: false,
        backgroundColor: '#000000',
        skipTaskbar: true,
        title: `Cathedral Presenter · ${role}`,
        webPreferences: preferences(),
      })
      protect(output)
      let retries = 0
      output.webContents.on('render-process-gone', () => {
        if (quitting || output.isDestroyed() || retries++ >= 3) return
        setTimeout(() => { if (!output.isDestroyed()) void output.loadURL(`${BASE}/#/output/${role}/${encodeURIComponent(id)}`).catch(() => {}) }, 1000 * retries)
      })
      output.webContents.on('did-fail-load', (_event, code) => {
        if (code === -3 || quitting || output.isDestroyed() || retries++ >= 3) return
        setTimeout(() => { if (!output.isDestroyed()) void output.loadURL(`${BASE}/#/output/${role}/${encodeURIComponent(id)}`).catch(() => {}) }, 1000 * retries)
      })
      output.setMenuBarVisibility(false)
      output.loadURL(`${BASE}/#/output/${role}/${encodeURIComponent(id)}`)
      output.once('ready-to-show', () => {
        if (output.isDestroyed()) return
        // Recheck attachment before showing, including disconnects during loading.
        if (!screen.getAllDisplays().some((display) => String(display.id) === id))
          return output.close()
        output.setBounds(bounds)
        if (process.platform === 'darwin') output.setSimpleFullScreen(true)
        else output.setFullScreen(true)
        output.showInactive()
      })
      return output
    },
  })
  for (const [name, handler] of Object.entries({
    // Fixed local destination; renderers cannot choose a URL or protocol to launch.
    'app:media-browser': () => shell.openExternal(`${BASE}/#/media`),
    'app:update-check': async () => {
      if (!updaterReady) return { state: 'unsupported' }
      try {
        const result = await autoUpdater.checkForUpdates()
        if (!result?.updateInfo) return { state: 'current', version: app.getVersion() }
        if (result.updateInfo.version === app.getVersion()) return { state: 'current', version: app.getVersion() }
        return { state: 'available', version: result.updateInfo.version }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Update check failed'
        if (/404|no published releases|latest release/i.test(message)) return { state: 'current', version: app.getVersion() }
        return { state: 'error', message }
      }
    },
    'app:update-download': async () => {
      if (!updaterReady) return { state: 'unsupported' }
      try { await autoUpdater.downloadUpdate(); return { state: 'downloading' } }
      catch (error) { return { state: 'error', message: error instanceof Error ? error.message : 'Update download failed' } }
    },
    'app:update-install': () => {
      if (!updaterReady) return { state: 'unsupported' }
      quitting = true
      setImmediate(() => autoUpdater.quitAndInstall(false, true))
      return { state: 'installing' }
    },
    'displays:list': () => displays.list(),
    'displays:assign': (id, role) => displays.setRole(id, role),
    'displays:open': (id) => displays.open(id),
    'displays:close': (id) => {
      displays.close(id)
      return displays.list()
    },
    'displays:open-role': (role) => displays.openRole(role),
    'displays:close-role': (role) => displays.closeRole(role),
  }))
    ipcMain.handle(name, (event, ...args) => {
      operatorOnly(event)
      return handler(...args)
    })
  for (const event of ['display-added', 'display-removed', 'display-metrics-changed'])
    screen.on(event, () => {
      if (!quitting) displays.refresh()
    })
  operator.on('move', () => {
    if (!quitting) displays.refresh()
  })
  operator.on('closed', () => {
    quitting = true
    displays.closeAll()
    app.quit()
  })
  operator.webContents.on('render-process-gone', () => {
    if (!quitting && !operator.isDestroyed()) setTimeout(() => { if (!operator.isDestroyed()) void operator.loadURL(`${BASE}/?recovery=1#/home`).catch(() => {}) }, 1000)
  })
  if (verifying) {
    const deadline = setTimeout(() => { console.error('Native verification timed out'); app.exit(1) }, 20000)
    ipcMain.once('app:ready', (event) => {
      operatorOnly(event); clearTimeout(deadline)
      console.log(JSON.stringify({ packaged: app.isPackaged, rendererReady: true, displays: displays.list().length, platform: process.platform, origin: BASE }))
      app.quit()
    })
  }
  operator.loadURL(`${BASE}/#/home`)
}).catch((error) => { require('electron').dialog.showErrorBox('Cathedral Presenter', error.message); app.quit() })
app.on('before-quit', () => {
  quitting = true
  displays?.closeAll()
})
app.on('window-all-closed', () => app.quit())
