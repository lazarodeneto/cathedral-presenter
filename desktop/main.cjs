'use strict'
const { app, BrowserWindow, ipcMain, screen, session } = require('electron')
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs')
const path = require('node:path')
const { createDisplayManager } = require('./display-manager.cjs')

// Only the local application receives native capabilities. Never disable web security.
const BASE = 'http://localhost:4173'
app.setName('Cathedral Presenter')
const profile = path.join(app.getPath('appData'), 'Cathedral Presenter')
mkdirSync(profile, { recursive: true })
app.setPath('userData', profile)
let operator
let displays
let quitting = false
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
app.whenReady().then(() => {
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
    backgroundColor: '#0b0b0c',
    webPreferences: preferences(),
  })
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
  operator.loadURL(`${BASE}/#/home`)
})
app.on('before-quit', () => {
  quitting = true
  displays?.closeAll()
})
app.on('window-all-closed', () => app.quit())
