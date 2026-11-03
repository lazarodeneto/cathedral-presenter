import { Component, type ReactNode } from 'react'
import { useT } from '../i18n/useT'

class Boundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function ErrorBoundary({ children }: { children: ReactNode }) {
  const t = useT()
  return (
    <Boundary
      fallback={
        <div className="screen" role="alert">
          <div className="empty-inline">
            <h1>{t('error.boundaryTitle')}</h1>
            <p>{t('error.boundaryCopy')}</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              {t('error.reload')}
            </button>
          </div>
        </div>
      }
    >
      {children}
    </Boundary>
  )
}
