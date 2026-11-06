import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AccountMenu } from '../components/AccountMenu'
import { useAppStore } from '../store/useAppStore'

const auth = vi.hoisted(() => ({
  session: null as null | { user: { name: string; email: string } },
  signOut: vi.fn(),
}))
vi.mock('../auth/client', () => ({
  authClient: {
    useSession: () => ({ data: auth.session, isPending: false }),
    signOut: auth.signOut,
  },
}))
beforeEach(() => {
  auth.session = null
  auth.signOut.mockReset()
  useAppStore.setState((state) => ({ settings: { ...state.settings, locale: 'en' } }))
  window.history.replaceState(null, '', '#/home')
})
afterEach(cleanup)
it('offers sign-in and account creation from the logo and restores focus on Escape', () => {
  render(<AccountMenu />)
  const trigger = screen.getByRole('button', { name: 'Account' })
  fireEvent.click(trigger)
  expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  fireEvent.keyDown(screen.getByRole('region'), { key: 'Escape' })
  expect(screen.queryByRole('region')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})
it('revokes the session before navigating to sign-in', async () => {
  auth.session = { user: { name: 'Operator', email: 'operator@example.invalid' } }
  auth.signOut.mockResolvedValue({ data: { success: true }, error: null })
  render(<AccountMenu />)
  fireEvent.click(screen.getByRole('button', { name: 'Account' }))
  expect(screen.getByText('operator@example.invalid')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
  await waitFor(() => expect(window.location.hash).toBe('#/login'))
  expect(auth.signOut).toHaveBeenCalledOnce()
})
it('keeps the account menu open when sign-out fails', async () => {
  auth.session = { user: { name: 'Operator', email: 'operator@example.invalid' } }
  auth.signOut.mockResolvedValue({ error: { message: 'network' } })
  render(<AccountMenu />)
  fireEvent.click(screen.getByRole('button', { name: 'Account' }))
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
  expect(await screen.findByRole('alert')).toBeInTheDocument()
  expect(window.location.hash).toBe('#/home')
})
