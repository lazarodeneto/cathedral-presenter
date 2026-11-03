import { useEffect, useRef, useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Eraser,
  Locate,
  RotateCcw,
  Undo2,
} from 'lucide-react'
import type { MessageBoxStyle, MessagePosition, SlideElement, TextAlign } from '../../types'
import { useT } from '../../i18n/useT'
import { ColorField } from '../ColorField'
import { MIN_FIT_SCALE } from '../MessageBoxView'
import {
  DEFAULT_MESSAGE_STYLE,
  matchingPosition,
  MESSAGE_BORDER_STYLES,
  MESSAGE_LIMITS,
  messageContrast,
  messageStyleOf,
  minimumReadableOpacity,
  positionFor,
  requiredContrast,
  tryUpdateMessageStyle,
  type MessageError,
  type MessageField,
} from '../../utils/messageBox'

type Translate = (key: string, vars?: Record<string, string | number>) => string

const POSITION_GRID: (MessagePosition | null)[] = [
  'top-left',
  'top',
  'top-right',
  null,
  'center',
  null,
  'bottom-left',
  'bottom',
  'bottom-right',
]
const POSITION_ICONS: Record<MessagePosition, typeof ArrowUp> = {
  'top-left': ArrowUpLeft,
  top: ArrowUp,
  'top-right': ArrowUpRight,
  center: Locate,
  'bottom-left': ArrowDownLeft,
  bottom: ArrowDown,
  'bottom-right': ArrowDownRight,
}
const WEIGHTS = [300, 400, 500, 600, 700, 800]

function errorMessage(t: Translate, error: MessageError, field: MessageField, style: MessageBoxStyle): string {
  if (error === 'invalid-color') return t('message.error.color')
  if (error === 'low-contrast') {
    return t('message.error.contrast', {
      ratio: messageContrast(style).toFixed(1),
      needed: requiredContrast(style),
    })
  }
  const limits: Partial<Record<MessageField, { min: number; max: number }>> = {
    fontSize: MESSAGE_LIMITS.fontSize,
    lineHeight: MESSAGE_LIMITS.lineHeight,
    borderWidth: MESSAGE_LIMITS.borderWidth,
    borderRadius: MESSAGE_LIMITS.borderRadius,
  }
  const range = limits[field]
  return range ? t('message.error.range', { min: range.min, max: range.max }) : t('message.error.invalid')
}

