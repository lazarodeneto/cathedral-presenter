import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Entry } from '../Entry'

vi.mock('../auth/client', () => ({
  authClient: {
    useSession: () => ({ data: null }),
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
  },
}))

vi.mock('../App', () => ({ default: () => <main>Workspace loaded</main> }))
beforeEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '#/login')
})
afterEach(cleanup)

it('restores the saved locale and branding while offering account sign-in', () => {
  localStorage.setItem(
    'church-presenter:workspace:v1',
    JSON.stringify({
      state: {
        settings: { locale: 'pt' },
        branding: { name: 'Campus Teste', appTitle: 'Apresentador' },
      },
    }),
  )
  render(<Entry />)
  expect(screen.getByRole('link', { name: 'Continuar neste computador' })).toHaveAttribute(
    'href',
    '#/home',
  )
  expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
  expect(screen.getByRole('heading', { name: 'Cathedral Presenter' })).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Endereço de email' })).toBeInTheDocument()
})
it('recovers from malformed local settings', () => {
  localStorage.setItem('church-presenter:workspace:v1', '{bad')
  render(<Entry />)
  expect(screen.getByRole('link', { name: 'Continue on this computer' })).toBeInTheDocument()
})
it('opens the workspace when leaving entry and returns to entry on hash navigation', async () => {
  render(<Entry />)
  window.history.replaceState(null, '', '#/home')
  fireEvent(window, new HashChangeEvent('hashchange'))
  expect(await screen.findByText('Workspace loaded')).toBeInTheDocument()
  window.history.replaceState(null, '', '#/login')
  fireEvent(window, new HashChangeEvent('hashchange'))
  expect(screen.getByRole('link', { name: 'Continue on this computer' })).toBeInTheDocument()
})

it('switches entry language immediately and remembers it across remounts', () => {
  const view = render(<Entry />)
  fireEvent.click(screen.getByRole('button', { name: /Language: English/ }))
  fireEvent.click(screen.getByRole('option', { name: /Français/ }))
  expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
  view.unmount()
  render(<Entry />)
  expect(screen.getByRole('button', { name: /Langue: Français/ })).toBeInTheDocument()
})
