import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BibleLibraryPanel } from '../components/settings/BibleLibraryPanel'
import { DEFAULT_SETTINGS, useAppStore } from '../store/useAppStore'
import type { CustomBibleTranslation } from '../types'

function sampleEntry(): CustomBibleTranslation {
  return {
    translation: {
      id: 'custom-pt-br-tst',
      providerId: 'local-bible',
      name: 'Test Bible',
      abbreviation: 'TST',
      language: 'pt-BR',
      licenseType: 'church-import',
      licenseText: 'Church import',
      copyrightNotice: 'Used with permission.',
      bundled: false,
      sample: false,
      verseCount: 1,
      availability: 'bundled',
    },
    books: { john: { 3: { 16: 'Porque Deus amou o mundo.' } } },
  }
}

describe('Bible library settings panel', () => {
  beforeEach(() => {
    useAppStore.setState({
      customBibles: [],
      settings: { ...DEFAULT_SETTINGS, locale: 'en' },
    })
  })
  afterEach(cleanup)

  it('lists an imported Bible with its language and deletes it after confirmation', async () => {
    useAppStore.setState({ customBibles: [sampleEntry()] })
    render(<BibleLibraryPanel />)

    expect(screen.getByText('Test Bible')).toBeInTheDocument()
    expect(screen.getAllByText(/Portuguese/).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Delete Bible: Test Bible' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Bible' }))

    await waitFor(() => expect(useAppStore.getState().customBibles).toEqual([]))
  })

  it('imports a Bible from a JSON file with the selected language', async () => {
    render(<BibleLibraryPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Bible' }))

    fireEvent.change(screen.getByLabelText('Bible name'), { target: { value: 'Imported Bible' } })
    fireEvent.change(screen.getByLabelText('Abbreviation'), { target: { value: 'IMP' } })
    fireEvent.click(screen.getByRole('button', { name: /Language/ }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Español ES' }))

    const file = new File(
      [JSON.stringify({ john: { 3: { 16: 'Porque de tal manera amó Dios al mundo.' } } })],
      'bible.json',
      { type: 'application/json' },
    )
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await screen.findByText(/bible\.json/)

    const buttons = screen.getAllByRole('button', { name: 'Add Bible' })
    fireEvent.click(buttons[buttons.length - 1])

    await waitFor(() => expect(useAppStore.getState().customBibles).toHaveLength(1))
    expect(useAppStore.getState().customBibles[0]?.translation.language).toBe('es')
    expect(useAppStore.getState().customBibles[0]?.translation.name).toBe('Imported Bible')
  })
})
