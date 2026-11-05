import { useId } from 'react'
import type { Locale } from '../types'

/**
 * Round flag for an interface language, drawn as SVG so it looks the same on
 * every system (emoji flags do not render on Windows and vary by platform).
 * Shapes are simplified to stay legible at 16-24px.
 */
export function LocaleFlag({ locale, size = 18 }: { locale: Locale; size?: number }) {
  const clip = useId()
  return (
    <svg className="locale-flag" width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clip}>
          <circle cx="10" cy="10" r="10" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>{FLAGS[locale]}</g>
      <circle cx="10" cy="10" r="9.5" fill="none" stroke="rgb(255 255 255 / 0.28)" strokeWidth="1" />
    </svg>
  )
}

const FLAGS: Record<Locale, React.ReactNode> = {
  en: (
    <>
      <rect width="20" height="20" fill="#012169" />
      <path d="M0 0 20 20M20 0 0 20" stroke="#ffffff" strokeWidth="4" />
      <path d="M0 0 20 20M20 0 0 20" stroke="#c8102e" strokeWidth="1.6" />
      <path d="M10 0v20M0 10h20" stroke="#ffffff" strokeWidth="6" />
      <path d="M10 0v20M0 10h20" stroke="#c8102e" strokeWidth="3.4" />
    </>
  ),
  pt: (
    <>
      <rect width="20" height="20" fill="#da291c" />
      <rect width="8" height="20" fill="#046a38" />
      <circle cx="8" cy="10" r="3.6" fill="#ffcc29" />
      <circle cx="8" cy="10" r="2.1" fill="#da291c" />
      <circle cx="8" cy="10" r="1.2" fill="#ffffff" />
    </>
  ),
  'pt-BR': (
    <>
      <rect width="20" height="20" fill="#009b3a" />
      <path d="M10 3.2 18.4 10 10 16.8 1.6 10Z" fill="#fedf00" />
      <circle cx="10" cy="10" r="4.1" fill="#002776" />
      <path d="M6.1 9.1c2.6-.6 5.4-.3 7.8 1" stroke="#ffffff" strokeWidth="0.9" fill="none" />
    </>
  ),
  es: (
    <>
      <rect width="20" height="20" fill="#aa151b" />
      <rect y="5" width="20" height="10" fill="#f1bf00" />
    </>
  ),
  fr: (
    <>
      <rect width="20" height="20" fill="#ffffff" />
      <rect width="6.7" height="20" fill="#002654" />
      <rect x="13.3" width="6.7" height="20" fill="#ce1126" />
    </>
  ),
  de: (
    <>
      <rect width="20" height="20" fill="#ffce00" />
      <rect width="20" height="6.7" fill="#000000" />
      <rect y="6.7" width="20" height="6.6" fill="#dd0000" />
    </>
  ),
  it: (
    <>
      <rect width="20" height="20" fill="#ffffff" />
      <rect width="6.7" height="20" fill="#009246" />
      <rect x="13.3" width="6.7" height="20" fill="#ce2b37" />
    </>
  ),
}
