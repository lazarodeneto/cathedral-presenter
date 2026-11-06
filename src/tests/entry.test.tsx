import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Entry } from '../Entry'

vi.mock('../App', () => ({ default: () => <main>Workspace loaded</main> }))
beforeEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '#/login')
})
afterEach(cleanup)

it('restores the saved locale and branding without enabling account credentials', () => {
  localStorage.setItem('church-presenter:workspace:v1', JSON.stringify({ state: {
    settings: { locale: 'pt' }, branding: { name: 'Campus Teste', appTitle: 'Apresentador' },
  } }))
  render(<Entry />)
  expect(screen.getByRole('link', { name: 'Continuar neste computador' })).toHaveAttribute('href', '#/home')
  expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled()
  expect(screen.getByText('Campus Teste')).toBeInTheDocument()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
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
