import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'

export type RouteName =
  | 'login'
  | 'home'
  | 'calendar'
  | 'services'
  | 'bible'
  | 'biblemode'
  | 'songs'
  | 'media'
  | 'templates'
  | 'settings'
  | 'service'
  | 'live'
  | 'output'

export interface Route {
  name: RouteName
  segments: string[]
  id?: string
}

function parse(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '')
  const segments = raw.split('/').filter(Boolean)
  const name = (segments[0] || 'home') as RouteName
  const known: RouteName[] = [
    'login',
    'home',
    'calendar',
    'services',
    'bible',
    'biblemode',
    'songs',
    'media',
    'templates',
    'settings',
    'service',
    'live',
    'output',
  ]
  if (!known.includes(name)) return { name: 'home', segments: [] }
  if (name === 'service') return { name, segments, id: segments[1] }
  if (name === 'output') return { name, segments, id: segments[1] }
  return { name, segments }
}

/**
 * A screen with unsaved changes can block navigation. The guard receives the
 * target hash and returns true to allow it; when it returns false the screen
 * is expected to ask the user, then call navigate(target, { force: true }).
 */
type NavigationGuard = (target: string) => boolean
let navigationGuard: NavigationGuard | null = null
let forcedTarget: string | null = null

export function setNavigationGuard(guard: NavigationGuard | null) {
  navigationGuard = guard
}

export function navigate(path: string, options: { force?: boolean } = {}) {
  const target = path.startsWith('#') ? path : `#${path.startsWith('/') ? '' : '/'}${path}`
  if (!options.force && navigationGuard && target !== window.location.hash && !navigationGuard(target)) return
  if (options.force) forcedTarget = target
  if (window.location.hash === target) {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    return
  }
  window.location.hash = target
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash))

  useEffect(() => {
    let current = window.location.hash
    const onChange = () => {
      const next = window.location.hash
      // Back/forward buttons change the hash directly; undo it if a guard objects.
      const forced = next === forcedTarget
      forcedTarget = null
      if (!forced && next !== current && navigationGuard && !navigationGuard(next)) {
        window.history.replaceState(null, '', current)
        return
      }
      const from = parse(current).name
      const to = parse(next).name
      if ((from === 'service' && to === 'biblemode') || (from === 'biblemode' && to === 'service')) {
        useAppStore.getState().blankForModeTransition()
      }
      current = next
      setRoute(parse(next))
    }
    window.addEventListener('hashchange', onChange)
    if (!window.location.hash) window.location.replace('#/home')
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}
