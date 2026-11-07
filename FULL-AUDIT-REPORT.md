# Cathedral Presenter — full audit

Date: 7 November 2026. Scope: full application source and deployed private application, local backend, Electron boundary, cloud API, authentication, storage, imports, outputs, translations, accessibility, responsive layout, performance and technical SEO. This is a source review with automated integration and browser tests, not a penetration-test certification or a claim of ProPresenter feature parity.

## A. Audit summary

**Assessment:** automated checks pass; cloud application infrastructure is implemented. First-owner activation, church Google authorization, email delivery and physical display acceptance remain operational gates. Cloud imports require a connected scanner; the app deliberately refuses unscanned files.

The principal remaining issues are external service authorization, hardware acceptance and the large post-login offline Bible payload. The principal completed improvements are durable authenticated cloud storage, fail-closed media processing and a consistent responsive operator workflow. No numerical SEO or Core Web Vitals score is assigned: this is a private app and field measurements are unavailable.

### Verification

| Check | Observed result |
| --- | --- |
| Application tests, including real PostgreSQL integration in an isolated temporary schema | 68 files, **436 tests passed**; all integration tests enabled |
| TypeScript, ESLint, translation audit, local build and worker build | Passed |
| Dependency audit | **0 known vulnerabilities** at audit time; this does not establish absence of exploitable flaws |
| Translation coverage | Seven locales, 1,806 dictionary keys, 1,027 literal translation call keys, no missing keys or placeholder errors |
| Browser accessibility and responsive routes | Ten routes at 1,076px and 390px: no reported axe violations and no document horizontal overflow |
| Product title | Condensed uppercase weight 600; complete sidebar name fits; login title fits at 1,440 / 768 / 390 / 320px |
| Real PDF import | Two pages rendered, scanned and inserted as exactly two slides; no extra welcome slide |
| Real PowerPoint import | Two different layouts converted through LibreOffice, rendered, scanned, previewed and inserted; first slide visually reviewed |
| Reusable templates | Create from selected slide, reload persistence, rename, export, add to service and delete exercised in an isolated QA installation |
| Antivirus | Real ClamAV accepts a clean fixture and rejects the standard EICAR fixture; temporary test files removed |
| Native discovery | macOS reports HP 527sh as the active operator display; historical Samsung entries are not evidence of an active TV |

Browser evidence is stored locally under `.playwright-mcp/audit` in the Codex workspace; raw deployment and antivirus evidence is private under `.data/audit-2026-11-07`. Build/test logs are in `/tmp/cathedral-final-*`. No credentials or private workspace content are included in this report.

## B. Findings

Severity describes application impact; confidence is Confirmed, Likely or Hypothesis. “Fixed” refers to the reviewed source; deployed release verification is recorded separately in the deployment guide.

