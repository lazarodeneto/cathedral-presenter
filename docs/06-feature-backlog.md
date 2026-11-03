# Church Presenter — Missing Features and Improvement Backlog

This backlog is for a local-first Mac/Windows church presentation app. Priority levels:

- **P0** — required for a trustworthy first desktop MVP.
- **P1** — important for regular church use.
- **P2** — future differentiation and advanced production features.

## P0 — First installable MVP

### Coordinated primary screens

- Home screen matching `church-presenter-first-screen.png`.
- Bible Library matching `church-presenter-bible-library.png`.
- Individual slide editor matching `church-presenter-slide-editor.png`.
- Live Service matching `church-presenter-live-service.png`.
- Shared navigation, branding, spacing, glass surfaces, and status language across all four screens.

### Desktop and local operation

- Standalone macOS and Windows application.
- Offline launch and offline presentation.
- Local database with schema versioning and migrations.
- Autosave with visible save state.
- Crash recovery and restore-last-session.
- Export/import service backup.
- Local media storage and missing-file recovery.
- Basic settings for data location, language, shortcuts, and reset.
- Signed installers and a documented installation flow.

### Service management

- Create, rename, archive, delete, and restore services.
- Duplicate service with a new date and independent content.
- Calendar list and month view.
- Search services by title, date, event, scripture, and song.
- Sections/rundown with drag-and-drop reorder.
- Duplicate, move, and delete slides.
- Undo/redo for service and slide changes.

### Slide editor

- 16:9 canvas with visible safe margins.
- Text editing with alignment, font size, weight, color, and line spacing.
- Image upload, crop, resize, and positioning.
- Video upload with poster frame and basic playback settings.
- URL media preview with validation.
- QR code generation with live preview.
- Shapes, backgrounds, and simple overlays.
- Layer ordering and visibility.
- Slide and element duplication.
- Bilingual scripture layout with two translations.
- Templates for scripture, lyrics, announcement, sermon point, title, and blank slides.
- Basic theme system with reusable fonts, colors, and backgrounds.

### Live presentation

- Start/exit presentation mode.
- Current output and next-slide preview.
- Next and Previous always visible.
- Recent slide history and reliable backward navigation.
- Keyboard shortcuts and focus-safe operation.
- Bright green LIVE border/glow and text marker.
- Blank output.
- Freeze current slide.
- Message popup overlay.
- Transition selection with reduced-motion fallback.
- Current slide number and service progress.
- Output health indicator.

### Output and monitors

- Detect connected monitors.
- Select audience output monitor.
- Select confidence/operator monitor.
- Borderless fullscreen output window.
- Correct scaling for common resolutions and aspect ratios.
- Graceful recovery when a monitor disconnects.
- Test-output mode before going live.
- Persistent display roles for Audience, Confidence, Lobby, and Disabled.
- Per-output follow-live vs manual control.
- Monitor disconnect/reconnect recovery.
- Output test pattern before presentation.

### Content libraries

- Local songs library with title, author, language, tags, and sections.
- Local Bible library with book/chapter/verse search.
- Multiple translation metadata.
- Search and preview before adding content.
- Clear sample-data labels until real providers are connected.
- Provider interfaces for Bible, songs, media, and calendar.

### Church identity

- Church name customization.
- Logo upload, replace, remove, and restore default.
- Local branding preview.
- Consistent branding in app shell and output where appropriate.

## P1 — Production-ready church workflow

### Content and authoring

- Media library with folders, tags, favorites, and search.
- Reusable slide and service templates.
- Speaker notes and operator notes.
- Presenter notes view separate from audience output.
- Lyrics section editor for verse/chorus/bridge ordering.
- Song key, tempo, arrangement, and capo metadata.
- Scripture reference picker and recent passages.
- Rich announcement templates.
- Reusable themes per service season.
- Font installer/management with licensing warnings.
- Image focal-point cropping.
- Video loop, mute, autoplay, and end behavior.
- Audio support with volume and fade controls.
- Background motion with performance limits.

### Calendar and integrations

- Google Calendar connector.
- Outlook Calendar connector.
- Optional local calendar only mode.
- OAuth consent, disconnect, token expiry, and re-authentication.
- Event-to-service linking.
- Recurring service templates.
- Sync conflict resolution.
- Licensed Bible providers.
- Licensed song providers such as JEM where permitted.
- Integration status and offline fallback states.

### Operator experience

- Command palette.
- Keyboard shortcut editor.
- Operator countdown/timer.
- Clock and service timer.
- Quick-jump slide search.
- Emergency blackout and safe fallback screen.
- Output freeze with clear state.
- Confidence monitor content options.
- Accessibility-friendly high-contrast mode.
- Large-control mode for touchscreens.

### Reliability

- Background autosave indicator.
- Versioned backups.
- Restore previous service version.
- Media relinking workflow.
- Low-disk-space warning.
- Unsupported codec warning.
- Offline integration queue.
- Structured local logs without sensitive content.
- Error messages with recovery actions.

## P2 — Advanced differentiation

### Collaboration and portability

- Cloud backup as optional feature.
- Team workspace and role permissions.
- Service sharing and approval workflow.
- Remote operator control from phone/tablet.
- Import from other presentation tools.
- Export to PDF, images, or video.
- Portable service package for moving between computers.

### Advanced presentation

- Multi-output routing with different content per screen.
- Stage display with timers, notes, and upcoming slides.
- Lower thirds and speaker name overlays.
- Live camera input.
- NDI/SDI/virtual camera support where practical.
- Advanced transitions and motion presets.
- Key/fill or alpha output.
- MIDI, Stream Deck, and hardware control.
- OSC or network control.
- Live captioning and translated captions.
- Remote lyrics control for worship teams.

### Intelligence and workflow acceleration

- AI-assisted service outline generation.
- AI slide copy cleanup and scripture formatting.
- Automatic lyric section detection.
- Automatic translation suggestions with human review.
- Smart template recommendations.
- Duplicate-content detection.
- Service health check before presentation.

## Cross-cutting improvements

### Accessibility

- Full keyboard navigation.
- Visible focus rings.
- Screen-reader labels.
- Minimum AA contrast.
- Do not rely on color alone.
- Reduced-motion setting.
- Large-text and high-contrast modes.

### Security and privacy

- No secrets in frontend bundles or exported services.
- OS credential store for OAuth tokens.
- Sanitized text, SVG, and imported files.
- URL scheme and host validation.
- Restricted desktop filesystem and IPC permissions.
- Signed installers and verified updates.
- Clear privacy policy for optional integrations.
- Red-team test suite for malformed imports, path traversal, unsafe URLs, token leakage, monitor isolation, and update failures.

### Performance

- Fast cold start on presentation computers.
- Lazy-load large media and libraries.
- Keep live output isolated from editor re-renders.
- Preload next-slide assets.
- Warn before unsupported high-resolution media.
- Maintain stable frame rate during transitions.

### Product polish

- First-run onboarding.
- Empty states with one clear action.
- Search everywhere it matters.
- Consistent loading, success, and error states.
- Helpful tooltips for unfamiliar controls.
- Clear online/offline labels.
- Confirmations for destructive actions with undo.
- In-app keyboard shortcut reference.
- Contextual help and documentation links.

## Recommended first build boundary

The first build should complete all P0 items that are necessary to create, edit, save, duplicate, and present a service offline. P1 features should be added only after the local presentation flow is reliable on both macOS and Windows.
