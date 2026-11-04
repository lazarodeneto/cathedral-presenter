import { useCallback, useMemo, useState } from 'react'
import { ChevronRight, LayoutTemplate, Plus } from 'lucide-react'
import { SLIDE_TEMPLATES } from '../data/templates'
import type { SlideTemplate } from '../types'
import { createTemplateItem } from '../utils/slides'
import { useAppStore } from '../store/useAppStore'
import { useToasts } from '../store/useToasts'
import { useT } from '../i18n/useT'
import { navigate } from '../hooks/useHashRoute'
import { SlideRenderer } from '../components/SlideRenderer'
import { SCREEN_META, ScreenIcon } from '../components/ScreenIcon'

export function TemplatesScreen() {
  const t = useT()
  const services = useAppStore((state) => state.services)
  const activeServiceId = useAppStore((state) => state.activeServiceId)
  const branding = useAppStore((state) => state.branding)
  const addItem = useAppStore((state) => state.addItem)
  const push = useToasts((state) => state.push)
  const activeService = services.find((service) => service.id === activeServiceId)
  const [category, setCategory] = useState('All')
  const [sectionId, setSectionId] = useState(
    activeService?.sections.find((section) => section.title.toLowerCase().includes('message'))?.id ??
      activeService?.sections[0]?.id ??
      '',
  )

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(SLIDE_TEMPLATES.map((template) => template.category)))],
    [],
  )
  const templates = SLIDE_TEMPLATES.filter(
    (template) => category === 'All' || template.category === category,
  )
  // Names, descriptions, categories and slide content come from the dictionary (src/i18n/templateStrings).
  const tx = useCallback(
    (key: string, fallback: string) => {
      const value = t(key)
      return value === key ? fallback : value
    },
    [t],
  )
  const categoryLabel = (category: string) => tx(`template.category.${category}`, category)
  const localized = useMemo(
    () =>
      new Map(
        SLIDE_TEMPLATES.map((template) => {
          const entry: SlideTemplate = {
            ...template,
            name: tx(`template.${template.id}.name`, template.name),
            description: tx(`template.${template.id}.description`, template.description),
            text: tx(`template.${template.id}.text`, template.text),
            label: template.label ? tx(`template.${template.id}.label`, template.label) : undefined,
          }
          return [template.id, entry]
        }),
      ),
    [tx],
  )
  const previews = useMemo(
    () => new Map([...localized.values()].map((template) => [template.id, createTemplateItem(template, template.name).slides[0]])),
    [localized],
  )

  const add = (templateId: string) => {
    const template = localized.get(templateId)
    if (!template) return
    if (!activeService) {
      push(t('toast.noActiveService'), 'error')
      return
    }
    const item = createTemplateItem(template, template.name)
    addItem(activeService.id, sectionId || activeService.sections[0]?.id || '', item)
    push(t('templates.added'), 'success')
    navigate(`/service/${activeService.id}`)
  }

  return (
    <div className="screen templates-screen" data-tone={SCREEN_META.templates.tone}>
      <div className="screen-heading">
        <div>
          <ScreenIcon screen="templates" />
          <h1>{t('templates.title')}</h1>
          <p>{t('templates.subtitle')}</p>
        </div>
        <div className="heading-actions">
          <label className="inline-select">
            <span>{t('add.destination')}</span>
            <select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
              {activeService?.sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
              {!activeService && <option value="">{t('add.noService')}</option>}
            </select>
          </label>
        </div>
      </div>

      {!activeService && (
        <div className="inline-note">
          {t('templates.needService')}{' '}
          <button className="text-link" onClick={() => navigate('/calendar')}>
            {t('calendar.newService')}
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      <div className="category-tabs">
        {categories.map((entry) => (
          <button
            key={entry}
            className={`category-tab ${category === entry ? 'is-active' : ''}`}
            onClick={() => setCategory(entry)}
          >
            {entry === 'All' ? t('common.all') : categoryLabel(entry)}
          </button>
        ))}
      </div>

      <div className="template-grid">
        {templates.map((template) => (
          <article key={template.id} className="template-card panel">
            <div className="template-preview">
              <SlideRenderer slide={previews.get(template.id) ?? null} branding={branding} compact />
            </div>
            <div className="template-body">
              <div>
                <span className="eyebrow">{categoryLabel(template.category)}</span>
                <h3>{localized.get(template.id)?.name}</h3>
                <p>{localized.get(template.id)?.description}</p>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => add(template.id)}
                disabled={!activeService}
              >
                <Plus size={14} />
                {t('common.addToService')}
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="template-note">
        <LayoutTemplate size={16} />
        {t('templates.subtitle')}
      </div>
    </div>
  )
}
