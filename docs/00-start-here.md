# Church Presenter — Start Here

This is the step-by-step handoff for building Church Presenter with another AI app builder.

## Product goal

Build an installable Mac/Windows church presentation app that works offline, feels like premium macOS software, and helps a volunteer create and operate a service quickly.

The product should have:

- Local-first services, slides, media, libraries, settings, and church branding.
- Calendar-based service discovery and one-click service duplication.
- Bible and song library integrations through provider-ready adapters.
- Bilingual scripture slides.
- Rich slide editor with images, videos, URLs, YouTube embeds/authorized imports, and QR codes.
- Reliable Previous/Next live navigation.
- Green LIVE border/glow and visible LIVE marker.
- Multi-monitor audience and confidence output.
- macOS and Windows desktop packaging.
- Modern minimalist macOS-inspired glassmorphism with Golden Gate amber/copper accents.

## Before starting

Use these visual references:

- `assets/reference/church-presenter-first-screen.png`
- `assets/reference/church-presenter-workspace.png`
- `assets/reference/church-presenter-add-slide.png`
- `assets/reference/church-presenter-bible-library.png`
- `assets/reference/church-presenter-live-service.png`
- `assets/reference/church-presenter-slide-editor.png`

The three primary screen references are:

1. `church-presenter-first-screen.png` — launch/home screen.
2. `church-presenter-bible-library.png` — Bible-first content library.
3. `church-presenter-live-service.png` — live operator/presentation screen.

Use `church-presenter-workspace.png` and `church-presenter-add-slide.png` as supporting references for the editor and Add Slide flow.
Use `church-presenter-slide-editor.png` as the detailed canvas editor reference.

Do not begin with real external integrations. Start with local mock data and provider interfaces.

Security gate: read `docs/SECURITY-REVIEW.md` and the retained red-team review before adding imports, URLs, provider credentials, desktop IPC, or installers. Treat every external file, URL, provider response, template, QR payload, and media asset as untrusted.

Before implementation, read `docs/10-reference-screen-review.md` and apply its P0 fixes first: canonical navigation, free/open Bible examples, Outputs settings, selected-versus-live state, and live recovery behavior.

## Step 1 — Give the builder the product requirements

Provide these files first:

1. `docs/01-product-brief.md`
2. `docs/02-ux-ui-direction.md`
3. `docs/03-technical-direction.md`
4. `docs/05-project-gap-analysis.md`
5. `docs/06-feature-backlog.md`

Then paste:

- `prompts/01-master-build-prompt.md`

Tell the builder:

> Read all provided documents before generating code. Build only the first functional local MVP described in the prompt. Do not add real external integrations yet. Keep the architecture ready for Tauri desktop packaging.

## Step 2 — Approve the visual foundation

Ask the builder to create only the initial workspace shell:

- Top app bar.
- Left service rundown.
- Center 16:9 canvas.
- Right operator/inspector rail.
- Glassmorphism panel treatment.
- Golden Gate palette.
- Church logo/name area.
- Current/next previews.

Do not ask for every feature yet. Check spacing, readability, contrast, and whether the slide canvas is the visual focal point.

Use:

- `prompts/02-visual-polish-prompt.md`

## Step 3 — Build the local service workflow

Ask the builder to implement:

1. Seeded Sunday service.
2. Local service list and calendar list.
3. Create, rename, delete, archive, and restore service.
4. Duplicate service with independent content.
5. Sections and rundown reorder.
6. Local autosave.
7. Save status.
8. Export/import service backup.

Acceptance test:

> Create a service, duplicate it, change the duplicate’s title and date, close/reopen the app, and verify the original is unchanged and both services remain available.

## Step 3A — Prioritize the Bible library

Before expanding songs or other integrations, implement:

1. Local bundled Bible translations.
2. Offline reference and keyword search.
3. Passage preview.
4. Add passage to the service.
5. One-verse-per-slide and multi-verse formats.
6. Bilingual passage creation.
7. Translation/license metadata.
8. USFM/OSIS/Zefania import boundaries.

Use:

- `docs/08-bible-library-first-plan.md`

Acceptance test:

> Disconnect the network, search a passage, preview it, add it as slides, create a bilingual version, save the service, restart the app, and confirm everything remains available.

## Step 4 — Build the Add Slide flow

Ask the builder to implement the Add Slide dialog using the reference image:

- Bible Passage.
- Song.
- Blank Slide.
- Announcement.
- Sermon Point.
- Media.
- Search.
- Recent content.
- Templates.
- Preview before adding.

Use local mock content only.

Acceptance test:

> Add each content type to a service, preview it, insert it, reorder it, duplicate it, and delete it with undo available.

## Step 5 — Build the Bible and bilingual scripture flow

Implement:

- Book, chapter, verse range.
- Primary translation.
- Secondary translation.
- Two-language toggle.
- Primary text at the top, bold and larger.
- Secondary text below, normal and smaller.
- Both references visible.
- Long-verse overflow handling.

Use:

- `prompts/03-integration-expansion-prompt.md`

