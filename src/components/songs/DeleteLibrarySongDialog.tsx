import { Trash2 } from 'lucide-react'
import type { LibrarySong } from '../../types'
import { useT } from '../../i18n/useT'
import { useAppStore } from '../../store/useAppStore'
import { useToasts } from '../../store/useToasts'
import { parseLyrics } from '../../utils/songLibrary'
import { Modal } from '../Modal'

/** How many services contain a copy of this song (by sourceId in item metadata). */
function countUsages(services: ReturnType<typeof useAppStore.getState>['services'], songId: string): number {
  let count = 0
  for (const service of services) {
    for (const item of service.items) {
      if (item.metadata?.sourceId === songId) count++
    }
  }
  return count
}

export function DeleteLibrarySongDialog({ song, onClose }: { song: LibrarySong | null; onClose: () => void }) {
  const t = useT()
  const deleteLibrarySong = useAppStore((state) => state.deleteLibrarySong)
  const services = useAppStore((state) => state.services)
  const push = useToasts((state) => state.push)

  if (!song) return null

  const usages = countUsages(services, song.id)
  const stanzas = parseLyrics(song.lyrics).length

  return (
    <Modal title={t('library.deleteTitle')} onClose={onClose} className="library-delete">
      <div className="form-stack">
        <div className="library-delete-target">
          <strong>{song.title}</strong>
          {song.author && <span>{song.author}</span>}
          <span>{t('library.stanzaCount', { count: stanzas })}</span>
        </div>
        <p className="modal-copy">{t('library.deleteCopy')}</p>
        {usages > 0 && (
          <p className="inline-warning" role="alert">
            {t('library.deleteUsageWarning', { count: usages })}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              deleteLibrarySong(song.id)
              push(t('library.deleted', { title: song.title }), 'success')
              onClose()
            }}
          >
            <Trash2 size={14} />
            {t('library.deleteConfirm')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
