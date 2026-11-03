import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const stylesheet = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')

describe('Golden Gate theme contract', () => {
  it('defines the shared Golden Gate design tokens', () => {
    for (const token of [
      '--surface-glass',
      '--surface-glass-strong',
      '--gold-rgb',
      '--gold-bright',
      '--line-gold',
      '--shadow-gold',
      '--focus-ring',
    ]) {
      expect(stylesheet).toContain(token)
    }
  })

  it('applies the theme contract to shared UI primitives', () => {
    for (const selector of [
      '.sidebar',
      '.topbar',
      '.panel',
      '.btn-primary',
      '.field input',
      '.modal',
      '.command-trigger',
    ]) {
      expect(stylesheet).toContain(selector)
    }
  })
})
