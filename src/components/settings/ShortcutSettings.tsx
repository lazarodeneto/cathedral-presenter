import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Ban, Keyboard, RotateCcw, Search } from 'lucide-react'
import { useT } from '../../i18n/useT'
import { useAppStore } from '../../store/useAppStore'
import { useToasts } from '../../store/useToasts'
import {
  SHORTCUT_ACTIONS,
  SHORTCUT_CATEGORIES,
  type ShortcutAction,
} from '../../shortcuts/actions'
import {
  assignShortcut,
  disableShortcut,
  resetShortcut,
  resolveBindings,
  shortcutStatus,
} from '../../shortcuts/bindings'
import { comboFromEvent, comboParts, detectPlatform, formatCombo, isModifierKey, speakCombo } from '../../shortcuts/keys'
import { ConfirmDialog } from '../Modal'

type Feedback =
  | { kind: 'error'; actionId: string; text: string }
  | { kind: 'conflict'; actionId: string; combo: string; conflict: ShortcutAction }

function Keys({ combo }: { combo: string }) {
  const platform = detectPlatform()
  return (
    <span className="shortcut-keys">
      <span className="sr-only">{speakCombo(combo, platform)}</span>
      {comboParts(combo, platform).map((part, index) => (
        <kbd key={index} aria-hidden="true">
          {part}
        </kbd>
      ))}
    </span>
  )
}

/**
 * Settings → Shortcuts. Each change is saved at once (like the other
 * settings) and confirmed with a message; conflicts must be confirmed first.
 */
