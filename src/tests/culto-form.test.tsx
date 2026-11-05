import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CultoFormDialog } from '../components/culto/CultoFormDialog'
import { useAppStore } from '../store/useAppStore'
import { DEFAULT_SETTINGS } from '../store/useAppStore'
import type { Service } from '../types'

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: 'svc-1',
    churchId: 'church-1',
    title: 'Test Service',
    date: '2026-11-01',
    time: '10:00',
    status: 'scheduled',
    sections: [{ id: 'sec-1', title: 'Main', itemIds: [] }],
    items: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    ...overrides,
  }
}

describe('CultoFormDialog — create mode', () => {
  afterEach(cleanup)
  beforeEach(() => {
    useAppStore.setState({
      settings: { ...DEFAULT_SETTINGS, locale: 'en' },
    })
  })

  it('auto-fills title from the default date', () => {
    render(<CultoFormDialog open onClose={() => {}} defaultDate="2026-11-01" />)
    const titleInput = screen.getByRole<HTMLInputElement>('textbox', { name: /service name|nome do culto/i })
    expect(titleInput.value).toBeTruthy()
    expect(titleInput.value).not.toBe('')
  })

  it('updates title when date changes and user has not manually edited it', () => {
    render(<CultoFormDialog open onClose={() => {}} defaultDate="2026-11-01" />)
    const dateInput = screen.getByDisplayValue('01/11/2026')
    const titleBefore = screen.getByRole<HTMLInputElement>('textbox', { name: /service name|nome do culto/i }).value

    fireEvent.change(dateInput, { target: { value: '25/12/2026' } })

    const titleAfter = screen.getByRole<HTMLInputElement>('textbox', { name: /service name|nome do culto/i }).value
    expect(titleAfter).not.toBe(titleBefore)
    expect(titleAfter).not.toBe('')
  })

  it('preserves manually-edited title when date changes', () => {
    render(<CultoFormDialog open onClose={() => {}} defaultDate="2026-11-01" />)
    const titleInput = screen.getByRole<HTMLInputElement>('textbox', { name: /service name|nome do culto/i })
    const dateInput = screen.getByDisplayValue('01/11/2026')

    fireEvent.change(titleInput, { target: { value: 'My Custom Title' } })
    fireEvent.change(dateInput, { target: { value: '25/12/2026' } })

    expect(screen.getByDisplayValue('My Custom Title')).toBeInTheDocument()
  })

  it('date field appears before title field in the DOM', () => {
    render(<CultoFormDialog open onClose={() => {}} defaultDate="2026-11-01" />)
    const dateInput = screen.getByDisplayValue('01/11/2026')
    const titleInput = screen.getByRole<HTMLInputElement>('textbox', { name: /service name|nome do culto/i })
    const position = dateInput.compareDocumentPosition(titleInput)
    // DOCUMENT_POSITION_FOLLOWING = 4
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders pastor, worship, and guests fields', () => {
    render(<CultoFormDialog open onClose={() => {}} />)
    expect(screen.getByRole('textbox', { name: /pastor/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /worship|louvor|alabanza|lobpreis|adorazione/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /guest|convidado|invitado|gast|ospite/i })).toBeInTheDocument()
  })

  it('creates service with pastor, worship, and guests values', () => {
    render(<CultoFormDialog open onClose={() => {}} defaultDate="2026-11-01" openAfterCreate={false} />)

    const titleInput = screen.getByRole<HTMLInputElement>('textbox', { name: /service name|nome do culto/i })
    const pastorInput = screen.getByRole<HTMLInputElement>('textbox', { name: /pastor/i })
    const worshipInput = screen.getByRole<HTMLInputElement>('textbox', { name: /worship|louvor|alabanza|lobpreis|adorazione/i })
    const guestsInput = screen.getByRole<HTMLInputElement>('textbox', { name: /guest|convidado|invitado|gast|ospite/i })

    fireEvent.change(titleInput, { target: { value: 'Sunday Service Nov 1' } })
    fireEvent.change(pastorInput, { target: { value: 'Pastor Silva' } })
    fireEvent.change(worshipInput, { target: { value: 'Praise Team' } })
    fireEvent.change(guestsInput, { target: { value: 'Special Guest' } })

    fireEvent.click(screen.getByRole('button', { name: /create service|criar culto/i }))

    const services = useAppStore.getState().services
    expect(services.length).toBeGreaterThan(0)
    const created = services[0]
    expect(created.pastor).toBe('Pastor Silva')
    expect(created.worship).toBe('Praise Team')
    expect(created.guests).toBe('Special Guest')
  })

  it('creates service with empty pastor, worship, and guests (backward compat)', () => {
    render(<CultoFormDialog open onClose={() => {}} defaultDate="2026-11-01" openAfterCreate={false} />)

    const titleInput = screen.getByRole<HTMLInputElement>('textbox', { name: /service name|nome do culto/i })
    fireEvent.change(titleInput, { target: { value: 'Basic Service' } })

    fireEvent.click(screen.getByRole('button', { name: /create service|criar culto/i }))

    const services = useAppStore.getState().services
    expect(services.length).toBeGreaterThan(0)
    const created = services[0]
    expect(created.pastor).toBeUndefined()
    expect(created.worship).toBeUndefined()
    expect(created.guests).toBeUndefined()
  })
})

