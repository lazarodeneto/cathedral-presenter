import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { TopBar } from '../components/TopBar'
import { useAppStore } from '../store/useAppStore'

describe('top bar language menu', () => {
  beforeEach(() => {
    useAppStore.setState({ settings: { ...useAppStore.getState().settings, locale: 'en' } })
  })

  it('shows the active language and switches with mouse or keyboard', () => {
    render(<TopBar route={{ name: 'home', params: {} } as never} />)
    const trigger = screen.getByRole('button', { name: 'Language: English UK' })
    fireEvent.click(trigger)
    const list = screen.getByRole('listbox')
    expect(screen.getByRole('option', { name: /English/ })).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(screen.getByRole('option', { name: /Español/ }))
    expect(useAppStore.getState().settings.locale).toBe('es')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(list).not.toBeInTheDocument()

    fireEvent.keyDown(screen.getByRole('button', { name: /Español/ }), { key: 'ArrowDown' })
    const reopened = screen.getByRole('listbox')
    fireEvent.keyDown(reopened, { key: 'ArrowDown' })
    fireEvent.keyDown(reopened, { key: 'Enter' })
    expect(useAppStore.getState().settings.locale).toBe('fr')

    fireEvent.click(screen.getByRole('button', { name: /Français/ }))
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})