export function ShortcutSettings() {
  const t = useT()
  const overrides = useAppStore((state) => state.settings.shortcutOverrides ?? {})
  const enabled = useAppStore((state) => state.settings.shortcutsEnabled)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const push = useToasts((state) => state.push)
  const [query, setQuery] = useState('')
  const [recording, setRecording] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [confirmResetAll, setConfirmResetAll] = useState(false)
  const recordButtons = useRef<Record<string, HTMLButtonElement | null>>({})
  const bindings = useMemo(() => resolveBindings(overrides), [overrides])
  const platform = detectPlatform()
  const name = useCallback((id: string) => t(`shortcut.${id}`), [t])

  const save = (next: Record<string, string[]>, message: string) => {
    updateSettings({ shortcutOverrides: next })
    push(message, 'success')
  }

  const commit = (actionId: string, combo: string, reassign = false) => {
    const result = assignShortcut(overrides, actionId, combo, { reassign })
    if (result.ok) {
      setFeedback(null)
      save(result.overrides, t('shortcuts.saved', { action: name(actionId), keys: formatCombo(combo, platform) }))
      return
    }
    if (result.reason === 'conflict') {
      setFeedback({ kind: 'conflict', actionId, combo, conflict: result.conflict })
      return
    }
    setFeedback({ kind: 'error', actionId, text: t(`shortcuts.error.${result.reason}`, { keys: formatCombo(combo, platform) }) })
  }

  // While recording, take every key press first (capture phase) so nothing else reacts to it.
  useEffect(() => {
    if (!recording) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setRecording(null)
        return
      }
      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.key === 'Escape' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        setRecording(null)
        recordButtons.current[recording]?.focus()
        return
      }
      if (isModifierKey(event.key)) return
      const combo = comboFromEvent(event, platform)
      const actionId = recording
      setRecording(null)
      recordButtons.current[actionId]?.focus()
      if (!combo) {
        setFeedback({ kind: 'error', actionId, text: t('shortcuts.error.unsupported') })
        return
      }
      commit(actionId, combo)
    }
    window.addEventListener('keydown', onKey, true)
    // Re-attached each render so the handler always sees the latest settings.
    return () => window.removeEventListener('keydown', onKey, true)
  })

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return SHORTCUT_ACTIONS
    return SHORTCUT_ACTIONS.filter((action) =>
      [name(action.id), t(`shortcut.${action.id}.desc`), ...bindings[action.id].map((combo) => formatCombo(combo, platform))]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
  }, [bindings, name, platform, query, t])

  return (
    <div className="shortcut-settings">
      <p className="field-hint">
        {t('shortcuts.instructions')} {platform === 'mac' ? t('shortcuts.platformMac') : t('shortcuts.platformOther')}
      </p>
      {!enabled && (
        <p className="inline-warning" role="status">
          {t('shortcuts.allOff')}
        </p>
      )}
      <div className="shortcut-toolbar">
        <label className="search-field">
          <Search size={15} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('shortcuts.search')}
            aria-label={t('shortcuts.search')}
          />
        </label>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setConfirmResetAll(true)}
          disabled={Object.keys(overrides).length === 0}
        >
          <RotateCcw size={14} />
          {t('shortcuts.resetAll')}
        </button>
      </div>

      <p className="sr-only" aria-live="assertive">
        {recording ? t('shortcuts.recordingLive', { action: name(recording) }) : ''}
      </p>

      {filtered.length === 0 && <p className="empty-inline">{t('shortcuts.noMatch')}</p>}

      {SHORTCUT_CATEGORIES.map((category) => {
        const actions = filtered.filter((action) => action.category === category)
        if (!actions.length) return null
        return (
          <section key={category} className="shortcut-group" aria-labelledby={`shortcut-cat-${category}`}>
            <h3 id={`shortcut-cat-${category}`}>{t(`shortcuts.category.${category}`)}</h3>
            <ul>
              {actions.map((action) => {
                const status = shortcutStatus(action, overrides)
                const combos = bindings[action.id]
                const isRecording = recording === action.id
                const rowFeedback = feedback?.actionId === action.id ? feedback : null
                return (
                  <li key={action.id} className={`shortcut-row ${isRecording ? 'is-recording' : ''}`}>
                    <div className="shortcut-info">
                      <strong id={`shortcut-${action.id}`}>{name(action.id)}</strong>
                      <span>{t(`shortcut.${action.id}.desc`)}</span>
                      <span className="shortcut-contexts">
                        {action.contexts.map((context) => (
                          <span key={context} className="badge badge-quiet">
                            {t(`shortcuts.context.${context}`)}
                          </span>
                        ))}
                      </span>
                    </div>
                    <div className="shortcut-current">
                      {isRecording ? (
                        <span className="shortcut-recording">{t('shortcuts.pressKeys')}</span>
                      ) : combos.length ? (
                        combos.map((combo) => <Keys key={combo} combo={combo} />)
                      ) : (
                        <span className="shortcut-none">{t('shortcuts.none')}</span>
                      )}
                      <span className={`shortcut-status is-${status}`}>{t(`shortcuts.status.${status}`)}</span>
                    </div>
                    <div className="shortcut-actions">
                      {action.customizable ? (
                        <>
                          <button
                            ref={(node) => {
                              recordButtons.current[action.id] = node
                            }}
                            type="button"
                            className={`btn btn-sm ${isRecording ? 'btn-primary' : 'btn-secondary'}`}
                            aria-describedby={`shortcut-${action.id}`}
                            aria-pressed={isRecording}
                            onClick={() => {
                              setFeedback(null)
                              setRecording(isRecording ? null : action.id)
                            }}
                          >
                            <Keyboard size={14} />
                            {isRecording ? t('common.cancel') : t('shortcuts.change')}
                          </button>
                          {combos.length > 0 && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              aria-label={`${t('shortcuts.disable')}: ${name(action.id)}`}
                              onClick={() => {
                                setFeedback(null)
                                save(disableShortcut(overrides, action.id), t('shortcuts.disabledToast', { action: name(action.id) }))
                              }}
                            >
                              <Ban size={14} />
                              {t('shortcuts.disable')}
                            </button>
                          )}
                          {status !== 'default' && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              aria-label={`${t('shortcuts.reset')}: ${name(action.id)}`}
                              onClick={() => {
                                const result = resetShortcut(overrides, action.id)
                                if (!result.ok) {
                                  setFeedback({
                                    kind: 'error',
                                    actionId: action.id,
                                    text: t('shortcuts.error.defaultTaken', { action: name(result.conflict.id) }),
                                  })
                                  return
                                }
                                setFeedback(null)
                                save(result.overrides, t('shortcuts.resetToast', { action: name(action.id) }))
                              }}
                            >
                              <RotateCcw size={14} />
                              {t('shortcuts.reset')}
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="field-hint">{t('shortcuts.fixedNote')}</span>
                      )}
                    </div>
                    {rowFeedback?.kind === 'error' && (
                      <p className="field-error shortcut-feedback" role="alert">
                        {rowFeedback.text}
                      </p>
                    )}
                    {rowFeedback?.kind === 'conflict' && (
                      <div className="shortcut-feedback shortcut-conflict" role="alert">
                        <p>
                          {t('shortcuts.conflict', {
                            keys: formatCombo(rowFeedback.combo, platform),
                            action: name(rowFeedback.conflict.id),
                          })}
                        </p>
                        {rowFeedback.conflict.customizable ? (
                          <div className="inline-actions">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => commit(action.id, rowFeedback.combo, true)}
                            >
                              {t('shortcuts.reassign', { action: name(action.id) })}
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFeedback(null)}>
                              {t('shortcuts.keepCurrent')}
                            </button>
                          </div>
                        ) : (
                          <p className="field-hint">{t('shortcuts.conflictFixed')}</p>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      <ConfirmDialog
        open={confirmResetAll}
        title={t('shortcuts.resetAllTitle')}
        copy={t('shortcuts.resetAllCopy')}
        confirmLabel={t('shortcuts.resetAll')}
        tone="primary"
        onClose={() => setConfirmResetAll(false)}
        onConfirm={() => {
          setFeedback(null)
          save({}, t('shortcuts.resetAllToast'))
        }}
      />
    </div>
  )
}

