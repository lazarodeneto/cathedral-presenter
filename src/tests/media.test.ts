import { describe, expect, it } from 'vitest'
import { webMediaProvider } from '../providers/media/MediaProvider'
import { qrElement, qrPayloadFor } from '../providers/media/mediaWorkflow'

describe('web media provider', () => {
  it('normalizes YouTube links to privacy-enhanced embeds', () => {
    const result = webMediaProvider.registerYouTube('https://youtu.be/dQw4w9WgXcQ?t=10')
    expect(result).toMatchObject({
      ok: true,
      asset: {
        kind: 'video',
        provider: 'youtube',
        source: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      },
    })
  })

  it('rejects lookalike hosts and unsafe remote media', () => {
    expect(webMediaProvider.registerYouTube('https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ')).toMatchObject({
      ok: false,
      reason: 'unsupported-provider',
    })
    expect(webMediaProvider.registerUrl('https://example.com/vector.svg', 'image')).toMatchObject({
      ok: false,
      reason: 'unsafe-media-type',
    })
    expect(webMediaProvider.registerUrl('https://127.0.0.1/photo.png', 'image')).toMatchObject({
      ok: false,
      reason: 'private-network',
    })
  })
})

describe('QR workflow', () => {
  it('builds a contact vCard and strips line breaks from fields', () => {
    const result = qrPayloadFor({
      variant: 'contact',
      value: '',
      eventTitle: '',
      eventDate: '',
      eventLocation: '',
      contactName: 'Grace Church\nAdmin',
      contactOrganization: 'Grace Community',
      contactEmail: 'hello@example.org',
      contactPhone: '+1 555 0100',
    })
    expect(result.ok).toBe(true)
    expect(result.payload).toContain('BEGIN:VCARD')
    expect(result.payload).toContain('FN:Grace Church Admin')
    expect(result.payload).toContain('ORG:Grace Community')
    expect(result.payload).toContain('EMAIL:hello@example.org')
    expect(result.payload).toContain('TEL:+1 555 0100')
    expect(result.payload).toContain('END:VCARD')
  })

  it('escapes vCard separators so a field cannot add components', () => {
    const result = qrPayloadFor({
      variant: 'contact',
      value: '',
      eventTitle: '',
      eventDate: '',
      eventLocation: '',
      contactName: 'Ana, Admin',
      contactOrganization: 'Grace; Youth\\Team',
      contactEmail: '',
      contactPhone: '',
    })
    expect(result.payload).toContain('FN:Ana\\, Admin')
    expect(result.payload).toContain('ORG:Grace\\; Youth\\\\Team')
  })

  it('requires at least one contact field and only accepts public HTTPS URLs', () => {
    expect(
      qrPayloadFor({
        variant: 'contact',
        value: '',
        eventTitle: '',
        eventDate: '',
        eventLocation: '',
        contactName: '',
        contactOrganization: '',
        contactEmail: '',
        contactPhone: '',
      }).ok,
    ).toBe(false)
    expect(
      qrPayloadFor({
        variant: 'url',
        value: 'http://example.org/event',
        eventTitle: '',
        eventDate: '',
        eventLocation: '',
        contactName: '',
        contactOrganization: '',
        contactEmail: '',
        contactPhone: '',
      }),
    ).toMatchObject({ ok: false, reason: 'unsafe-scheme' })
  })

  it('creates a QR element with the selected variant', () => {
    const element = qrElement('BEGIN:VCARD\nEND:VCARD', 'contact')
    expect(element).toMatchObject({
      type: 'qr',
      settings: { payload: 'BEGIN:VCARD\nEND:VCARD', variant: 'contact', quietZone: 2 },
    })
  })
})
