import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ImageUp, Loader2, Palette, RotateCcw, Trash2, TriangleAlert } from 'lucide-react'
import type { Branding } from '../../types'
import { useT } from '../../i18n/useT'
import { useAppStore } from '../../store/useAppStore'
import { useToasts } from '../../store/useToasts'
import { navigate, setNavigationGuard } from '../../hooks/useHashRoute'
import { formatBytes, MAX_LOGO_BYTES } from '../../security/media'
import {
  applyTheme,
  brandingEquals,
  contrastReport,
  DEFAULT_BACKGROUND,
  DEFAULT_BRANDING,
  MAX_APP_TITLE,
  MAX_CHURCH_NAME,
  normalizeHex,
  validateBranding,
  type BrandingError,
  type BrandingField,
} from '../../utils/branding'
import { LOGO_ACCEPT, processLogoFile, type LogoError, type ProcessedLogo } from '../../utils/logo'
import { makeSlide } from '../../utils/slides'
import { BrandMark } from '../BrandMark'
import { ColorField } from '../ColorField'
import { ConfirmDialog } from '../Modal'
import { SlideRenderer } from '../SlideRenderer'

const LOGO_ERROR_KEYS: Record<LogoError, string> = {
  empty: 'branding.logoError.empty',
  'too-large': 'branding.logoError.tooLarge',
  'unsupported-type': 'branding.logoError.type',
  mismatch: 'branding.logoError.mismatch',
  corrupt: 'branding.logoError.corrupt',
  'svg-invalid': 'branding.logoError.svg',
  'read-failed': 'branding.logoError.read',
}

function errorText(t: (key: string, vars?: Record<string, string | number>) => string, field: BrandingField, error: BrandingError) {
  if (error === 'too-long') return t('branding.error.tooLong', { max: field === 'name' ? MAX_CHURCH_NAME : MAX_APP_TITLE })
  return t(`branding.error.${error}`)
}

