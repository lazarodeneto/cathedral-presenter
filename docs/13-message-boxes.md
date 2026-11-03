# Message boxes

A message box is a styled text panel placed on a slide: notices, welcome lines, Wi-Fi details, "please silence your phone". It is an element like text, images and QR codes, so it works on every slide type and reuses the editor's selection, drag, resize, arrow keys, layers, duplicate, delete and visibility controls.

This is separate from the live **Message** button, which pops a temporary message over whatever is on screen during a service.

## Adding and editing

- Editor toolbar → **Message box**. It starts at the bottom of the slide with readable default styling and sample text.
- Text is edited in the inspector's Text field. Line breaks are kept. **Clear text** empties it.
- Inspector sections: Position, Text (font, weight, size, line height, alignment), Colours (text, background, background opacity), Border (show/hide, style, colour, thickness, corner radius).

## Position and size

- Seven preset positions: top left, top, top right, centre, bottom left, bottom, bottom right. Presets keep a 5% margin from the slide edge.
- Free positioning: drag the box, use the arrow keys (Shift for 5% steps), or type X / Y / Width / Height.
- The box always stays fully inside the slide. Width is 12–100% and height 8–100% of the slide. Every path is clamped in the store, including dragging, typing, duplicating, and importing backups.
- Positions, sizes, border widths, radii and font sizes are relative to the slide, so the box looks identical in the editor, thumbnails, the live console, and output windows at any resolution.

## Readability rules

- Text and background must stay readable over **any** slide, light or dark. Contrast is checked with the background composited over both black and white. Large text (24 px or more at the 1280-wide reference, or 19 px bold) needs 3:1; smaller text needs 4.5:1.
- A colour or opacity change that would break this is refused, with the measured and required contrast shown under the field. The opacity slider stops at the lowest readable value and says so.
- Colours must be `#RRGGBB` (or `#RGB`). Number fields refuse values outside their range and show the allowed range.
- Text wraps automatically. If it still doesn't fit, it shrinks (down to about a third of the chosen size). The inspector says how much it shrank. If it can't fit even then, the editor outlines the box in red and asks for a larger box or shorter text.
- Message boxes always sit above the slide's own text layer.

## Saving, undo and reset

- Like the rest of the editor, every valid change saves immediately ("Autosaved locally"). Switching slides or elements never loses work, and invalid entries are never stored, so there is no unsaved state to warn about.
- **Undo changes** returns the box to how it was when you selected it (text, position, size, visibility, style).
- **Reset style** restores the default style and keeps the text, position and size.
- Message box settings are saved on the slide element (`element.settings.message`). Each box belongs to its own slide; changing one never touches another.
- Older slides have no message boxes and are unaffected. Damaged or partial message data (old saves, backups) is repaired field by field with the defaults.

## Code map

- `src/utils/messageBox.ts`: defaults, limits, contrast, validation, presets, clamping, CSS.
- `src/components/MessageBoxView.tsx`: rendering and shrink-to-fit (used by every view).
- `src/components/editor/MessageBoxInspector.tsx`: inspector controls.
- `src/components/ColorField.tsx`: shared colour picker (also used by Branding).
- Tests: `src/tests/messageBox.test.tsx`.
