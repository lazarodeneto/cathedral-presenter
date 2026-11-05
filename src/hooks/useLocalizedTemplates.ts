import { useCallback, useMemo } from 'react'
import { SLIDE_TEMPLATES } from '../data/templates'
import { useT } from '../i18n/useT'
import type { Slide, SlideTemplate } from '../types'
import { createTemplateItem } from '../utils/slides'

/**
 * Slide templates in the current language: names, descriptions, categories and
 * slide content come from the dictionary (src/i18n/templateStrings), with the
 * English source as fallback. Also builds one preview slide per template.
 */
export function useLocalizedTemplates() {
  const t = useT()
  const tx = useCallback(
    (key: string, fallback: string) => {
      const value = t(key)
      return value === key ? fallback : value
    },
    [t],
  )

  const templates = useMemo(
    () =>
      SLIDE_TEMPLATES.map(
        (template): SlideTemplate => ({
          ...template,
          name: tx(`template.${template.id}.name`, template.name),
          description: tx(`template.${template.id}.description`, template.description),
          text: tx(`template.${template.id}.text`, template.text),
          label: template.label ? tx(`template.${template.id}.label`, template.label) : undefined,
        }),
      ),
    [tx],
  )

  const byId = useMemo(() => new Map(templates.map((template) => [template.id, template])), [templates])

  const previews = useMemo(
    () => new Map<string, Slide>(templates.map((template) => [template.id, createTemplateItem(template, template.name).slides[0]])),
    [templates],
  )

  const categories = useMemo(() => Array.from(new Set(SLIDE_TEMPLATES.map((template) => template.category))), [])
  const categoryLabel = useCallback((category: string) => tx(`template.category.${category}`, category), [tx])

  return { templates, byId, previews, categories, categoryLabel }
}
