import { useState } from 'react'
import { useLocalizedTemplates } from '../../hooks/useLocalizedTemplates'
import { useT } from '../../i18n/useT'
import { useAppStore } from '../../store/useAppStore'
import type { SlideTemplate } from '../../types'
import { Modal } from '../Modal'
import { SlideRenderer } from '../SlideRenderer'

/**
 * Template gallery inside the editor: pick a template and it is added to the
 * service as a new item after the current one, in the current section.
 */
export function TemplatePickerDialog({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (template: SlideTemplate) => void
}) {
  const t = useT()
  const branding = useAppStore((state) => state.branding)
  const { templates, previews, categories, categoryLabel } = useLocalizedTemplates()
  const [category, setCategory] = useState('All')
  if (!open) return null

  const shown = templates.filter((template) => category === 'All' || template.category === category)

  return (
    <Modal title={t('templates.title')} subtitle={t('editor.templatesPickHint')} onClose={onClose} wide className="template-picker-dialog">
      <div className="category-tabs template-picker-tabs" role="tablist" aria-label={t('templates.title')}>
        {['All', ...categories].map((entry) => (
          <button
            key={entry}
            type="button"
            role="tab"
            aria-selected={category === entry}
            className={`category-tab ${category === entry ? 'is-active' : ''}`}
            onClick={() => setCategory(entry)}
          >
            {entry === 'All' ? t('common.all') : categoryLabel(entry)}
          </button>
        ))}
      </div>
      <div className="template-picker-grid">
        {shown.map((template) => (
          <button
            key={template.id}
            type="button"
            className="template-picker-card"
            onClick={() => {
              onPick(template)
              onClose()
            }}
          >
            <span className="template-picker-preview">
              <SlideRenderer slide={previews.get(template.id) ?? null} branding={branding} compact />
            </span>
            <span className="template-picker-name">{template.name}</span>
            <span className="template-picker-category">{categoryLabel(template.category)}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
