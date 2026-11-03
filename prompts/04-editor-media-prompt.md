# Editor media and utility expansion prompt

```text
Expand the Church Presenter slide editor into a practical service-media workspace.

Use `assets/reference/church-presenter-workspace.png` as the broad editor layout reference, `assets/reference/church-presenter-slide-editor.png` as the detailed canvas/layers/inspector reference, and `assets/reference/church-presenter-add-slide.png` as the Add Slide interaction reference. The resulting editor must connect naturally to the Home, Bible Library, and Live Service screens shown in the other project references.

Keep the existing 16:9 canvas and operator workflow. Add a focused toolbar for Text, Image, Video, URL, YouTube, QR Code, Shape, Background, Layers, and Duplicate/Delete.

Required behavior:
- Upload local images and videos by file picker or drag-and-drop.
- Show media previews, upload/loading states, missing-file states, unsupported-format states, and offline states.
- Add media from a URL with validation and a preview.
- Add a YouTube link through an official embed or authorized import flow. Do not implement or imply unauthorized downloading. Clearly label the provider and respect platform terms and content rights.
- Generate QR codes from a URL, text, contact details, or event information. Show a live preview and a test/open action.
- Add elements to the slide with basic resize, crop, alignment, opacity, visibility, layer ordering, and duplicate/delete controls.

Use local mock providers first and keep media logic separate from the canvas UI. Make every main control functional. Preserve the calm dark visual language, the green LIVE indicator, the bilingual scripture layout, and the current/next presentation preview.

Security requirements:
- Treat every uploaded file, URL, embed, QR payload, and template as untrusted.
- Reject or sanitize executable HTML/SVG and enforce file-size/type limits.
- Prevent path traversal, symlink escapes, UNC path abuse, and arbitrary shell/native calls.
- Do not fetch private/local network URLs through preview or import flows.
- Show safe error states without leaking filesystem paths, tokens, or private URLs.
```