describe('CultoFormDialog — edit mode', () => {
  afterEach(cleanup)
  beforeEach(() => {
    useAppStore.setState({
      settings: { ...DEFAULT_SETTINGS, locale: 'en' },
    })
  })

  it('does not auto-fill title from date in edit mode', () => {
    const service = makeService({ title: 'Existing Title', date: '2026-11-01' })
    render(<CultoFormDialog open onClose={() => {}} service={service} />)

    const dateInput = screen.getByDisplayValue('01/11/2026')
    fireEvent.change(dateInput, { target: { value: '25/12/2026' } })

    expect(screen.getByDisplayValue('Existing Title')).toBeInTheDocument()
  })

  it('loads pastor, worship, and guests from existing service', () => {
    const service = makeService({
      pastor: 'Pastor João',
      worship: 'Banda Louvor',
      guests: 'Convidado Especial',
    })
    render(<CultoFormDialog open onClose={() => {}} service={service} />)

    expect(screen.getByDisplayValue('Pastor João')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Banda Louvor')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Convidado Especial')).toBeInTheDocument()
  })

  it('loads service without new fields without errors (backward compat)', () => {
    const service = makeService({ pastor: undefined, worship: undefined, guests: undefined })
    expect(() => render(<CultoFormDialog open onClose={() => {}} service={service} />)).not.toThrow()
    expect(screen.getByRole('textbox', { name: /pastor/i })).toHaveValue('')
  })

  it('saves updated pastor, worship, guests', () => {
    const service = makeService()
    useAppStore.setState({ services: [service] })
    render(<CultoFormDialog open onClose={() => {}} service={service} />)

    fireEvent.change(screen.getByRole('textbox', { name: /pastor/i }), { target: { value: 'New Pastor' } })
    fireEvent.change(screen.getByRole('textbox', { name: /worship|louvor|alabanza|lobpreis|adorazione/i }), { target: { value: 'New Band' } })

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /^save$|^salvar$|^guardar$/i }))
    })

    const saved = useAppStore.getState().services.find((s) => s.id === 'svc-1')
    expect(saved?.pastor).toBe('New Pastor')
    expect(saved?.worship).toBe('New Band')
  })
})

describe('CultoFormDialog — pt-BR locale auto-fill', () => {
  afterEach(cleanup)
  beforeEach(() => {
    useAppStore.setState({
      settings: { ...DEFAULT_SETTINGS, locale: 'pt-BR' },
    })
  })

  it('auto-fills title in locale-specific format', () => {
    render(<CultoFormDialog open onClose={() => {}} defaultDate="2026-11-01" />)
    const titleInput = screen.getByRole<HTMLInputElement>('textbox', { name: /nome do culto|service name/i })
    // In pt-BR, formatLongDate('2026-11-01') should contain "nov" (or equivalent) somewhere
    expect(titleInput.value.toLowerCase()).toMatch(/nov/)
  })
})
