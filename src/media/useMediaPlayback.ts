import { useContext, useEffect, useRef, useState } from 'react'
import type { SlideElement } from '../types'
import { PlaybackContext } from './PlaybackContext'
import { isBackgroundMedia, mediaPosition } from './playback'

export function useMediaPlayback(element: SlideElement) {
  const ref = useRef<HTMLMediaElement | null>(null)
  const context = useContext(PlaybackContext)
  const transport = context.session?.elements[element.id]
  const [blocked, setBlocked] = useState(false)
  const background = isBackgroundMedia(element)
  useEffect(() => {
    const video = ref.current
    if (!video) return
    let disposed = false, visible = typeof IntersectionObserver === 'undefined', attempting = false
    setBlocked(false)
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const sync = () => {
      if (disposed) return
      video.muted = !context.audible || (transport?.muted ?? background)
      video.volume = transport?.volume ?? element.settings?.volume ?? 1
      video.loop = transport?.loop ?? element.settings?.loop ?? background
      if (context.output && transport && Number.isFinite(video.duration) && video.duration > 0) {
        const position = mediaPosition(transport, Date.now(), video.duration)
        if (Math.abs(video.currentTime - position) > (transport.status === 'playing' ? 0.2 : 0.04)) video.currentTime = position
      }
      // Foreground editor previews are controlled by the operator, never by the output clock.
      if (!context.output && !background) return
      const shouldPlay = context.output
        ? transport?.status === 'playing' && !context.frozen && !(video.ended && !video.loop)
        : background && visible && !document.hidden && !reduced?.matches && !document.body.classList.contains('reduced-motion')
      if (!shouldPlay) { if (!video.paused) video.pause(); return }
      if (video.paused && !attempting && video.readyState >= 2) {
        attempting = true
        void video.play().then(() => { if (!disposed) { setBlocked(false); video.dataset.playbackBlocked = 'false' } }).catch(() => {
          if (!disposed) { setBlocked(true); video.dataset.playbackBlocked = 'true' }
        }).finally(() => { attempting = false })
      }
    }
    const observer = !context.output && typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() }) : null
    observer?.observe(video)
    const preferences = new MutationObserver(sync)
    preferences.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    video.addEventListener('loadedmetadata', sync)
    video.addEventListener('canplay', sync)
    document.addEventListener('visibilitychange', sync)
    reduced?.addEventListener('change', sync)
    const timer = window.setInterval(sync, 250)
    sync()
    return () => {
      disposed = true; clearInterval(timer); observer?.disconnect(); preferences.disconnect()
      video.removeEventListener('loadedmetadata', sync); video.removeEventListener('canplay', sync)
      document.removeEventListener('visibilitychange', sync); reduced?.removeEventListener('change', sync)
      if (!video.paused) video.pause()
    }
  }, [context.output, context.audible, context.frozen, transport, element.source, element.settings?.volume, element.settings?.loop, background])
  return { ref, blocked, output: context.output, background }
}
