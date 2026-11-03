# Church Presenter — Project Gap Analysis

Date: 2026-10-27

## Executive summary

The product direction is strong, but the project is currently a specification and visual-reference pack, not an application. There are no source files, package manifest, build configuration, tests, desktop wrapper, database, integrations, installers, or release process yet.

The approved visual reference set now includes Home, Bible Library, Slide Editor, and Live Service screens; implementation still needs to connect them into one navigable workflow.

The safest build order is: local operator prototype → reliable local data/media → desktop shell and monitor output → licensed integrations → release hardening.

## Status overview

| Area | Current state | Missing before production |
|---|---|---|
| Product vision | Documented | Final MVP scope and acceptance checklist |
| UX direction | Documented with reference images | Clickable screens, responsive states, accessibility review |
| Frontend | Not started | React/Vite app, components, state, routing, styling |
| Local persistence | Planned only | Database schema, migrations, autosave, backup/recovery |
| Slide editor | Planned only | Canvas model, layers, media handling, undo/redo |
| Presentation output | Planned only | Native output window, monitor selection, fullscreen behavior |
| Calendar | Adapter described | Local calendar UI, event model, sync/auth/conflict rules |
| Bible/songs | Mock providers described | Seed data, licensing decisions, provider contracts, import flow |
| Desktop | Tauri preferred | macOS/Windows wrapper, permissions, installers, signing |
| Security | Requirements documented | Code-level audit, dependency audit, IPC review, threat testing |
| Release/support | Not defined | Updates, crash recovery, support docs, versioning |

## Critical gaps

### 1. No implementation baseline

Missing:

- `package.json`, TypeScript config, Vite config, and app entry points.
- Component structure and routing strategy.
- State management and persistence implementation.
- Build, lint, format, and test scripts.
- CI or repeatable local verification.

### 2. Desktop target is not yet concrete

Decide and document:

- Tauri version and native plugins.
- Minimum supported macOS and Windows versions.
- Whether Apple Silicon and Intel are supported.
- Windows x64/ARM support.
- Installer format: DMG/PKG for macOS and EXE/MSI for Windows.
- Code-signing certificates and notarization ownership.
- Auto-update policy, rollback behavior, and offline update behavior.
- App data directory and migration strategy.

### 3. Local data model is incomplete

The current models need explicit entities for:

- `Slide.elements` and element-level styles.
- Media assets and file fingerprints.
- Bible translations and passage cache.
- Songs, song arrangements, and lyric sections.
- Calendar events and service links.
- Themes, fonts, transitions, and output profiles.
- App settings, church branding, shortcuts, and recent services.
- Schema version and migrations.

Also define duplication semantics, deletion/restore behavior, autosave timing, conflict handling, and export/import format.

### 4. Presentation output is under-specified

Still needed:

- Main output vs confidence monitor behavior.
- Monitor discovery and selection.
- Borderless fullscreen window behavior.
- What happens when a monitor is unplugged.
- DPI/scaling and aspect-ratio handling.
- Output resolution and safe-area rules.
- Local fonts and missing-font fallback.
- Global keyboard shortcuts and focus behavior.
- Emergency blank, freeze, and recovery behavior.
- Whether a second operator/control device is in scope.

### 5. Editor needs a real document model

Define:

- Coordinate system and 16:9 canvas rules.
- Element anchoring and responsive scaling.
- Text overflow and long-scripture behavior.
- Font loading, fallback, and licensing.
- Crop, mask, opacity, blend, and z-order behavior.
- Video poster frame, autoplay, loop, mute, and playback state.
- Undo/redo history and keyboard editing.
- Theme/template inheritance.
- Duplicate slide vs duplicate element behavior.

### 6. Media lifecycle is missing

Specify:

- Supported image/video formats and maximum sizes.
- Where local media is copied or referenced.
- Missing-file detection and relinking.
- Thumbnail and poster generation.
- Cleanup when a media asset is deleted.
- Offline behavior for remote URLs and YouTube embeds.
- Rights/permission metadata for imported media.

### 7. Bible and song content has legal/product gaps

Before real integrations:

- Decide which Bible translations are licensed and from which providers.
- Decide whether song lyrics require CCLI/JEM or other permissions.
- Define attribution and copyright display requirements.
- Define whether users can import, edit, export, and share lyrics.
- Define provider rate limits, offline caching rules, and token storage.
- Do not ship copyrighted seed content without permission; use public-domain or clearly licensed samples.

### 8. Calendar behavior is not defined

Decide:

- Local-only calendar vs optional Google/Outlook sync.
- OAuth flow and token storage.
- Event-to-service linking rules.
- Time zone and recurring-event behavior.
- Sync conflict behavior.
- What remains available offline.
- Search fields and calendar indexing.

### 9. Onboarding and recovery are missing

Add flows for:

- First launch and church identity setup.
- Importing an existing service/library.
- Choosing a default language and Bible translation.
- Connecting optional providers.
- Testing the audience output monitor.
- Recovering after a crash or interrupted save.
- Restoring from a backup.
- Resetting app data safely.

### 10. Quality and release process are missing

Create:

- Unit tests for state mutations and duplication.
- Component tests for editor controls and live navigation.
- End-to-end tests for the full service workflow.
- Offline tests with no network access.
- Desktop tests on real macOS and Windows machines.
- Multi-monitor hardware tests.
- Media-format compatibility tests.
- Accessibility and keyboard-only tests.
- Dependency, installer, and update security checks.
- Release checklist and rollback plan.
- Security regression suite for imports, URLs, IPC, exports, monitor isolation, and updates.

## Important inconsistencies to fix

- `MediaProvider` is listed twice in the technical direction; merge the two definitions.
- The `Slide` model does not yet include `elements`, even though the editor requires layers and media objects.
- The roadmap puts several core editor capabilities in Phase 1 but calls Phase 1 a clickable prototype; decide whether this is a prototype or a functional MVP.
- PWA is listed alongside desktop packaging; clarify that PWA is only a development/demo surface, not the final distribution target.
- “YouTube download” needs to remain explicitly limited to official embeds or authorized imports.

## Recommended implementation order

1. Scaffold the React/Vite app and implement the three-pane operator workspace.
2. Add typed local models, seeded services, local persistence, autosave, and duplication.
3. Implement the editor document model, text editing, bilingual scripture, media upload, QR creation, and undo/redo.
4. Implement presentation state, previous/next history, live indicator, message, blank, current/next preview, and keyboard shortcuts.
5. Add local calendar, search, library adapters, and export/import.
6. Package with Tauri and implement native file access and output windows.
7. Add monitor hardware testing, signed installers, recovery, and release checks.
8. Add licensed Bible, song, and calendar integrations one at a time.

## Definition of ready for the first desktop MVP

The first installable MVP is ready only when a church can install it on macOS or Windows, launch it offline, create or duplicate a service, add and edit local content, present it on a selected monitor, go backward and forward reliably, recover after relaunch, export a backup, and understand which optional features require internet access.
