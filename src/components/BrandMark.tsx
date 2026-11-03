import { useEffect, useState } from 'react'
import type { Branding } from '../types'

export function BrandMark({
  branding,
  size = 'md',
}: {
  branding: Pick<Branding, 'name' | 'logoUrl'>
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const label = branding.name.trim() || 'Church Presenter'
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
  // A stored logo that no longer decodes falls back to the initials mark.
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [branding.logoUrl])
  const showLogo = Boolean(branding.logoUrl) && !failed

  return (
    <span className={`brand-mark brand-mark-${size} ${showLogo ? 'has-logo' : ''}`} aria-hidden="true">
      {showLogo ? (
        <img src={branding.logoUrl!} alt="" onError={() => setFailed(true)} />
      ) : (
        <>
          <span className="brand-mark-arch" />
          <span className="brand-mark-initials">{initials || 'CP'}</span>
        </>
      )}
    </span>
  )
}
