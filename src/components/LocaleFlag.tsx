import { useId, type ReactNode } from 'react'
import type { Locale } from '../types'

// Minimal round flags drawn on a 24×24 grid: flat colours, simplified emblems,
// a faint inner ring so light flags (France, Italy) keep their edge on dark chrome.

function shapes(locale: Locale): ReactNode {
  switch (locale) {
    case 'en':
      return (
        <>
          <rect width="24" height="24" fill="#1f3a8a" />
          <path d="M0 0L24 24M24 0L0 24" stroke="#fff" strokeWidth="5" />
          <path d="M0 0L24 24M24 0L0 24" stroke="#d22f3c" strokeWidth="1.8" />
          <path d="M12 0V24M0 12H24" stroke="#fff" strokeWidth="7" />
          <path d="M12 0V24M0 12H24" stroke="#d22f3c" strokeWidth="4" />
        </>
      )
    case 'pt':
      return (
        <>
          <rect width="24" height="24" fill="#d8283a" />
          <rect width="9.6" height="24" fill="#0f6b3c" />
          <circle cx="9.6" cy="12" r="4" fill="none" stroke="#f4c52b" strokeWidth="1.6" />
          <rect x="7.9" y="9.8" width="3.4" height="4.2" rx="1" fill="#fff" stroke="#d8283a" strokeWidth="0.9" />
        </>
      )
    case 'pt-BR':
      return (
        <>
          <rect width="24" height="24" fill="#1a8a4c" />
          <path d="M2.5 12L12 5L21.5 12L12 19Z" fill="#f6cf2c" />
          <circle cx="12" cy="12" r="4.4" fill="#22408f" />
          <path d="M7.8 11.1C10.6 10.4 13.6 10.8 16.2 12.6" fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
        </>
      )
    case 'es':
      return (
        <>
          <rect width="24" height="24" fill="#c8102e" />
          <rect y="6" width="24" height="12" fill="#f7c600" />
        </>
      )
    case 'fr':
      return (
        <>
          <rect width="24" height="24" fill="#fff" />
          <rect width="8" height="24" fill="#1f4ea3" />
          <rect x="16" width="8" height="24" fill="#e1253a" />
        </>
      )
    case 'de':
      return (
        <>
          <rect width="24" height="8" fill="#151515" />
          <rect y="8" width="24" height="8" fill="#dd1f26" />
          <rect y="16" width="24" height="8" fill="#ffcc1d" />
        </>
      )
    case 'it':
      return (
        <>
          <rect width="24" height="24" fill="#fff" />
          <rect width="8" height="24" fill="#0f8a46" />
          <rect x="16" width="8" height="24" fill="#d52b1e" />
        </>
      )
    default:
      return <rect width="24" height="24" fill="#3a3a40" />
  }
}

export function LocaleFlag({ locale, size = 18, className = '' }: { locale: Locale; size?: number; className?: string }) {
  const clip = `flag-${useId().replace(/:/g, '')}`
  return (
    <svg
      className={`locale-flag ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <clipPath id={clip}>
        <circle cx="12" cy="12" r="12" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>{shapes(locale)}</g>
      <circle cx="12" cy="12" r="11.5" fill="none" stroke="rgb(255 255 255 / 0.22)" strokeWidth="1" />
    </svg>
  )
}
