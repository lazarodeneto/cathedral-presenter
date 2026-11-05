import { useEffect, useRef, useState } from 'react'
import { TriangleAlert, Upload } from 'lucide-react'
import type { LibrarySong, Locale } from '../../types'
import { LOCALES } from '../../types'
import { useT } from '../../i18n/useT'
import { useAppStore } from '../../store/useAppStore'
import { useToasts } from '../../store/useToasts'
import {
  formFromLibrarySong,
  importFromText,
  librarySongFromForm,
  validateSongLibrary,
  MAX_SONG_TITLE,
  MAX_SONG_AUTHOR,
  MAX_SONG_CATEGORY,
  MAX_SONG_KEY,
  MAX_SONG_NOTES,
  MAX_SONG_COPYRIGHT,
  MAX_SONG_LYRICS,
  type SongLibraryError,
  type SongLibraryField,
  type SongLibraryForm,
} from '../../utils/songLibrary'
import { ConfirmDialog, Modal } from '../Modal'
import { reloadAfterAdd } from '../../store/appReload'

function emptyForm(): SongLibraryForm {
  return { title: '', lyrics: '', author: '', language: '', category: '', tags: '', key: '', notes: '', copyright: '' }
}

function isDirty(form: SongLibraryForm, initial: SongLibraryForm): boolean {
  return (Object.keys(form) as (keyof SongLibraryForm)[]).some((key) => form[key] !== initial[key])
}

