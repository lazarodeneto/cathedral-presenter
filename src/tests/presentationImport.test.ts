import { describe, expect, it } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { importOpenLyrics, importPowerPointText } from '../utils/presentationImport'
import { createLibrarySongItem, validateSongLibrary, formFromLibrarySong } from '../utils/songLibrary'
describe('presentation migration', () => {
  it('imports OpenLyrics copyright and a repeated verse order without flattening the library source', () => {
    const song = importOpenLyrics('<song xmlns="http://openlyrics.info/namespace/2009/song"><properties><titles><title>Grace</title></titles><authors><author>Writer</author></authors><copyright>Used with permission</copyright><verseOrder>v1 c1 v1</verseOrder></properties><lyrics><verse name="v1"><lines>First<br/>line</lines></verse><verse name="c1"><lines>Chorus</lines></verse></lyrics></song>', 'Fallback')
    expect(song.title).toBe('Grace'); expect(song.copyright).toBe('Used with permission')
    expect(song.arrangement).toEqual([1, 2, 1])
    const item = createLibrarySongItem(song)
    expect(item.slides.map((s) => s.text)).toEqual(['First\nline', 'Chorus', 'First\nline'])
    const form = formFromLibrarySong(song)
    expect(validateSongLibrary({ ...form, arrangement: '1 9' }).arrangement).toBe('invalid-order')
  })
  it('rejects entity declarations before parsing XML', () => {
    expect(() => importOpenLyrics('<!DOCTYPE song [<!ENTITY secret SYSTEM "file:///etc/passwd">]><song>&secret;</song>', '')).toThrow('unsafe-document')
  })
  it('imports PowerPoint text in presentation order and ignores embedded executable content', () => {
    const bytes = zipSync({
      'ppt/presentation.xml': strToU8('<p:presentation xmlns:p="p" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId r:id="r2"/><p:sldId r:id="r1"/></p:sldIdLst></p:presentation>'),
      'ppt/_rels/presentation.xml.rels': strToU8('<Relationships><Relationship Id="r1" Target="slides/slide1.xml"/><Relationship Id="r2" Target="slides/slide2.xml"/></Relationships>'),
      'ppt/slides/slide1.xml': strToU8('<s xmlns:a="a"><a:p><a:r><a:t>First</a:t></a:r></a:p></s>'),
      'ppt/slides/slide2.xml': strToU8('<s xmlns:a="a"><a:p><a:r><a:t>Second</a:t></a:r></a:p></s>'),
      'ppt/embeddings/untrusted.exe': strToU8('never execute or extract'),
    })
    expect(importPowerPointText(bytes)).toEqual(['Second', 'First'])
  })
})
