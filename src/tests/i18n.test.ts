import { describe, expect, it } from 'vitest'
import { dictionaries } from '../i18n/dictionary'
import { editorStrings } from '../i18n/editorStrings'

// Terms that read the same in every supported language.
const SHARED_TERMS = new Set(['editor.url', 'editor.youtube', 'editor.zoom', 'media.qrUrl', 'media.youtubePlaceholder'])
const EDITOR_SCOPE = /^(editor|media|provider|add|background)\./

describe('editor and media translations', () => {
  it('translates every editor-scope key in each non-English locale', () => {
    const en = dictionaries.en
    const scoped = Object.keys(en).filter((key) => EDITOR_SCOPE.test(key) && !SHARED_TERMS.has(key))
    for (const [locale, dictionary] of Object.entries(dictionaries)) {
      if (locale === 'en') continue
      const untranslated = scoped.filter(
        (key) => dictionary[key] === en[key] && en[key].length > 6 && /\s/.test(en[key]),
      )
      expect({ locale, untranslated }).toEqual({ locale, untranslated: [] })
    }
  })

  it('only defines editor strings for keys that exist in English', () => {
    const en = dictionaries.en
    for (const strings of Object.values(editorStrings)) {
      expect(Object.keys(strings).filter((key) => !(key in en))).toEqual([])
    }
  })
})