export function LibrarySongFormDialog({
  open,
  song,
  onClose,
}: {
  open: boolean
  song?: LibrarySong | null
  onClose: () => void
}) {
  const t = useT()
  const createLibrarySong = useAppStore((state) => state.createLibrarySong)
  const updateLibrarySong = useAppStore((state) => state.updateLibrarySong)
  const push = useToasts((state) => state.push)
  const isEdit = Boolean(song)

  const [form, setForm] = useState<SongLibraryForm>(emptyForm)
  const [initial, setInitial] = useState<SongLibraryForm>(emptyForm)
  const [submitted, setSubmitted] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const busy = useRef(false)

  useEffect(() => {
    if (!open) return
    const f = song ? formFromLibrarySong(song) : emptyForm()
    setForm(f)
    setInitial(f)
    setSubmitted(false)
    busy.current = false
  }, [open, song])

  if (!open) return null

  const errors = validateSongLibrary(form)
  const invalid = Object.keys(errors).length > 0
  const dirty = isDirty(form, initial)

  const patch = (update: Partial<SongLibraryForm>) => setForm((prev) => ({ ...prev, ...update }))

  const fieldError = (field: SongLibraryField, error: SongLibraryError | undefined) => {
    if (!submitted || !error) return null
    const max = { title: MAX_SONG_TITLE, author: MAX_SONG_AUTHOR, category: MAX_SONG_CATEGORY, key: MAX_SONG_KEY, notes: MAX_SONG_NOTES, copyright: MAX_SONG_COPYRIGHT, lyrics: MAX_SONG_LYRICS }[field]
    return <small className="field-error" role="alert">{t(`library.error.${error}`, { max })}</small>
  }

  const handleClose = () => {
    if (dirty) { setDiscardOpen(true); return }
    onClose()
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const raw = e.target?.result as string
      const imported = importFromText(raw, file.name)
      patch({ ...imported as Partial<SongLibraryForm> })
    }
    reader.readAsText(file, 'utf-8')
    event.target.value = ''
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (invalid || busy.current) return
    busy.current = true
    const result = librarySongFromForm(form, song ?? undefined)
    if (isEdit) {
      updateLibrarySong(result)
      push(t('library.updated', { title: result.title }), 'success')
    } else {
      createLibrarySong(result)
      onClose()
      void reloadAfterAdd(t('library.created', { title: result.title }), 'success', { kind: 'song', id: result.id })
      return
    }
    onClose()
  }

  return (
    <>
      <Modal
        title={t(isEdit ? 'library.editTitle' : 'library.newTitle')}
        onClose={handleClose}
        wide
        className="library-song-form"
      >
        <form className="form-stack" onSubmit={submit} noValidate>
          {dirty && (
            <p className="inline-warning" role="status">
              <TriangleAlert size={14} />
              {t('library.unsavedWarning')}
            </p>
          )}

          <label className="field">
            <span>{t('library.field.title')} <span aria-hidden="true">*</span></span>
            <input
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              aria-invalid={submitted && Boolean(errors.title)}
              autoFocus
              maxLength={MAX_SONG_TITLE + 10}
            />
            {fieldError('title', errors.title)}
          </label>

          <div className="field-row">
            <label className="field">
              <span>{t('library.field.author')}</span>
              <input value={form.author} onChange={(e) => patch({ author: e.target.value })} maxLength={MAX_SONG_AUTHOR + 10} aria-invalid={submitted && Boolean(errors.author)} />
              {fieldError('author', errors.author)}
            </label>
            <label className="field">
              <span>{t('library.field.key')}</span>
              <input value={form.key} onChange={(e) => patch({ key: e.target.value })} maxLength={MAX_SONG_KEY + 5} aria-invalid={submitted && Boolean(errors.key)} />
              {fieldError('key', errors.key)}
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>{t('library.field.language')}</span>
              <select value={form.language} onChange={(e) => patch({ language: e.target.value as Locale | '' })}>
                <option value="">{t('library.anyLanguage')}</option>
                {LOCALES.map((locale) => (
                  <option key={locale} value={locale}>{locale}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t('library.field.category')}</span>
              <input value={form.category} onChange={(e) => patch({ category: e.target.value })} maxLength={MAX_SONG_CATEGORY + 10} aria-invalid={submitted && Boolean(errors.category)} />
              {fieldError('category', errors.category)}
            </label>
          </div>

          <label className="field">
            <span>{t('library.field.tags')}</span>
            <input value={form.tags} onChange={(e) => patch({ tags: e.target.value })} placeholder={t('library.tagsPlaceholder')} />
            <small className="field-hint">{t('library.tagsHint')}</small>
          </label>

          <label className="field library-lyrics-field">
            <span className="library-lyrics-label">
              {t('library.field.lyrics')} <span aria-hidden="true">*</span>
              <label className="library-import-btn" aria-label={t('library.importFile')}>
                <Upload size={13} />
                {t('library.importFile')}
                <input type="file" accept=".txt,.md" onChange={handleImport} className="sr-only" />
              </label>
            </span>
            <textarea
              value={form.lyrics}
              onChange={(e) => patch({ lyrics: e.target.value })}
              aria-invalid={submitted && Boolean(errors.lyrics)}
              rows={14}
              className="library-lyrics-textarea"
              placeholder={t('library.lyricsPlaceholder')}
            />
            {fieldError('lyrics', errors.lyrics)}
            <small className="field-hint">{t('library.lyricsHint')}</small>
          </label>

          <label className="field">
            <span>{t('library.field.copyright')}</span>
            <input value={form.copyright} onChange={(e) => patch({ copyright: e.target.value })} maxLength={MAX_SONG_COPYRIGHT + 10} aria-invalid={submitted && Boolean(errors.copyright)} />
            {fieldError('copyright', errors.copyright)}
          </label>

          <label className="field">
            <span>{t('library.field.notes')}</span>
            <textarea value={form.notes} onChange={(e) => patch({ notes: e.target.value })} rows={3} aria-invalid={submitted && Boolean(errors.notes)} />
            {fieldError('notes', errors.notes)}
          </label>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={handleClose}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-primary" type="submit">
              {t(isEdit ? 'common.save' : 'library.addSong')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={discardOpen}
        title={t('library.discardTitle')}
        copy={t('library.discardCopy')}
        confirmLabel={t('library.discardConfirm')}
        onConfirm={() => { onClose() }}
        onClose={() => setDiscardOpen(false)}
        tone="danger"
      />
    </>
  )
}
