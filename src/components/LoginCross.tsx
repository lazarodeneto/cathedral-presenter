import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import cinematicScene from '../assets/login-cinematic.jpg'

/** Film-style light reveal and slow camera drift over the photographic scene. */
export function LoginCross({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const scope = root.current
    if (!scope) return
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let context: gsap.Context | undefined
    let sequence: gsap.core.Timeline | undefined
    const visibility = () => sequence?.paused(document.hidden)
    const play = () => {
      context?.revert()
      if (reducedMotion || preference?.matches) return
      context = gsap.context(() => {
        sequence = gsap
          .timeline()
          .fromTo(
            '.cinema-scene',
            { opacity: 0.05, scale: 1.065 },
            { opacity: 1, scale: 1.02, duration: 5, ease: 'power2.out' },
          )
          .fromTo(
            '.cinema-light',
            { opacity: 0, xPercent: -8 },
            { opacity: 0.28, xPercent: 4, duration: 6, ease: 'sine.inOut' },
            1,
          )
          .to(
            '.cinema-scene',
            {
              scale: 1.045,
              xPercent: 0.5,
              duration: 22,
              repeat: -1,
              yoyo: true,
              ease: 'sine.inOut',
            },
            5,
          )
      }, scope)
      visibility()
    }
    play()
    preference?.addEventListener('change', play)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      preference?.removeEventListener('change', play)
      document.removeEventListener('visibilitychange', visibility)
      context?.revert()
    }
  }, [reducedMotion])
  return (
    <div ref={root} className="login-cinema" aria-hidden="true">
      <img className="cinema-scene" src={cinematicScene} alt="" decoding="async" />
      <div className="cinema-light" />
      <div className="cinema-shade" />
    </div>
  )
}
