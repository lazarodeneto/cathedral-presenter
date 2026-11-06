import { describe, expect, it } from 'vitest'
import { SLIDE_TEMPLATES } from '../data/templates'
import { dictionaries } from '../i18n/dictionary'
import { createTemplateItem } from '../utils/slides'
import { isCinematicAsset } from '../assets/templateArt'

const LOCALES = Object.keys(dictionaries) as (keyof typeof dictionaries)[]

describe('template translations', () => {
  it('uses full-frame photographic assets and slow camera motion in the cinematic scenes', () => {
    const cinematic = SLIDE_TEMPLATES.filter((template) => template.elementPreset?.startsWith('art-'))
    expect(cinematic).toHaveLength(12)
    for (const template of cinematic) {
      const slide = createTemplateItem(template, template.name).slides[0]
      const photo = slide.elements.find((element) => element.type === 'image')!
      expect(isCinematicAsset(photo.source)).toBe(true)
      expect(photo).toMatchObject({ x: 0, y: 0, width: 100, height: 100, settings: { fit: 'cover', motion: 'cinematic' } })
      expect(slide.background.preset).toBe('graphite')
    }
    expect(isCinematicAsset('/media/cinematic/../../.data/secret')).toBe(false)
  })
  it('has a name, description and slide content for every template in every language', () => {
    const missing: string[] = []
    for (const locale of LOCALES) {
      const dictionary = dictionaries[locale]
      for (const template of SLIDE_TEMPLATES) {
        const keys = [`template.${template.id}.name`, `template.${template.id}.description`, `template.${template.id}.text`]
        if (template.label) keys.push(`template.${template.id}.label`)
        for (const key of keys) {
          if (!(key in dictionary) || (key.endsWith('.text') ? template.text !== '' && !dictionary[key] : !dictionary[key])) {
            missing.push(`${locale}: ${key}`)
          }
        }
        if (!dictionary[`template.category.${template.category}`]) missing.push(`${locale}: category ${template.category}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('translates the slide content, not just the names', () => {
    for (const locale of LOCALES.filter((entry) => entry !== 'en')) {
      const same = SLIDE_TEMPLATES.filter(
        (template) => template.text && dictionaries[locale][`template.${template.id}.text`] === template.text,
      ).map((template) => template.id)
      expect({ locale, same }).toEqual({ locale, same: [] })
    }
  })

  it('builds every template without throwing and keeps ids unique', () => {
    const ids = new Set(SLIDE_TEMPLATES.map((template) => template.id))
    expect(ids.size).toBe(SLIDE_TEMPLATES.length)
    for (const template of SLIDE_TEMPLATES) {
      const item = createTemplateItem(template, template.name)
      expect(item.slides).toHaveLength(1)
    }
  })

  it('gives video templates an empty video slot', () => {
    const video = SLIDE_TEMPLATES.filter((template) => template.elementPreset === 'video')
    expect(video.length).toBeGreaterThanOrEqual(5)
    for (const template of video) {
      const slot = createTemplateItem(template, template.name).slides[0].elements.find((element) => element.type === 'video')
      expect(slot?.settings?.videoSlot).toBe(true)
      expect(slot?.source).toBe('')
    }
  })
})
