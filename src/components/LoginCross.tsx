import { useEffect, useRef, useState } from 'react'
import loginVideo from '../assets/login-background.mp4'
import loginPoster from '../assets/login-background-poster.jpg'

/** User-supplied background video; the poster remains available if playback is paused or blocked. */
export function LoginCross({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [staticMode, setStaticMode] = useState(
    () => reducedMotion || Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  )
  const [hasFrame, setHasFrame] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const sync = () => {
      const shouldReduce = reducedMotion || Boolean(preference?.matches)
      setStaticMode(shouldReduce)
      video.muted = true
      if (shouldReduce || document.hidden) {
        video.pause()
        return
      }
      // Autoplay can be blocked by browser policy; retain the poster in that case.
      void video.play()?.catch(() => setHasFrame(false))
    }
    sync()
    preference?.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      preference?.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', sync)
      video.pause()
    }
  }, [reducedMotion])

  return (
    <div className="login-cinema" aria-hidden="true">
      <img className="cinema-scene cinema-poster" src={loginPoster} alt="" decoding="async" />
      <video
        ref={videoRef}
        className={`cinema-scene cinema-video ${hasFrame && !staticMode ? 'has-frame' : ''}`}
        src={loginVideo}
        poster={loginPoster}
        autoPlay={!staticMode}
        muted
        loop
        playsInline
        preload={staticMode ? 'none' : 'auto'}
        tabIndex={-1}
        disablePictureInPicture
        disableRemotePlayback
        onPlaying={() => setHasFrame(true)}
        onError={() => setHasFrame(false)}
      />
      <div className="cinema-shade" />
    </div>
  )
}
