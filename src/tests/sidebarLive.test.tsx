import { beforeEach, describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Sidebar } from '../components/Sidebar'
import { useAppStore } from '../store/useAppStore'
import type { LiveSession } from '../types'

describe('sidebar while live', () => {
  beforeEach(() => {
    useAppStore.setState({ settings: { ...useAppStore.getState().settings, locale: 'en' }, live: null })
  })

  it('shows the next service and status when not live, and hides both while live', () => {
    const { container, rerender } = render(<Sidebar current="home" />)
    expect(container.querySelector('.sidebar-service')).not.toBeNull()
    expect(container.querySelector('.sidebar-footer')).not.toBeNull()

    useAppStore.setState({ live: { isLive: true } as LiveSession })
    rerender(<Sidebar current="home" />)
    expect(container.querySelector('.sidebar-service')).toBeNull()
    expect(container.querySelector('.sidebar-footer')).toBeNull()
  })
})
