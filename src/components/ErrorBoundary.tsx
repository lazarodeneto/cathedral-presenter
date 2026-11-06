import { Component, type ReactNode } from 'react'
import { useT } from '../i18n/useT'

class Boundary extends Component<
  { children: ReactNode; fallback: ReactNode; output?: boolean },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    if (!this.props.output) return
    const count = Number(sessionStorage.getItem('cathedral:output-recovery') ?? '0')
    if (count < 3) { sessionStorage.setItem('cathedral:output-recovery', String(count + 1)); setTimeout(() => window.location.reload(), 1000) }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function ErrorBoundary({ children, output = false }: { children: ReactNode; output?: boolean }) {
  const t = useT()
  return (
    <Boundary output={output}
      fallback={output ? <div className="output-black" role="img" aria-label={t('output.blank')} /> :
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
