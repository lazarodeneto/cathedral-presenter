import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { SortSelect } from '../components/SortSelect'

it('opens at the selected sort, navigates, selects and restores focus', () => {
  const change = vi.fn()
  render(<SortSelect value="old" label="Ordenar" options={[
    { value: 'old', label: 'Data (mais antigo)' },
    { value: 'new', label: 'Data (mais recente)' },
  ]} onChange={change} />)
  const trigger = screen.getByRole('button', { name: /Ordenar/ })
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  const selected = screen.getByRole('menuitemradio', { name: 'Data (mais antigo)' })
  expect(selected).toHaveFocus()
  fireEvent.keyDown(selected, { key: 'End' })
  const newest = screen.getByRole('menuitemradio', { name: 'Data (mais recente)' })
  expect(newest).toHaveFocus()
  fireEvent.click(newest)
  expect(change).toHaveBeenCalledWith('new')
  expect(trigger).toHaveFocus()
  expect(screen.queryByRole('menu')).toBeNull()
  fireEvent.click(trigger)
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
  expect(trigger).toHaveFocus()
  expect(screen.queryByRole('menu')).toBeNull()
})