| Area | Severity | Confidence | Finding and evidence | Fix / disposition |
| --- | --- | --- | --- | --- |
| Cloud startup | High, fixed | Confirmed | Initial production health returned 503; Better Auth construction before migrations cached an invalid schema context | Run migrations under a PostgreSQL advisory lock before constructing authentication; concurrent cold-start integration test and production probes |
| Authentication | High, fixed | Confirmed | Online hosting needs durable accounts and controlled administrative enrollment | PostgreSQL Better Auth; one owner bootstrap tied to configured email and secret; subsequent invitation-only accounts; server-selected roles, revoked sessions and last-admin protection |
| Private file access | High, fixed | Confirmed | Static public media or unauthenticated uploads would expose church material | Private Blobs, authenticated manifests, short-lived signed tickets, bounded byte ranges and no-store responses; unauthenticated access tests |
| Upload integrity | High, fixed | Confirmed | Late chunk mutation or an unavailable scanner must not release unsafe bytes | Content-addressed chunks, sealed uploads, hashes, worker leases, explicit clean verdict and scan-before-publication; infection, mismatch and replay tests |
| Drive boundary | High, fixed | Confirmed | Files placed directly in Drive must not be treated as scanned | Only known matching scanned files are refreshed; encrypted server-side OAuth data, PKCE, user-bound one-use state and resumable upload recovery |
| API boundaries | High, fixed | Confirmed | Public hosting introduces CSRF, role, quota and durable-rate-limit boundaries | Exact-origin checks, bounded bodies, durable rate limits, serialized upload quotas, explicit installation capabilities, parameterized SQL and conservative error responses |
| Import safety | High, fixed | Confirmed | Office external relationships, malformed archives and private-network media references can cross trust boundaries | ZIP/XML bounds, reject external media relationships and entities, fresh restricted LibreOffice profile, scan original and generated PDF, validated public media URLs, executable media and stale blob references removed |
| Workspace integrity | High, fixed | Confirmed | Concurrent operators and partial uploads could overwrite durable content | Optimistic revisions, immutable bounded chunks, checksums, 100-version recovery history and explicit conflict handling; PostgreSQL and restart tests |
| Native control | High, mitigated | Confirmed | A public browser cannot enumerate or own OS display windows | Outbound paired native runtime, short-lived pairing codes, scoped hashed installation tokens, restricted native commands, local emergency black and revocation tests. No arbitrary remote IPC or LAN listener added |
| Local backend | Medium, fixed | Confirmed | Local conversion/static serving needs same-origin controls and correct PDF worker MIME types | Loopback host/origin/header checks, signed-in conversions, private temp files, correct JavaScript/WASM types and complete bounded reads |
| Storage retention | Medium, fixed | Confirmed | Abandoned quarantine and converted documents consume space | Bounded worker cleanup for failed uploads and expired scan outputs; conversion download expiry; local conversion retention cleanup. Published media deletion remains recoverable rather than immediate physical erasure |
| Test lifecycle | Medium, fixed | Confirmed | Vite backend poll timers prevented test process shutdown | Backend plugins disabled in test mode; final suite exits normally |
| Output history | Medium, fixed | Confirmed | AirPlay changes in identifiers/resolution produced duplicate historical Samsung cards | Current OS displays are the actionable cards; normalized-label historical entries are grouped in a separate list, independent of resolution; distinct active display IDs remain separate |
| Live behavior | High, regression covered | Confirmed | Clearing a verse and switching Bible/service modes must black the audience output | Existing shared output-state and mode-navigation regression suites pass. Physical TV pixels are not verified by software acknowledgements |
| Import fidelity | Medium, improved | Confirmed | Text-only PPTX loses slide layouts | Visual PDF/PPTX/image path preserves rendered page appearance; editable-text mode remains optional. Office fonts may substitute; embedded animations, audio and video are not reproduced in static page imports |
| Models | Medium, fixed | Confirmed | Built-in models alone do not support preacher/user layouts | Bounded reusable templates, JSON and visual imports, copies, export, renaming, deletion and workspace/backup persistence |
| Translations | Medium, fixed | Confirmed | Missing keys, hardcoded strings and remote locale application cause inconsistent UI | All seven dictionaries checked; missing Bible update/character strings fixed; language changes update HTML lang; shared content no longer overrides operator language; service-list action is localized “Open” |
| Layout | Medium, fixed | Confirmed | Dense boxes, clipped labels and reference wrapping impede live use | Shared minimum insets, service action spacing, adaptive Bible layout, icon actions and condensed fitted product title. The old desktop Bible arrangement is restored |
| Accessibility | Medium, fixed / partial | Confirmed | Nested calendar buttons, unnamed mobile actions, invalid labelled containers and heading/landmark issues | Independent native controls, accessible names, semantic regions and headings; 20 route/viewport axe runs now report zero violations. Gradient contrast and video caption checks need manual review; no WCAG conformance claim |
| Branding | Low, fixed | Confirmed | Legacy title and campus subtitle remained in product branding | Cathedral Presenter default and migration; uppercase fitted UI name; updated logo and app icons; white cross on black favicon. User-authored campus tags/content are not erased |
| Indexability | Pass | Confirmed | Authenticated operator content should stay private rather than rank | HTML and response-header noindex/nofollow/noarchive; robots disallows crawling. These controls complement authentication; they are not access controls |
| SEO metadata | Low, fixed | Confirmed | Old product metadata and unsupported frame-ancestors meta directive | Updated title/description; frame-ancestors delivered as a real response header |
| Public SEO content | Info | Confirmed | Hash routes are private tools, not public landing pages | No artificial sitemap, hreflang, rating schema or marketing copy added inside the operator app. A future public marketing site needs a separate SEO review |
| Login performance | Pass / optimization | Confirmed | Login should not eagerly load the full editor and Bibles | Lazy workspace, self-hosted fonts; PDF library separated from shared vendor chunk and only loaded for import; workers keep PDF rendering outside the main UI |
| Offline Bible payload | Warning, open | Confirmed | Store chunk is about 8.675 MB raw / 2.706 MB gzip, including the two complete default Bibles | Retained for complete offline defaults. A future asynchronous Bible-text loading refactor can reduce post-login download/parse cost without dropping content |
| Core Web Vitals | Unknown | Hypothesis | PageSpeed request returned Google 429; no production CrUX/INP or stable field sample | Do not invent a Lighthouse/CWV score. Measure on the actual operator machines and production after representative use |
| Deployment secret handling | Warning, operational | Confirmed | Netlify Free rejected granular secret-variable scopes | Production-context server variables configured through Netlify; no VITE secret exports or committed keys. Access to Netlify builds must be restricted; masked/granular secret scopes require an eligible plan |