/** Number entry that only reports values inside its range; shows why otherwise. */
function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  error,
  onCommit,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  error?: string
  onCommit: (value: number) => void
}) {
  const [raw, setRaw] = useState(String(value))
  useEffect(() => setRaw(String(value)), [value])
  return (
    <label className="field compact">
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={raw}
        aria-invalid={Boolean(error)}
        onChange={(event) => {
          setRaw(event.target.value)
          const next = event.target.valueAsNumber
          if (event.target.value.trim() !== '') onCommit(Number.isFinite(next) ? next : Number.NaN)
        }}
        onBlur={() => setRaw(String(value))}
      />
      {error && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </label>
  )
}

/**
 * Style controls for a selected message box. Every valid change is saved at
 * once, like the rest of the editor; an invalid entry is refused, explained
 * under its field, and never stored.
 */
export function MessageBoxInspector({
  element,
  fitScale,
  onChange,
}: {
  element: SlideElement
  fitScale: number
  onChange: (patch: Partial<SlideElement>) => void
}) {
  const t = useT()
  const style = messageStyleOf(element)
  const [errors, setErrors] = useState<Partial<Record<MessageField, { kind: MessageError; text: string }>>>({})
  const [drafts, setDrafts] = useState<Partial<Record<'textColor' | 'backgroundColor' | 'borderColor', string>>>({})
  // The element as it was when selected: "Undo changes" returns to it.
  const [baseline, setBaseline] = useState<SlideElement>(element)
  const elementRef = useRef(element)
  elementRef.current = element
  useEffect(() => {
    setBaseline(elementRef.current)
    setErrors({})
    setDrafts({})
    // Only when a different message box is selected.
  }, [element.id])

  const apply = (patch: Partial<MessageBoxStyle>) => {
    const fields = Object.keys(patch) as MessageField[]
    const result = tryUpdateMessageStyle(style, patch)
    if (!result.ok) {
      setErrors((current) => ({
        ...current,
        [result.field]: { kind: result.error, text: errorMessage(t, result.error, result.field, { ...style, ...patch }) },
      }))
      return false
    }
    // The saved style is readable now: drop errors on the changed fields and any
    // readability error, and show the stored colour in fields whose entry was refused for contrast.
    const resolved = (Object.keys(errors) as MessageField[]).filter(
      (field) => fields.includes(field) || errors[field]?.kind === 'low-contrast',
    )
    setErrors((current) => {
      const next = { ...current }
      for (const field of resolved) delete next[field]
      return next
    })
    setDrafts((current) => {
      const next = { ...current }
      for (const field of resolved) delete next[field as keyof typeof next]
      return next
    })
    onChange({ settings: { ...element.settings, message: result.style } })
    return true
  }

  const applyColor = (field: 'textColor' | 'backgroundColor' | 'borderColor', value: string) => {
    setDrafts((current) => ({ ...current, [field]: value }))
    if (apply({ [field]: value })) {
      setDrafts((current) => {
        const next = { ...current }
        delete next[field]
        return next
      })
    }
  }

  const current = matchingPosition(element)
  const minOpacity = minimumReadableOpacity(style)
  const contrast = messageContrast(style)
  const changed = JSON.stringify(baseline) !== JSON.stringify(element)

  return (
    <div className="message-inspector">
      <div className="inspector-label">
        <span>{t('editor.messageBox')}</span>
        <button
          type="button"
          className="text-link"
          onClick={() => onChange({ text: '' })}
          disabled={!element.text}
        >
          <Eraser size={13} />
          {t('message.clearText')}
        </button>
      </div>

      {fitScale < 0.995 && (
        <p className={fitScale <= MIN_FIT_SCALE + 0.01 ? 'inline-warning' : 'inline-note'} role="status">
          {fitScale <= MIN_FIT_SCALE + 0.01
            ? t('message.fit.tooMuch')
            : t('message.fit.shrunk', { percent: Math.round(fitScale * 100) })}
        </p>
      )}

      <fieldset className="message-group">
        <legend>{t('message.position')}</legend>
        <div className="position-grid" role="group" aria-label={t('message.position')}>
          {POSITION_GRID.map((preset, index) => {
            if (!preset) return <span key={index} aria-hidden="true" />
            const Icon = POSITION_ICONS[preset]
            return (
              <button
                key={preset}
                type="button"
                className={`icon-toggle ${current === preset ? 'is-active' : ''}`}
                aria-pressed={current === preset}
                aria-label={t('message.moveTo', { place: t(`message.pos.${preset}`) })}
                title={t('message.moveTo', { place: t(`message.pos.${preset}`) })}
                onClick={() => onChange(positionFor(preset, element))}
              >
                <Icon size={15} />
              </button>
            )
          })}
        </div>
        <p className="field-hint">{t('message.positionHint')}</p>
      </fieldset>

      <fieldset className="message-group">
        <legend>{t('message.typography')}</legend>
        <div className="field-grid">
          <label className="field compact">
            <span>{t('message.font')}</span>
            <select
              value={style.fontFamily}
              onChange={(event) => apply({ fontFamily: event.target.value as MessageBoxStyle['fontFamily'] })}
            >
              <option value="sans">{t('message.font.sans')}</option>
              <option value="serif">{t('message.font.serif')}</option>
            </select>
          </label>
          <label className="field compact">
            <span>{t('message.weightLabel')}</span>
            <select value={style.fontWeight} onChange={(event) => apply({ fontWeight: Number(event.target.value) })}>
              {WEIGHTS.map((weight) => (
                <option key={weight} value={weight}>
                  {t(`message.weight.${weight}`)}
                </option>
              ))}
            </select>
          </label>
          <NumberField
            label={t('editor.fontSize')}
            value={style.fontSize}
            min={MESSAGE_LIMITS.fontSize.min}
            max={MESSAGE_LIMITS.fontSize.max}
            error={errors.fontSize?.text}
            onCommit={(value) => apply({ fontSize: value })}
          />
          <NumberField
            label={t('editor.lineHeight')}
            value={style.lineHeight}
            min={MESSAGE_LIMITS.lineHeight.min}
            max={MESSAGE_LIMITS.lineHeight.max}
            step={0.05}
            error={errors.lineHeight?.text}
            onCommit={(value) => apply({ lineHeight: Math.round(value * 100) / 100 })}
          />
        </div>
        <div className="align-row" role="group" aria-label={t('editor.alignment')}>
          {(['left', 'center', 'right'] as TextAlign[]).map((align) => {
            const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight
            return (
              <button
                key={align}
                type="button"
                className={`icon-toggle ${style.align === align ? 'is-active' : ''}`}
                aria-pressed={style.align === align}
                aria-label={t(`message.align.${align}`)}
                title={t(`message.align.${align}`)}
                onClick={() => apply({ align })}
              >
                <Icon size={15} />
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="message-group">
        <legend>{t('branding.colors')}</legend>
        <ColorField
          label={t('message.textColor')}
          hint={t('message.textColorHint')}
          value={drafts.textColor ?? style.textColor}
          error={errors.textColor?.text}
          note={t('message.contrastNote', { ratio: contrast.toFixed(1), needed: requiredContrast(style) })}
          onChange={(value) => applyColor('textColor', value)}
        />
        <ColorField
          label={t('message.backgroundColor')}
          hint={t('message.backgroundHint')}
          value={drafts.backgroundColor ?? style.backgroundColor}
          error={errors.backgroundColor?.text}
          onChange={(value) => applyColor('backgroundColor', value)}
        />
        <label className="field">
          <span>
            {t('message.backgroundOpacity')} · {Math.round(style.backgroundOpacity * 100)}%
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={style.backgroundOpacity}
            aria-describedby="message-opacity-note"
            onChange={(event) => {
              const value = Number(event.target.value)
              // Below the readable minimum the slider stops there instead of saving unreadable text.
              apply({ backgroundOpacity: minOpacity !== null ? Math.max(value, minOpacity) : value })
            }}
          />
          <small id="message-opacity-note" className={errors.backgroundOpacity ? 'field-error' : 'field-hint'}>
            {errors.backgroundOpacity?.text ??
              (minOpacity !== null && minOpacity > 0
                ? t('message.opacityMin', { percent: Math.round(minOpacity * 100) })
                : t('message.opacityHint'))}
          </small>
        </label>
      </fieldset>

      <fieldset className="message-group">
        <legend>{t('message.border')}</legend>
        <label className="check-row">
          <input
            type="checkbox"
            checked={style.borderEnabled}
            onChange={(event) => apply({ borderEnabled: event.target.checked })}
          />
          <span>{t('message.showBorder')}</span>
        </label>
        <div className={`message-border-fields ${style.borderEnabled ? '' : 'is-off'}`}>
          <label className="field compact">
            <span>{t('message.borderStyle')}</span>
            <select
              value={style.borderStyle}
              disabled={!style.borderEnabled}
              onChange={(event) => apply({ borderStyle: event.target.value as MessageBoxStyle['borderStyle'] })}
            >
              {MESSAGE_BORDER_STYLES.map((option) => (
                <option key={option} value={option}>
                  {t(`message.borderStyle.${option}`)}
                </option>
              ))}
            </select>
          </label>
          <ColorField
            label={t('message.borderColor')}
            hint={t('message.borderColorHint')}
            value={drafts.borderColor ?? style.borderColor}
            error={errors.borderColor?.text}
            onChange={(value) => applyColor('borderColor', value)}
          />
          <div className="field-grid">
            <NumberField
              label={t('message.borderWidth')}
              value={style.borderWidth}
              min={MESSAGE_LIMITS.borderWidth.min}
              max={MESSAGE_LIMITS.borderWidth.max}
              error={errors.borderWidth?.text}
              onCommit={(value) => apply({ borderWidth: value })}
            />
            <NumberField
              label={t('message.borderRadius')}
              value={style.borderRadius}
              min={MESSAGE_LIMITS.borderRadius.min}
              max={MESSAGE_LIMITS.borderRadius.max}
              error={errors.borderRadius?.text}
              onCommit={(value) => apply({ borderRadius: value })}
            />
          </div>
        </div>
      </fieldset>

      <div className="message-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setErrors({})
            setDrafts({})
            onChange({ settings: { ...element.settings, message: { ...DEFAULT_MESSAGE_STYLE } } })
          }}
        >
          <RotateCcw size={14} />
          {t('message.resetStyle')}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={!changed}
          onClick={() => {
            setErrors({})
            setDrafts({})
            onChange({
              x: baseline.x,
              y: baseline.y,
              width: baseline.width,
              height: baseline.height,
              opacity: baseline.opacity,
              visible: baseline.visible,
              text: baseline.text,
              settings: baseline.settings,
            })
          }}
        >
          <Undo2 size={14} />
          {t('message.undo')}
        </button>
      </div>
      <p className="field-hint">{t('message.autosaveNote')}</p>
    </div>
  )
}
