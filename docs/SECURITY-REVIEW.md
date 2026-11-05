# Church Presenter — Security Review

Date: 2026-10-27 (updated 2026-10-28 for the editor media toolbar; 2026-11-04 full-app review)
Scope: current browser application (`src/`), build configuration, content sources, and planning documents. This is a code-level review of the local-first prototype, not a formal penetration test or production security clearance.

## Result

No verified security breach was identified in the current source. The build has no backend, no remote provider credentials, no signed desktop shell, and no live licensed Bible or song integration.

The main controls currently implemented are input validation, strict media type checks, safe URL handling, backup normalization, React text rendering, a production Content Security Policy, and a provider boundary that keeps future credentials outside the webview.

## Implemented controls

### 1. Slide and text rendering

- Slide, song, Scripture, and operator text is rendered as React text, not injected HTML.
- `sanitizeText` and `sanitizeSingleLine` remove control characters and bidirectional override characters that can spoof UI or exports.
- Backups cap text, element, slide, item, and service counts before accepting data.
- The production build injects a CSP with `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`, and `frame-ancestors 'none'`.
- External frames are limited to the official YouTube/YouTube-nocookie embed hosts.

### 2. Media and import validation

- Images: PNG, JPEG, WebP, GIF, and AVIF only.
- Video: MP4, WebM, and QuickTime only.
- Files must match an allowed extension, an allowed declared MIME type, and a sniffed file signature.
- SVG is explicitly rejected as media. SVG church logos are accepted only to be converted to PNG in the browser: the SVG loads as an `<img>` (no scripts, no external requests), is drawn to a canvas, and only the PNG is stored. An SVG that taints the canvas or fails to decode is refused.
- Separate byte limits apply to images, video, inline images, logos, and backups.
- Logo and background data URLs are validated as image data URLs before use.
- Imported element settings drop string values containing `url(`, `image-set(`, `expression(`, `@import` or `javascript:`, so a crafted backup cannot make a shape fill or colour fetch a remote resource. Template-only fields (`motion`, `videoSlot`) are kept to known values.
- Template illustrations and the default logo are original PNGs bundled as validated image data URLs; no template loads anything from the network. Empty template video slots render nothing on outputs until the church adds its own validated video.
- File picker, media dialog, background dialog, and drag-and-drop onto the editor canvas all go through the same `prepareUploadedMedia` check. No upload path bypasses validation.
- Uploaded video and large images become session-only `blob:` URLs. They are labeled "Session only", are never exported, and are marked missing after a restart.
- Imported media paths are checked for absolute paths, drive paths, UNC paths, traversal, alternate data streams, null bytes, and invalid characters. A future desktop shell must repeat this check and canonicalize the path inside its allowlisted media root.

### 3. URLs, embeds, and QR payloads

- External URLs must use HTTPS, may not contain credentials, and must not target localhost, private IP ranges, link-local addresses, `.local`/`.internal` names, or unusual ports.
- Protocol-relative URLs, backslashes, control characters, and overly long URLs are rejected.
- YouTube URLs are parsed against an allowlist and converted to privacy-enhanced embed URLs only when a valid 11-character video ID is present.
- YouTube embeds render in a sandboxed iframe (`allow-scripts allow-same-origin allow-presentation`) with a `strict-origin-when-cross-origin` referrer policy. The app never downloads or re-hosts YouTube media.
- Remote image/video URLs are previewed by the browser directly. The app does not proxy or server-side fetch them, so there is no SSRF path in the prototype. The desktop shell must keep this property or repeat the private-network check server-side.
- Online-only elements (URL media, YouTube) are labeled in the editor and show an offline state instead of a broken frame.
- QR URL payloads use the same URL guard; text and event payloads reject control characters and enforce a length cap.
- QR contact payloads are built as vCard 3.0. Each field is stripped of line breaks and escaped, so a field cannot inject extra vCard properties. At least one contact field is required.

### 4. Backup and restore

- Backup size and structure are bounded.
- IDs, enum values, numeric ranges, slide kinds, element types, and monitor roles are normalized.
- Locale and Bible translation IDs are validated against the current supported values.
- Secret-like keys (`token`, `secret`, `password`, `oauth`, `authorization`, `credential`, `apiKey`, and similar) are removed before export.
- Media sources are not exported; restored media is marked missing until the church reconnects it.
- Malformed or unsupported backup content falls back to safe defaults rather than rendering raw input.

### 5. Provider boundary and credentials

- Bible and song provider interfaces expose a security profile: authentication mode, OAuth scopes, token storage, and cache policy.
- The local providers use no authentication, no tokens, and bundled-only caching.
- The documented remote-provider path uses a desktop bridge, least-privilege OAuth, and the OS credential store. Tokens must never enter IndexedDB, localStorage, backups, logs, or exported services.
- Online-only translations are labeled and fall back to the first bundled translation when the device is offline.
- No live licensed provider or OAuth flow is included, so token handling has not been integration-tested.

### 6. Local data and output

- Services, settings, branding, monitors, and recent-library state are stored locally in the browser.
- Exported backups omit media sources and secret-like fields.
- Simulated output windows are same-origin browser pages; no arbitrary remote code is loaded into the app.
- The app does not log provider tokens or credential material.

## Open risks and required next steps

1. **Desktop shell and IPC:** The Tauri/Electron shell is not implemented. File selection, local media access, monitor output, and provider calls will need narrowly scoped commands, path allowlists, and server-side URL checks.
2. **Real provider integration:** API.Bible, CCLI/SongSelect, JEM, or similar providers must be connected through official agreements and adapters. Entitlement checks, caching rules, attribution, and disconnect/revoke flows remain unverified.
3. **Production hardening:** The CSP is injected at build time and is not active during local development. Review the final policy against the packaged app, including any desktop bridge origins.
4. **Local storage encryption:** The browser prototype keeps workspace data in localStorage. The desktop build should consider encrypted storage for sensitive integration state and should provide clear export/delete controls.
5. **Dependency and installer security:** Run dependency audits before releases. Sign and verify desktop installers and auto-updates; never execute unsigned remote code.
6. **Blob URL lifetime:** Session `blob:` URLs are not revoked when an asset is removed from the library. This is a memory cost only, not a data leak, but the desktop shell should replace them with file handles inside the media root.
7. **Content licensing:** The app cannot grant reuse rights. Keep license and source metadata with every Bible translation, song, image, and provider item, and re-check terms before expanding bundled excerpts into a full corpus.

## Security acceptance checks

- No secrets or provider tokens in the repository, frontend bundle, backups, or logs.
- Untrusted content renders as text, never as executable HTML or scriptable SVG.
- Media and backup inputs pass size, type, signature, and schema checks.
- External URLs reject private/local targets and unsafe schemes.
- OAuth tokens use the OS credential store once a desktop bridge exists.
- Offline mode keeps bundled Bible and song access working without weakening local controls.
- Installers and updates are signed and verified before release.
- Dependency audit passes before each release.

## Current limitations

This review can only verify the current browser prototype. It cannot verify desktop IPC, credential-store behavior, live provider entitlement, installer signatures, or runtime hardening in a packaged app. Repeat the review after the desktop shell and the first licensed provider adapter are connected.