export function BrandingPanel() {
  const t = useT()
  const saved = useAppStore((state) => state.branding)
  const saveBranding = useAppStore((state) => state.saveBranding)
  const push = useToasts((state) => state.push)
  const [draft, setDraft] = useState<Branding>(saved)
  const [touched, setTouched] = useState<Partial<Record<BrandingField, boolean>>>({})
  const [showAllErrors, setShowAllErrors] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const [logoError, setLogoError] = useState<LogoError | null>(null)
  const [logoInfo, setLogoInfo] = useState<(ProcessedLogo & { fileName: string }) | null>(null)
  const [pendingTarget, setPendingTarget] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const preview = useRef<HTMLDivElement>(null)

  const dirty = !brandingEquals(draft, saved)
  const errors = validateBranding(draft)
  const hasErrors = Object.keys(errors).length > 0
  const visibleError = (field: BrandingField) =>
    (showAllErrors || touched[field]) && errors[field] ? errorText(t, field, errors[field]!) : undefined
  const report = !errors.primary && !errors.accent && !errors.background ? contrastReport(draft.theme) : null

  // Follow saved branding (backup import, another tab) while there are no edits.
  useEffect(() => {
    if (!dirty) setDraft(saved)
  }, [dirty, saved])

  // The preview card shows the draft colours; the rest of the app keeps the saved ones.
  useEffect(() => {
    if (!preview.current) return
    if (errors.primary || errors.accent || errors.background) return
    applyTheme(
      {
        primary: normalizeHex(draft.theme.primary)!,
        accent: normalizeHex(draft.theme.accent)!,
        background: draft.theme.background === null ? null : normalizeHex(draft.theme.background),
      },
      preview.current,
    )
  }, [draft.theme, errors.primary, errors.accent, errors.background])

  // Unsaved changes: ask before leaving the screen or closing the window.
  useEffect(() => {
    if (!dirty) {
      setNavigationGuard(null)
      return
    }
    setNavigationGuard((target) => {
      setPendingTarget(target)
      return false
    })
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      setNavigationGuard(null)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [dirty])

  const update = (patch: Partial<Branding>, field?: BrandingField) => {
    setDraft((current) => ({ ...current, ...patch }))
    if (field) setTouched((current) => ({ ...current, [field]: true }))
  }
  const updateTheme = (patch: Partial<Branding['theme']>, field: BrandingField) => {
    setDraft((current) => ({ ...current, theme: { ...current.theme, ...patch } }))
    setTouched((current) => ({ ...current, [field]: true }))
  }

  const chooseLogo = async (file: File) => {
    setLogoBusy(true)
    setLogoError(null)
    const result = await processLogoFile(file)
    setLogoBusy(false)
    if (!result.ok) {
      setLogoError(result.reason)
      push(t(LOGO_ERROR_KEYS[result.reason]), 'error')
      return
    }
    setLogoInfo({ ...result.logo, fileName: file.name })
    update({ logoUrl: result.logo.dataUrl })
  }

  const save = () => {
    if (hasErrors) {
      setShowAllErrors(true)
      push(t('branding.fixErrors'), 'error')
      return
    }
    const result = saveBranding({
      ...draft,
      name: draft.name.trim(),
      appTitle: draft.appTitle.trim(),
      theme: {
        primary: normalizeHex(draft.theme.primary)!,
        accent: normalizeHex(draft.theme.accent)!,
        background: draft.theme.background === null ? null : normalizeHex(draft.theme.background),
      },
    })
    setDraft(result)
    setTouched({})
    setShowAllErrors(false)
    push(t('branding.saved'), 'success')
  }

  const cancel = () => {
    setDraft(saved)
    setTouched({})
    setShowAllErrors(false)
    setLogoError(null)
    setLogoInfo(null)
    push(t('branding.discarded'), 'info')
  }

  const resetToDefaults = () => {
    setDraft(DEFAULT_BRANDING)
    setTouched({})
    setLogoError(null)
    setLogoInfo(null)
    push(t('branding.resetDraft'), 'info')
  }

  const previewSlide = useMemo(
    () =>
      makeSlide({
        id: 'branding-preview',
        kind: 'title',
        title: '',
        text: `${t('branding.previewSlideTitle')}\n${draft.name.trim() || DEFAULT_BRANDING.name}`,
      }),
    [draft.name, t],
  )
  const previewBranding = { ...draft, name: draft.name.trim() || DEFAULT_BRANDING.name }

  return (
    <div className="branding-panel">
      <div className="branding-grid">
        <div className="branding-form">
          <fieldset className="branding-group">
            <legend>{t('branding.identity')}</legend>
            <label className="field">
              <span>
                {t('settings.churchName')} <small className="field-required">{t('branding.required')}</small>
              </span>
              <input
                value={draft.name}
                maxLength={MAX_CHURCH_NAME + 20}
                placeholder={t('settings.churchNamePlaceholder')}
                aria-invalid={Boolean(visibleError('name'))}
                aria-describedby="branding-name-note"
                onChange={(event) => update({ name: event.target.value }, 'name')}
                onBlur={() => setTouched((current) => ({ ...current, name: true }))}
              />
              <small id="branding-name-note" className={visibleError('name') ? 'field-error' : 'field-hint'}>
                {visibleError('name') ?? t('branding.nameHint')}
              </small>
            </label>
            <label className="field">
              <span>
                {t('branding.appTitle')} <small className="field-required">{t('branding.required')}</small>
              </span>
              <input
                value={draft.appTitle}
                maxLength={MAX_APP_TITLE + 20}
                aria-invalid={Boolean(visibleError('appTitle'))}
                aria-describedby="branding-title-note"
                onChange={(event) => update({ appTitle: event.target.value }, 'appTitle')}
                onBlur={() => setTouched((current) => ({ ...current, appTitle: true }))}
              />
              <small id="branding-title-note" className={visibleError('appTitle') ? 'field-error' : 'field-hint'}>
                {visibleError('appTitle') ?? t('branding.appTitleHint')}
              </small>
            </label>
          </fieldset>

          <fieldset className="branding-group">
            <legend>{t('settings.logo')}</legend>
            <div className="logo-editor">
              <div className={`logo-stage ${draft.logoUrl ? 'has-logo' : ''}`}>
                {logoBusy ? (
                  <Loader2 size={22} className="spin" aria-label={t('branding.logoProcessing')} />
                ) : draft.logoUrl ? (
                  <img src={draft.logoUrl} alt={t('branding.logoAlt', { name: draft.name || DEFAULT_BRANDING.name })} />
                ) : (
                  <BrandMark branding={draft} size="xl" />
                )}
              </div>
              <div className="logo-editor-copy">
                <p className="field-hint">
                  {t('branding.logoHint', { size: formatBytes(MAX_LOGO_BYTES) })}
                </p>
                {logoInfo && !logoError && (
                  <p className="logo-file" aria-live="polite">
                    <Check size={13} /> {logoInfo.fileName} · {logoInfo.sourceType}
                    {logoInfo.sourceType === 'SVG' ? ` → PNG` : ''} · {logoInfo.width}×{logoInfo.height}
                  </p>
                )}
                {logoError && (
                  <p className="field-error" role="alert">
                    <TriangleAlert size={13} /> {t(LOGO_ERROR_KEYS[logoError])}
                  </p>
                )}
                <div className="inline-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => fileInput.current?.click()}
                    disabled={logoBusy}
                  >
                    <ImageUp size={14} />
                    {draft.logoUrl ? t('branding.replaceLogo') : t('settings.uploadLogo')}
                  </button>
                  {draft.logoUrl && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        update({ logoUrl: null })
                        setLogoInfo(null)
                        setLogoError(null)
                      }}
                      disabled={logoBusy}
                    >
                      <Trash2 size={14} />
                      {t('settings.removeLogo')}
                    </button>
                  )}
                </div>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={draft.logoAsFavicon}
                    onChange={(event) => update({ logoAsFavicon: event.target.checked })}
                  />
                  <span>{t('branding.logoAsFavicon')}</span>
                </label>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept={LOGO_ACCEPT}
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void chooseLogo(file)
                  event.target.value = ''
                }}
              />
            </div>
          </fieldset>

          <fieldset className="branding-group">
            <legend>{t('branding.colors')}</legend>
            <div className="color-grid">
              <ColorField
                label={t('branding.primary')}
                hint={t('branding.primaryHint')}
                value={draft.theme.primary}
                error={visibleError('primary') ?? (errors.primary && errors.primary !== 'invalid-color' ? errorText(t, 'primary', errors.primary) : undefined)}
                note={report ? `${t('branding.contrast')} ${Math.min(report.primaryOnBackground, report.inkOnPrimary).toFixed(1)}:1` : undefined}
                onChange={(value) => updateTheme({ primary: value }, 'primary')}
              />
              <ColorField
                label={t('branding.accent')}
                hint={t('branding.accentHint')}
                value={draft.theme.accent}
                error={visibleError('accent') ?? (errors.accent && errors.accent !== 'invalid-color' ? errorText(t, 'accent', errors.accent) : undefined)}
                note={report ? `${t('branding.contrast')} ${report.accentOnBackground.toFixed(1)}:1` : undefined}
                onChange={(value) => updateTheme({ accent: value }, 'accent')}
              />
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={draft.theme.background !== null}
                onChange={(event) =>
                  updateTheme({ background: event.target.checked ? DEFAULT_BACKGROUND : null }, 'background')
                }
              />
              <span>{t('branding.customBackground')}</span>
            </label>
            {draft.theme.background !== null && (
              <ColorField
                label={t('branding.background')}
                hint={t('branding.backgroundHint')}
                value={draft.theme.background}
                error={visibleError('background') ?? (errors.background && errors.background !== 'invalid-color' ? errorText(t, 'background', errors.background) : undefined)}
                note={report ? `${t('branding.textContrast')} ${report.faintTextOnBackground.toFixed(1)}:1` : undefined}
                onChange={(value) => updateTheme({ background: value }, 'background')}
              />
            )}
          </fieldset>
        </div>

        <aside className="branding-preview" aria-label={t('settings.identityPreview')}>
          <span className="eyebrow">{t('settings.identityPreview')}</span>
          <div ref={preview} className="branding-preview-surface">
            <div className="branding-preview-header">
              <BrandMark branding={previewBranding} size="md" />
              <span>
                <strong>{draft.appTitle.trim() || DEFAULT_BRANDING.appTitle}</strong>
                <small>{previewBranding.name}</small>
              </span>
            </div>
            <div className="branding-preview-nav">
              <span className="nav-item is-active">
                <Palette size={16} />
                {t('nav.home')}
              </span>
            </div>
            <div className="branding-preview-actions">
              <span className="btn btn-primary btn-sm" aria-hidden="true">
                {t('editor.present')}
              </span>
              <span className="badge badge-amber">{t('branding.previewBadge')}</span>
              <span className="text-link">{t('common.viewAll')}</span>
            </div>
            <div className="branding-preview-slide">
              <SlideRenderer slide={previewSlide} branding={previewBranding} compact />
            </div>
          </div>
          <p className="field-hint">{t('branding.previewNote')}</p>
        </aside>
      </div>

      <div className={`branding-actions ${dirty ? 'is-dirty' : ''}`}>
        <span className="branding-status" aria-live="polite">
          {dirty ? t('branding.unsaved') : t('branding.allSaved')}
        </span>
        <button type="button" className="btn btn-ghost" onClick={resetToDefaults}>
          <RotateCcw size={14} />
          {t('branding.reset')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={cancel} disabled={!dirty}>
          {t('common.cancel')}
        </button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={!dirty || logoBusy}>
          {t('common.save')}
        </button>
      </div>

      <ConfirmDialog
        open={pendingTarget !== null}
        title={t('branding.leaveTitle')}
        copy={t('branding.leaveCopy')}
        confirmLabel={t('branding.discardChanges')}
        onConfirm={() => {
          const target = pendingTarget
          setNavigationGuard(null)
          setDraft(saved)
          setPendingTarget(null)
          if (target) navigate(target, { force: true })
        }}
        onClose={() => setPendingTarget(null)}
      />
    </div>
  )
}
