// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { verifyPowerPoint } from '../../server/powerPoint'
const deck=(rels:string)=>zipSync({'ppt/_rels/presentation.xml.rels':strToU8(rels)})
describe('PowerPoint conversion boundary',()=>{
 it('allows internal relationships and passive hyperlinks',()=>{
  expect(()=>verifyPowerPoint(deck('<Relationships><Relationship Target="slides/slide1.xml" Type="slide"/></Relationships>'))).not.toThrow()
  expect(()=>verifyPowerPoint(deck('<Relationships><Relationship Target="https://example.com" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" TargetMode="External"/></Relationships>'))).not.toThrow()
 })
 it('rejects external images, entity tricks and oversized relationship XML',()=>{
  expect(()=>verifyPowerPoint(deck('<Relationships><Relationship Target="http://127.0.0.1/private" Type="image" TargetMode="External"/></Relationships>'))).toThrow('external-media-not-supported')
  expect(()=>verifyPowerPoint(deck('<Relationships><Relationship TargetMode="Ext&#101;rnal"/></Relationships>'))).toThrow('unsafe-document')
  expect(()=>verifyPowerPoint(deck('<!DOCTYPE x [<!ENTITY x SYSTEM "file:///etc/passwd">]>'))).toThrow('unsafe-document')
 })
})
