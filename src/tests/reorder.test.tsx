import { fireEvent, render, screen } from '@testing-library/react'
import { FileText, Type } from 'lucide-react'
import { beforeEach, describe, expect, it } from 'vitest'
import { InspectorGroup, InspectorGroupList } from '../components/editor/InspectorGroup'
import { useAppStore } from '../store/useAppStore'

const titles = () => screen.getAllByRole('button', { expanded: true }).map((button) => button.textContent)

function Groups() {
  return (
    <InspectorGroupList dragHint="Drag" moveUpLabel="Move up" moveDownLabel="Move down">
      <InspectorGroup id="a" icon={FileText} title="Alpha">
        <p>a</p>
      </InspectorGroup>
      <InspectorGroup id="b" icon={Type} title="Beta">
        <p>b</p>
      </InspectorGroup>
    </InspectorGroupList>
  )
}

describe('reordering without dragging', () => {
  beforeEach(() => localStorage.clear())

  it('moves inspector groups with buttons and Alt+arrow keys, and remembers the order', () => {
    const { unmount } = render(<Groups />)
    expect(titles()).toEqual(['Alpha', 'Beta'])
    expect(screen.getByRole('button', { name: 'Move up: Alpha' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Move down: Alpha' }))
    expect(titles()).toEqual(['Beta', 'Alpha'])
    fireEvent.keyDown(screen.getByRole('button', { name: /Alpha/, expanded: true }), { key: 'ArrowUp', altKey: true })
    expect(titles()).toEqual(['Alpha', 'Beta'])
    fireEvent.keyDown(screen.getByRole('button', { name: /Alpha/, expanded: true }), { key: 'ArrowDown', altKey: true })
    unmount()
    render(<Groups />)
    expect(titles()).toEqual(['Beta', 'Alpha'])
  })

  it('moves a section next to another one', () => {
    const state = useAppStore.getState()
    const service = state.services[0]
    const [first, second] = service.sections
    state.moveSectionNextTo(service.id, second.id, first.id, 'before')
    const moved = useAppStore.getState().services.find((entry) => entry.id === service.id)!
    expect(moved.sections.slice(0, 2).map((section) => section.id)).toEqual([second.id, first.id])
    state.moveSectionNextTo(service.id, second.id, first.id, 'after')
    const back = useAppStore.getState().services.find((entry) => entry.id === service.id)!
    expect(back.sections.slice(0, 2).map((section) => section.id)).toEqual([first.id, second.id])
  })
})