## C. Prioritized action plan

See [ACTION-PLAN.md](ACTION-PLAN.md) for execution order and [deployment operations](docs/NETLIFY-DEPLOYMENT.md) for setup, rollback and release checks.

1. Complete production release verification and GitHub continuous deployment.
2. Owner creates their own password through the private bootstrap setup, then invites operators.
3. Authorize the shared church Drive account and keep a trusted scanner online before cloud imports.
4. Configure email delivery and verify recovery/verification end to end.
5. Rehearse on intended macOS/Windows display/audio hardware, including clear-to-black, disconnect/reconnect and offline playback.
6. Reduce the post-login Bible payload and complete manual contrast/assistive-technology testing.

## D. Unknowns and limits

- Google OAuth configuration, real Drive authorization and SMTP have not been supplied; mocked protocol tests are not a real provider connection.
- The scanner container is prepared, not provisioned on an always-on external host. A paired trusted native installation may scan while online and explicitly authorized. Protection blocks imports when unavailable.
- Native display enumeration follows displays exposed by the OS. AirPlay/HDMI/DisplayPort/USB-C extended screens can be assigned when present; HDMI splitters that mirror one OS output cannot become independent outputs in software. Browser choice cannot remove this OS limitation.
- Historical device-name grouping is a UI deduplication heuristic, not proof of a stable hardware serial. Identical concurrently active devices are not merged by name.
- Physical Samsung and four-independent-screen tests, end-to-end audio timing, long-duration playback and offline rehearsal remain unverified.
- Native Office parsing still processes complex untrusted formats; keep LibreOffice patched and prefer the dedicated non-root worker. Static PDF/image exports are a useful fidelity fallback.
- Unsigned native packages are not signed/notarized releases. NDI/SDI adapters, genlock, edge blending, hardware key/fill, arbitrary audio-device routing and licensed provider integrations are not implemented.
- This is one shared church workspace, not isolated multi-tenant SaaS. Native synchronization requires an initial explicit choice, uses revision baselines and pauses for conflicts instead of merging edits. Backup retention and access policies should reflect that model.
- Security controls and dependency scans reduce risk; they cannot establish that all vulnerability classes are absent.
