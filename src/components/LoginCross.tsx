import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

/** Decorative timeline: light reveals the cross, then a dove lands and settles. */
export function LoginCross({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const scope = root.current
    if (!scope) return
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let context: gsap.Context | undefined
    let sequence: gsap.core.Timeline | undefined
    const play = () => {
      context?.revert()
      if (reducedMotion || preference?.matches) return
      context = gsap.context(() => {
        gsap.set('.cross-stem', { scaleY: 0, transformOrigin: '50% 100%' })
        gsap.set('.cross-arm', { scaleX: 0, transformOrigin: '50% 50%' })
        gsap.set('.cross-dove', { x: -170, y: -130, rotation: -12, opacity: 0 })
        gsap.set('.dove-wing', { scaleY: 1, rotation: -32, transformOrigin: '58px 48px' })
        sequence = gsap.timeline({ defaults: { ease: 'power3.inOut' } })
        sequence
          .to('.cross-stem', { scaleY: 1, duration: 2.8 }, 0.3)
          .to('.cross-arm', { scaleX: 1, duration: 2 }, 1.6)
          .to('.cross-dove', { opacity: 1, duration: 1 }, 3.3)
          .to(
            '.cross-dove',
            { x: -42, y: -34, rotation: 3, duration: 2.2, ease: 'power2.out' },
            3.3,
          )
          .to(
            '.dove-wing',
            { rotation: 22, duration: 0.35, repeat: 5, yoyo: true, ease: 'sine.inOut' },
            3.4,
          )
          .to('.cross-dove', { x: 0, y: 0, rotation: 0, duration: 1.1, ease: 'power3.out' }, 5.5)
          .to('.dove-wing', { rotation: 0, scaleY: 0.28, duration: 0.8, ease: 'power2.out' }, 5.6)
          .to(
            '.cross-dove',
            { y: 2, duration: 0.25, yoyo: true, repeat: 1, ease: 'sine.inOut' },
            6.5,
          )
          .to(
            '.cross-light',
            { opacity: 0.55, duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut' },
            6.8,
          )
      }, scope)
    }
    const visibility = () => {
      sequence?.paused(document.hidden)
      scope.parentElement?.classList.toggle('login-animation-paused', document.hidden)
    }
    play()
    visibility()
    document.addEventListener('visibilitychange', visibility)
    preference?.addEventListener('change', play)
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      scope.parentElement?.classList.remove('login-animation-paused')
      preference?.removeEventListener('change', play)
      context?.revert()
    }
  }, [reducedMotion])
  return (
    <div ref={root} className="login-cross" aria-hidden="true">
      <div className="cross-light">
        <span className="cross-stem" />
        <span className="cross-arm" />
      </div>
      <svg className="cross-dove" viewBox="0 0 120 90" fill="none" focusable="false">
        <path
          d="M35 57L10 66L22 48L13 45L38 42C49 34 61 33 72 39L80 33C77 21 82 15 90 16C98 16 103 23 100 30L111 34L99 38C96 52 86 61 70 63L63 72L57 71L59 62C49 63 42 61 35 57Z"
          fill="currentColor"
        />
        <path
          className="dove-wing"
          d="M70 46C49 27 31 24 14 8C14 29 25 48 46 54C54 57 65 55 70 46Z"
          fill="currentColor"
          stroke="rgb(18 18 28 / .3)"
          strokeWidth="1.2"
        />
        <path
          d="M61 71L61 77M69 63L72 76M56 77H66M68 77H78"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="92" cy="24" r="1.8" fill="#171720" />
      </svg>
    </div>
  )
}
