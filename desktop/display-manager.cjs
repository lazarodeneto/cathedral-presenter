'use strict'

const ROLES = new Set(['audience', 'confidence', 'broadcast', 'disabled'])

function createDisplayManager({
  screen,
  createWindow,
  getOperatorDisplayId,
  roles,
  saveRoles,
  notify,
}) {
  const windows = new Map()
  function isOperator(display) {
    const operator = screen
      .getAllDisplays()
      .find((item) => String(item.id) === String(getOperatorDisplayId()))
    if (!operator) return true
    const a = display.bounds
    const b = operator.bounds
    // Mirrored logical displays may share bounds: they are not independent outputs.
    return (
      String(display.id) === String(operator.id) ||
      (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y)
    )
  }
  function list() {
    const primaryId = String(screen.getPrimaryDisplay().id)
    return screen.getAllDisplays().map((display) => ({
      id: String(display.id),
      name: display.label || `Display ${display.id}`,
      width: Math.round(display.size.width * display.scaleFactor),
      height: Math.round(display.size.height * display.scaleFactor),
      bounds: { ...display.bounds },
      scaleFactor: display.scaleFactor,
      primary: String(display.id) === primaryId,
      operator: isOperator(display),
      role: ROLES.has(roles[String(display.id)]) ? roles[String(display.id)] : 'disabled',
      open: windows.has(String(display.id)),
    }))
  }
  function close(id) {
    const window = windows.get(String(id))
    if (window && !window.isDestroyed()) window.close()
    windows.delete(String(id))
  }
  function setRole(id, role) {
    id = String(id)
    if (!ROLES.has(role) || !list().some((display) => display.id === id))
      throw new Error('Invalid display assignment')
    if (list().find((display) => display.id === id)?.operator && role !== 'disabled')
      throw new Error('Operator display is reserved')
    if (roles[id] !== role) close(id)
    roles[id] = role
    saveRoles(roles)
    notify(list())
    return list()
  }
  function open(id) {
    id = String(id)
    const display = screen.getAllDisplays().find((entry) => String(entry.id) === id)
    const role = roles[id]
    if (!display || isOperator(display) || !ROLES.has(role) || role === 'disabled') return false
    const existing = windows.get(id)
    if (existing && !existing.isDestroyed()) return true
    const window = createWindow({ id, role, bounds: { ...display.bounds } })
    windows.set(id, window)
    window.on('closed', () => {
      if (windows.get(id) === window) windows.delete(id)
      notify(list())
    })
    notify(list())
    return true
  }
  function openRole(role) {
    const targets = list().filter((display) => display.role === role && !display.operator)
    return targets.length > 0 && targets.every((display) => open(display.id))
  }
  function refresh() {
    const connected = new Map(
      screen.getAllDisplays().map((display) => [String(display.id), display]),
    )
    for (const [id, window] of windows) {
      // Never let the OS move a missing output window to the operator's display.
      if (!connected.has(id) || isOperator(connected.get(id))) close(id)
      else if (!window.isDestroyed()) window.setBounds({ ...connected.get(id).bounds })
    }
    notify(list())
  }
  return {
    list,
    setRole,
    open,
    openRole,
    close,
    refresh,
    closeRole: (role) => {
      for (const [id] of windows) if (roles[id] === role) close(id)
    },
    closeAll: () => {
      for (const [id] of windows) close(id)
    },
  }
}
module.exports = { createDisplayManager }
