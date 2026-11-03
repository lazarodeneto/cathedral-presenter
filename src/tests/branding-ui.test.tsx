import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { BrandingPanel } from '../components/branding/BrandingPanel'
import { navigate, setNavigationGuard } from '../hooks/useHashRoute'
import { DEFAULT_CHURCH_ID, useAppStore } from '../store/useAppStore'
import { DEFAULT_BRANDING } from '../utils/branding'

describe('branding settings panel', () => {
  afterEach(cleanup)
  beforeEach(() => {
    setNavigationGuard(null)
    window.location.hash = '#/settings/identity'
    useAppStore.setState({
      churchId: DEFAULT_CHURCH_ID,
      branding: DEFAULT_BRANDING,
      brandingProfiles: { [DEFAULT_CHURCH_ID]: DEFAULT_BRANDING },
      settings: { ...useAppStore.getState().settings, locale: 'en' },
    })
  })

  it('validates, saves, and updates the saved branding', () => {
    render(<BrandingPanel />)
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()

    const name = screen.getByLabelText(/Church name/)
    fireEvent.change(name, { target: { value: '   ' } })
    expect(screen.getByText('This field can’t be empty.')).toBeInTheDocument()
    fireEvent.click(save)
    expect(useAppStore.getState().branding.name).toBe(DEFAULT_BRANDING.name)

    fireEvent.change(name, { target: { value: 'Hope Chapel' } })
    fireEvent.change(screen.getByLabelText(/App title/), { target: { value: 'Hope Presenter' } })
    fireEvent.change(screen.getByLabelText('Primary colour'), { target: { value: '#3ec7b4' } })
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    fireEvent.click(save)

    const saved = useAppStore.getState().branding
    expect(saved).toMatchObject({ name: 'Hope Chapel', appTitle: 'Hope Presenter', theme: { primary: '#3ec7b4' } })
    expect(screen.getByText('All changes saved')).toBeInTheDocument()
  })

  it('explains an unreadable colour and refuses to save it', () => {
    render(<BrandingPanel />)
    fireEvent.change(screen.getByLabelText('Primary colour'), { target: { value: '#1a2340' } })
    expect(screen.getByText(/Not enough contrast on the dark interface/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(useAppStore.getState().branding.theme.primary).toBe(DEFAULT_BRANDING.theme.primary)

    fireEvent.change(screen.getByLabelText('Primary colour'), { target: { value: 'teal' } })
    expect(screen.getByText(/Enter a colour as #RRGGBB/)).toBeInTheDocument()
  })

  it('cancels edits and resets the draft to the defaults', () => {
    useAppStore.getState().saveBranding({ ...DEFAULT_BRANDING, name: 'Hope Chapel' })
    render(<BrandingPanel />)
    const name = screen.getByLabelText(/Church name/) as HTMLInputElement
    fireEvent.change(name, { target: { value: 'Typo Church' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(name.value).toBe('Hope Chapel')

    fireEvent.click(screen.getByRole('button', { name: /Reset to defaults/ }))
    expect(name.value).toBe(DEFAULT_BRANDING.name)
    // Reset is a draft until saved.
    expect(useAppStore.getState().branding.name).toBe('Hope Chapel')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(useAppStore.getState().branding).toEqual(DEFAULT_BRANDING)
  })

  it('asks before leaving with unsaved changes', () => {
    render(<BrandingPanel />)
    fireEvent.change(screen.getByLabelText(/Church name/), { target: { value: 'Hope Chapel' } })
    act(() => navigate('/home'))
    expect(window.location.hash).toBe('#/settings/identity')
    expect(screen.getByRole('dialog', { name: 'Discard branding changes?' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    expect(window.location.hash).toBe('#/home')
    expect(useAppStore.getState().branding.name).toBe(DEFAULT_BRANDING.name)
  })
})
