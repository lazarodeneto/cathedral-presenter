# Church Presenter — UX/UI Direction

## Product personality

Calm, precise, modern, warm, and trustworthy. The product should feel like a premium macOS creative tool: quiet, focused, tactile, and easy to operate under pressure.

## Screen reference set

Use these coordinated visual references as the source of truth for the primary product surfaces:

- `assets/reference/church-presenter-first-screen.png` — Home screen with Create Service, Duplicate Last Service, Upcoming Services, Recent Services, Bible Library, and Connected Displays.
- `assets/reference/church-presenter-bible-library.png` — Bible-first library with offline translations, passage search, preview, licensing metadata, and bilingual creation.
- `assets/reference/church-presenter-live-service.png` — Live operator workspace with the audience output, green LIVE treatment, Previous/Next, recent history, message, blank, freeze, and monitor status.
- `assets/reference/church-presenter-slide-editor.png` — focused individual slide editor with canvas, safe areas, slide thumbnails, layers, toolbar, and properties inspector.

Supporting references:

- `assets/reference/church-presenter-workspace.png` — editor workspace anatomy.
- `assets/reference/church-presenter-add-slide.png` — Add Slide dialog and bilingual Bible insertion flow.

Keep these screens visually related: same church identity, glass surface treatment, Golden Gate amber accents, typography, spacing, icon language, and status colors.

## Visual direction

- Modern minimalist macOS-inspired desktop workspace.
- Glassmorphism used with restraint: translucent panels, soft blur, subtle inner highlights, and clear separation from the canvas.
- Warm Golden Gate palette: deep graphite, soft smoke, warm ivory, muted copper, amber-gold, and a restrained violet accent.
- The slide canvas remains the visual focal point; glass panels support it rather than competing with it.
- Use soft depth, fine 1px borders, and gentle shadows instead of heavy cards.
- Use green only for ready/live states, amber for attention, and red only for a real failure.
- Avoid visual clutter, decorative metrics, excessive pills, noisy gradients, and generic SaaS dashboard patterns.

### macOS Golden Gate visual tokens

- Base background: near-black graphite with a very subtle warm tint.
- Panel background: translucent charcoal with 16–24px backdrop blur.
- Primary text: warm ivory.
- Secondary text: cool gray with strong readability.
- Accent: Golden Gate amber/copper for focused actions and subtle highlights.
- Secondary accent: restrained violet-indigo for selected navigation and active tools.
- Live state: luminous green border and soft green glow, always paired with “LIVE”.
- Corners: moderate 10–14px radius; avoid overly rounded cartoon-like cards.
- Motion: short, quiet fades and spring-like panel transitions; respect reduced motion.

## Layout model

Use a desktop-first three-region workspace, with calendar and library access available from the top navigation or a lightweight side panel:

```text
┌────────────────────────────────────────────────────────────┐
│ Brand / service name     Calendar   Save state   Language   Present │
├──────────────┬─────────────────────────────┬───────────────┤
│ Service      │ Slide canvas / editor       │ Inspector     │
│ rundown      │                             │ / properties  │
│              │                             │               │
│ Add content  │                             │ Live preview  │
│              │                             │ Next slide    │
└──────────────┴─────────────────────────────┴───────────────┘
```

### Left: service rundown

- Service title and date.
- Sections such as Welcome, Worship, Message, Response.
- Compact slide rows with number, type icon, title, and selected state.
- Drag/reorder affordance.
- Add content button with a searchable menu.

### Center: authoring canvas

- Large 16:9 slide preview.
- Slide text is directly readable at a glance.
- Main toolbar for text, image, video, URL, YouTube, QR code, shapes, background, layers, and duplicate/delete.
- Media can be added through drag-and-drop, file picker, or URL entry.
- QR code creation opens a small focused form with live preview and size/error-correction controls.
- Keep advanced controls in an inspector so the canvas stays uncluttered.
- Editing should feel lightweight; avoid exposing every advanced setting at once.

### Media and utility states

- Upload progress and media thumbnail preview.
- Video preview with play/pause and poster frame.
- URL validation and link preview.
- YouTube link preview with a clear provider label and authorized embed/import status.
- QR code live preview with readable contrast and a test/open action.
- Missing-file, unsupported-format, offline, and permission-error states.
- Safe-import warning when a file type is rejected or sanitized.
- Clear provider/source label for remote content.

### Right: operator and inspector rail

- Current output preview.
- Next slide preview.
- Primary “Go Live” or “Present” action.
- Persistent Previous and Next controls with clear disabled states.
- A compact “recently shown” history affordance for quickly returning to an earlier slide.
- Message popup control.
- Transition selector.
- Monitor/output status.

### Live slide treatment

- The currently live slide uses a 2px green border and restrained green outer glow.
- Add a compact “LIVE” label or status marker near the active slide.
- Apply the same live treatment to the selected rundown row, active thumbnail, editor canvas, and Current Output preview.
- Keep the glow visible but not distracting in a dark room.
- Do not rely on green alone: pair it with the label, icon, or status text.

### Calendar and library surfaces

- Calendar view with month/list toggle and clear upcoming service rows.
- One-click “Duplicate service” action on a service row and in the service menu.
- Bible and Songs library search that can insert content into the active service.
- Library results show provider, language, translation/version, and a preview before insertion.

### Bilingual scripture slide

When two translations are selected, the slide editor shows a dedicated bilingual layout. The primary passage occupies the upper region with bold, larger text. The secondary passage occupies the lower region with normal weight and smaller text. Keep the two blocks visually separated without adding a heavy card inside the slide.

### Church branding settings

- Settings includes a simple “Church identity” section.
- Edit church name with an immediate preview.
- Upload, replace, remove, or restore the default logo.
- Preview the logo and name in the top-left app header before saving.
- Keep the control simple; do not turn it into a full brand-management suite.
- If no custom logo exists, use the default Church Presenter mark.

### Security and privacy states

- Show whether content is local, cached, or online-only.
- Show provider permission and connection status without exposing secrets.
- Explain what will be included in an export before creating it.
- Confirm when content is being sent to the audience monitor.
- Make destructive/reset actions recoverable where possible.

## Required states

- Empty service.
- Service with seeded content.
- Selected slide.
- Presentation mode.
- Message popup visible on output.
- Output blanked.
- Unsaved changes.
- No monitor detected / simulated monitor status.
- Language menu open.

## Interaction principles

- Every destructive action requires a clear undo path.
- Selected content is always visually obvious.
- Do not hide core actions behind right-click menus.
- Keep operator actions available while editing.
- Use meaningful empty states with one clear next action.
- Support keyboard shortcuts: next, previous, present, blank, message, save.
- Keep Previous available during presentation mode; do not hide it in an overflow menu.
- Show the current slide position and make the navigation direction clear.

## Accessibility

- Minimum AA contrast for text and controls.
- Visible keyboard focus.
- Tooltips for icon-only controls.
- Do not rely on color alone for status or selection.
- Respect reduced-motion preferences.