Acceptance test:

> Create a bilingual scripture slide, change both translations, save it, close/reopen the app, and verify the formatting remains correct.

## Step 6 — Build the editor media tools

Use:

- `prompts/04-editor-media-prompt.md`

Implement:

- Image upload.
- Video upload.
- URL media.
- Official YouTube embed or authorized import only.
- QR code generation.
- Text, shapes, backgrounds, layers, resize, crop, opacity, visibility, duplicate/delete.
- Loading, missing-file, unsupported-format, invalid-URL, and offline states.

Acceptance test:

> Add an image, video, URL, QR code, and text element to a slide, reorder layers, save, reopen, and verify every element remains in the correct position.

## Step 7 — Build live presentation mode

Implement:

- Present mode.
- Current Output.
- Next Slide.
- Previous and Next buttons always visible.
- Recent slide history.
- Resume forward navigation after going backward.
- Keyboard shortcuts.
- Green live border and subtle glow.
- Visible LIVE label.
- Message popup.
- Blank output.
- Freeze output.
- Transition selector.
- Slide position indicator.

Acceptance test:

> Present a service, advance five slides, go back three slides, resume forward, show a message, blank the output, unblank it, and exit presentation mode.

## Step 8 — Build church branding and settings

Implement:

- Church name.
- Logo upload.
- Replace/remove/restore logo.
- Live preview.
- Language selector: EN, PT, PT-BR, ES, FR, DE, IT.
- Keyboard shortcut settings.
- Data location/backup action.
- Online/offline status.

Acceptance test:

> Change the church name and logo, restart the app, and verify the custom identity is preserved.

## Step 9 — Build monitor output

Use:

- `docs/09-output-monitors-plan.md`

During the browser prototype, simulate the audience output with a separate window or route. Then package with Tauri and implement:

- Monitor discovery.
- Audience monitor selection.
- Confidence monitor selection.
- Borderless fullscreen output.
- Disconnect/reconnect recovery.
- Common aspect ratios and scaling.
- Output test screen.

## Step 10 — Package for Mac and Windows

Use Tauri unless the builder has a strong existing Electron setup.

Required before release:

- macOS installer.
- Windows installer.
- Code signing.
- Update verification.
- Offline launch.
- App data migration.
- Crash recovery.
- Export/import backup.
- Real Mac and Windows testing.
- Security review of native IPC, filesystem permissions, imported files, exports, installers, and updates.

## Step 11 — Add real integrations one at a time

Only after the local workflow is reliable:

1. Licensed Bible provider.
2. Licensed song provider/JEM integration where permitted.
3. Google Calendar.
4. Outlook Calendar.
5. Authorized YouTube/media provider behavior.
6. Optional cloud backup.

Use the provider-ready interfaces from `docs/03-technical-direction.md`.

## Step 12 — Security and release review

Read and follow:

- `docs/SECURITY-REVIEW.md`

Before calling the app ready, verify:

- No secrets in the frontend or repository.
- Unsafe HTML/SVG is rejected or sanitized.
- URL schemes and hosts are validated.
- Desktop filesystem access is restricted.
- OAuth tokens use the OS credential store.
- Installers and updates are signed.
- Offline mode works.
- Dependency and installer audits pass.
- Red-team tests cover malformed files, path traversal, unsafe URLs, token leakage, monitor isolation, crash recovery, and update signature failures.

## Final acceptance checklist

The first desktop MVP is ready only when a church can:

- Install it on macOS or Windows.
- Launch it offline.
- Customize the church identity.
- Create and duplicate a service.
- Find services through the calendar.
- Add Bible, song, announcement, and media slides.
- Create bilingual scripture slides.
- Upload media and generate QR codes.
- Present to a selected monitor.
- Move forward and backward reliably.
- Show messages and blank output.
- Save, close, reopen, and recover the service.
- Export a backup.

## Full file order

### Documentation

1. `docs/00-start-here.md`
2. `docs/01-product-brief.md`
3. `docs/02-ux-ui-direction.md`
4. `docs/03-technical-direction.md`
5. `docs/04-phased-roadmap.md`
6. `docs/05-project-gap-analysis.md`
7. `docs/06-feature-backlog.md`
8. `docs/SECURITY-REVIEW.md`
9. `docs/07-content-sources-and-licensing.md`
10. `docs/08-bible-library-first-plan.md`
11. `docs/09-output-monitors-plan.md`
12. `docs/10-reference-screen-review.md`

### Prompts

1. `prompts/01-master-build-prompt.md`
2. `prompts/02-visual-polish-prompt.md`
3. `prompts/03-integration-expansion-prompt.md`
4. `prompts/04-editor-media-prompt.md`

### Visual references

1. `assets/reference/church-presenter-first-screen.png`
2. `assets/reference/church-presenter-bible-library.png`
3. `assets/reference/church-presenter-live-service.png`
4. `assets/reference/church-presenter-workspace.png`
5. `assets/reference/church-presenter-add-slide.png`
6. `assets/reference/church-presenter-slide-editor.png`
