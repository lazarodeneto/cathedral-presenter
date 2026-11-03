# Church Presenter — Technical Direction

## Recommended stack

- React + TypeScript + Vite.
- Tailwind CSS or a small CSS token system.
- Lucide icons or another consistent SVG icon library.
- Local state with a simple store such as Zustand or React context.
- IndexedDB for persisted local services and libraries.
- i18next or a small typed translation dictionary for localization.
- PWA support for installability in the browser.
- Tauri is the preferred desktop shell for the distributable product because it supports macOS and Windows with a small native footprint. Electron is an acceptable alternative if the chosen builder already uses it.
- Keep the web UI separable from native capabilities so browser development and desktop packaging can share the same frontend.

## Visual reference contract

The implementation should treat these as one coordinated product surface: `church-presenter-first-screen.png`, `church-presenter-bible-library.png`, `church-presenter-slide-editor.png`, and `church-presenter-live-service.png`. Preserve the shared glassmorphism, Golden Gate amber/copper accents, warm ivory type, graphite surfaces, restrained violet selection, and green LIVE state.

## Architecture principles

- Keep content models separate from presentation components.
- Make all provider integrations adapter-based.
- Seed the app with realistic sample data so the UI feels complete without network access.
- Make the live output renderer a separate component from the editor renderer.
- Keep presentation state explicit: `currentSlideId`, `nextSlideId`, `history`, `isLive`, `isBlank`, `activeMessage`.
- Derive a shared `isLive` visual state so the green border/glow and “LIVE” marker stay consistent across rundown, thumbnails, canvas, and output preview.
- Keep all mutations undoable where practical.
- Never block the core flow because an integration is unavailable.

## Suggested domain models

```ts
type Service = {
  id: string;
  title: string;
  date: string;
  eventType?: string;
  duplicatedFromId?: string;
  sections: ServiceSection[];
  updatedAt: string;
};

type ChurchBranding = {
  name: string;
  logoUrl?: string;
};

type ServiceSection = {
  id: string;
  title: string;
  itemIds: string[];
};

type SlideItem = {
  id: string;
  type: 'song' | 'bible' | 'announcement' | 'sermon' | 'blank';
  title: string;
  slides: Slide[];
  metadata?: Record<string, string>;
};

type Slide = {
  id: string;
  kind: 'title' | 'body' | 'lyrics' | 'scripture' | 'media';
  text: string;
  reference?: string;
  bilingual?: {
    primary: ScriptureVariant;
    secondary: ScriptureVariant;
  };
  elements: SlideElement[];
  background: string;
  textAlign: 'left' | 'center' | 'right';
};

type ScriptureVariant = {
  language: 'en' | 'pt' | 'pt-BR' | 'es' | 'fr' | 'de' | 'it';
  translation: string;
  text: string;
  reference: string;
};

type SlideElement = {
  id: string;
  type: 'text' | 'image' | 'video' | 'shape' | 'qr' | 'embed';
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  source?: string;
  text?: string;
  settings?: Record<string, string | number | boolean>;
};
```

## Integration seams

Create interfaces now, implementations later:

- `BibleProvider`: search books, fetch passage, list translations.
- `SongProvider`: search songs, import lyrics, sync metadata.
- `OutputProvider`: list monitors, assign audience/confidence roles, create output windows, set output state, and recover from display changes.
- `MediaProvider`: register local media and return preview metadata.
- `CalendarProvider`: list events, search events, and create/update linked service dates.
- `BrandingStore`: persist church name and logo locally, with a default fallback.
- `MediaProvider`: import local media, validate URLs, create previews, and report missing/unsupported files.
- `QRCodeProvider`: create QR code images from validated content.
- `VideoProvider`: preview local video and support official/authorized provider embeds or imports.

The first build should use local mock adapters with clear “connected later” boundaries.

## Desktop and monitors

The final product must ship as a standalone macOS and Windows app. Use the desktop shell to open a borderless fullscreen audience-output window on a selected monitor, access local media, and manage app data directories. During early web development, simulate this with an “Audience Output” window or route, but keep the `OutputProvider` boundary ready for native monitor APIs.

## Local-first storage

- Use a local database such as SQLite through the desktop shell, or IndexedDB during the browser prototype.
- Keep imported media references stable and show missing-file recovery when a file moves.
- Do not require login, cloud sync, or a server for the first-run experience.
- Export/import a complete service or church library for backup and migration.
- Provide a clear data-location or backup action in Settings.

## Security baseline

- Treat all uploaded media, imported text, URLs, QR payloads, and provider responses as untrusted.
- Escape slide text and sanitize or reject SVG/HTML content.
- Keep provider secrets out of frontend bundles, local backups, logs, and exported services.
- Store OAuth tokens in the macOS Keychain/Windows Credential Manager through the desktop shell.
- Use an explicit allowlist for desktop filesystem access and IPC commands.
- Use official embeds or authorized imports for third-party video providers.
- Validate URL schemes, redirects, file sizes, and media types.
- Sign and verify macOS/Windows installers and updates.
- Use a strict Content Security Policy and disable arbitrary remote code execution in the webview.
- Treat templates and themes as data; never execute imported template code.
- Use parser limits and safe failure behavior for USFM, OSIS, Zefania, XML, JSON, images, and videos.
- Block path traversal, symlink escapes, UNC path abuse, and private/local network URL targets.
- Keep audience, confidence, and operator output profiles separate and explicitly assigned.
- Redact tokens, credentials, private URLs, and file contents from logs.

## Quality bar

- No placeholder lorem ipsum.
- No inert primary controls.
- No fake integrations presented as real.
- No single giant component if the app can be split into focused modules.
- Test the main flow: create service → add item → select slide → edit → present → advance → show message → blank output.
- Test live navigation: advance several slides → go back through history → jump to a previous slide → resume forward navigation.
- Test duplication preserves content but creates independent editable data.
- Test calendar search opens the correct service.
- Test bilingual scripture renders primary text above secondary text with the correct font hierarchy.
- Test a clean offline launch with previously saved services and local media.
- Test packaged desktop behavior: app launch, local storage, file import, and audience output window.
- Test editor media flow: upload image/video → preview → place on slide → save → reopen.
- Test URL, authorized YouTube embed/import, and QR generation with invalid-input and offline states.
