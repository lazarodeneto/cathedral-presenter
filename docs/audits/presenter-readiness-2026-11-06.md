> Historical pre-implementation review. Current implementation, verification and remaining release gates: [Presenter implementation status](../PRESENTER-IMPLEMENTATION.md).

# Cathedral Presenter: readiness to replace ProPresenter

Reviewed: 6 November 2026. Scope: the current local repository, operator interface, output renderer, desktop launcher, persistence and media backend. This is a product and operational readiness assessment, not a claim of certification or feature parity.

## Assessment

Cathedral Presenter has a working foundation for service preparation and Bible presentation. It is not yet a complete professional replacement for ProPresenter. The most urgent work is reliable playback, recoverable data, production desktop delivery and trustworthy output monitoring.

Existing capabilities include service rundowns, slide editing, local Bible text, bilingual scripture, songs, templates, keyboard shortcuts, black output, current/next confidence output, timers, native physical-display enumeration, role assignment, output acknowledgements, local media storage and an antivirus upload boundary. These should be preserved and strengthened.

Multiple fullscreen windows are already supported. Independent content routing, synchronized media playback and advanced production outputs are separate capabilities that remain incomplete or absent.

## Release blockers

### 1. Proper video and audio playback — critical

**Verified:** ordinary slide videos are rendered with `autoPlay`, `muted` and `loop` unconditionally in `src/components/SlideRenderer.tsx:210`. The output snapshot has no playback position, transport state, volume or audio-device state. The asset model supports images and videos, but no audio-only media type.

**Service impact:** an announcement video cannot be operated as a normal video with sound, a definite end and a visible remaining time. Separate screens start their video elements independently. Matching the slide ID does not synchronize their playback clocks.

**Required:** distinguish background loops from foreground videos; add play/pause/stop/restart, seek, duration and remaining time, selectable loop, fade and end actions. Add audio-only tracks, volume/mute and a selected main output device. Preview audio must be isolated from live audio. A shared playback clock and drift correction must drive all output windows. Device/channel routing can follow the initial single-device implementation.

**Acceptance:** play a sound-bearing video once on two outputs; pause, seek and resume together; hear sound only on the intended device; changing lyric slides must not restart a background loop; finish with a predictable end action.

### 2. Complete, portable backups — critical

**Verified:** `src/security/backup.ts:79` exports JSON metadata, removes media-library sources and marks assets missing. It does not package backend media bytes. The export input also does not include the standalone `librarySongs` collection, although song slides already embedded in services are included with those services.

**Service impact:** a backup is not sufficient to rebuild the church library and run the same service on a replacement computer. A surviving filename or API URL does not mean the underlying file exists on that computer.

**Required:** a portable service/library package with slides, original media, song-library entries, imported Bibles, fonts when distributable, a manifest and checksums. Add automatic versioned backups, restore preview and missing-media relinking. Credentials must stay outside ordinary service packages.

**Acceptance:** export on one computer, restore on a clean second installation with internet disabled, and run the entire service without missing media or songs.

### 3. One durable installation workspace — critical for the promised browser workflow

**Verified:** service editing data still uses browser-profile `localStorage` through `src/store/workspacePersistence.ts:151`. Media and accounts use backend storage, but the service workspace is not shared between browser profiles. This is documented in `docs/DESKTOP-OUTPUTS.md` and `docs/ACCOUNTS.md`.

**Service impact:** opening the same installation in Safari, Chrome or Electron can expose different service libraries despite using the same account and physical output engine. Browser storage clearing or quota limits can affect the workspace independently of the media database.

**Required:** persist services, songs, settings and revisions in the installation database. Browsers should be clients of that workspace. Add transactional saves, migrations, revision history and a clear single active output controller. Keep an explicit offline operating policy.

**Acceptance:** edit in one browser and open the same saved service in another browser and the desktop app; restart the computer; recover the latest committed revision without relying on browser storage.

### 4. Installable, self-contained desktop release — critical

**Verified:** `desktop/launch.cjs:25` starts Vite through the development dependencies. `desktop/main.cjs` loads a fixed localhost origin. The project has a development Electron shell, not a signed production installer or update pipeline.

**Required:** packaged macOS and Windows applications containing the frontend, backend and required runtime; writable application-data locations; a deliberate local-port strategy; native dependency packaging; installer signing/notarization; verified updates with rollback; supported antivirus installation and database updates. A volunteer should not need Node, a terminal or Homebrew.

**Acceptance:** install on clean Windows and macOS computers with no development tools; cold-start offline; import media and operate external displays.

### 5. Output health must include actual media readiness and clean audience output — critical

**Verified:** `src/screens/OutputScreen.tsx:111` acknowledges a snapshot after React commits and then every second. This confirms the renderer received state; it does not confirm video/image decoding, progressing video frames, sound routing or that the physical TV panel is displaying the signal. Media errors are handled locally by `SlideMedia` and are not part of that acknowledgement. Native startup code has no `render-process-gone` or `unresponsive` recovery handler.

**Also verified:** freezing keeps the chosen slide, but does not freeze the video playback clock or CSS motion. `OutputScreen.tsx` renders an `output-frozen-hint` in the audience frame; only `output-chrome` is hidden by the physical-output CSS. A professional audience feed should not contain operator freeze indicators.

**Required:** separate connection, slide receipt, media readiness and playback health; surface errors per output to the operator; keep technical labels off audience feeds. Define whether Freeze means holding slide selection or freezing all motion, and name/implement it accordingly. Add output-process watchdogs, controlled restart, diagnostics and a deliberate fallback policy when the controller disappears.

**Acceptance:** test a missing video, corrupt image, renderer crash, controller disconnect, disk-full condition and display reconnect. The operator must see the specific fault; no misleading healthy state or private/operator UI should reach the congregation.

## Important capabilities after the blockers

### 6. Independent screen routing and output layouts — high priority

Audience windows currently share the same audience slide. Broadcast mirrors that slide in its own format; confidence uses a separate current/next layout. The model does not provide arbitrary content or layout selection per physical display (`src/providers/output/OutputProvider.ts:13`).

Add output presets so the main screen can show full lyrics, the livestream can show transparent lower thirds, the lobby can show announcements and the stage can show large text simultaneously. Add per-output safe areas, scaling and delay. NDI/SDI, key/fill, LED-wall mapping and edge blending are later requirements if the church's production system needs them; they are not currently implemented.

ProPresenter's official screen documentation describes system, NDI, SDI and Syphon outputs and mirrored/grouped/edge-blended configurations: [Screen Configuration](https://support.renewedvision.com/hc/en-us/articles/360041879173-Screen-Configuration-in-ProPresenter).

### 7. Persistent presentation layers — high priority

The editor has layers within an individual slide. It lacks an independent show compositor for a continuing motion background, lyrics, logo, announcement and live input. `TransitionStage` in `src/screens/OutputScreen.tsx` keys incoming content by slide ID, remounting that slide's media when changing slides.

Add persistent background/media layers and separate clear-text, clear-media, clear-overlays and clear-all actions. Changing a lyric should not restart the song's background. Maintain an immediate, globally reachable blackout.

### 8. Configurable stage display and private communication — high priority

Current/next slides, notes and elapsed time already exist. What is missing is an editable stage layout, independently controlled stage messages, prominent countdown/overrun cues, wall clock, video remaining time and different layouts for the pastor and worship team. Current audience alerts should not be reused as private stage messages.

Renewed Vision demonstrates configurable current/next stage content and changing layouts in its official [Stage Screen webinar](https://www.youtube.com/watch?v=erplGT8z028).

### 9. Migration and weekly preparation workflow — high priority for adoption

Add supported imports for existing presentation libraries, OpenLyrics/plain text, PowerPoint/PDF where feasible, and song arrangements with reusable verse/chorus sequences. Provide licensed SongSelect/CCLI integration and usage reporting where applicable. The current registered song provider is local; a provider interface is not a connected licensed service.

Planning Center integration should import the service order, arrangements and authorized media attachments, with an explicit refresh/review workflow rather than silently changing a live rundown. ProPresenter documents those workflows in [Using Planning Center](https://support.renewedvision.com/hc/en-us/articles/4408670102419-Using-Planning-Center-with-ProPresenter).

### 10. Repeatable cues and external control — high priority for larger teams

Keyboard shortcuts exist. A show-level cue/macro system, scheduled announcement playback, advance-on-video-end, paired mobile remote and production-control integrations are missing. Begin with safe macros such as “start worship”: select the output layout, start a background, clear announcements and show the first lyric. Add MIDI/OSC/Stream Deck or Companion control when required by the installation.

Remote access must be designed and paired explicitly. The existing loopback-only relay deliberately does not provide network remote control.

### 11. Team workflow and finished cloud operation — scope dependent

Local sign-in is implemented, but it is not account-isolated presentation storage or a role-based team workspace. The shared Google Drive media integration has implementation code; this installation still needs Google OAuth configuration, authorization of the church account and a real end-to-end cloud test. It does not synchronize full service editing data.

Before promising multi-campus collaboration, add administrator/editor/operator roles, explicit publishing to the presentation computer, conflict handling and an offline-ready status for every required asset. Cloud failure must not interrupt cached local presentation.

## Operational release gate

The current readiness indicator checks that sections, songs, scripture, slides and an output assignment exist. It is not a technical preflight (`src/utils/serviceReadiness.ts`). Replace or supplement it with a service check for missing/unreadable media, supported codecs, local cache, required fonts, writable storage, free disk space, audio destination and active physical outputs.

Before replacing the existing Sunday system, demonstrate:

1. A complete rehearsal without internet on the actual presentation computer.
2. A two-hour soak with the intended display count and resolution, including video and audio. Four independent outputs need a real four-output hardware test, not only simulated display tests.
3. Display unplug/reconnect, sleep/wake, changed display IDs and restarting the controller, with a documented output fallback policy.
4. Restoration onto a clean replacement computer from the portable backup.
5. A volunteer can prepare, present, black out, recover a mistake and end a service without developer help.
6. No operator notes, technical controls, loading/error panels or freeze labels appear on the audience feed.

## Recommended order

First deliver playback/audio, durable shared storage and complete backup/restore. Then package the desktop release and prove recovery and output health on real hardware. Follow with output layouts, persistent layers and stage controls. Add migration, licensed integrations, cloud team workflows and automation once that core is dependable.

## Validation limits

This review inspected executable code and the running preparation UI. It did not perform a new Windows hardware test, a physical four-output test, audio-device test, NDI/SDI test, real Google OAuth authorization or a complete live-service soak. Earlier simulated display tests and individual output acknowledgements do not establish those capabilities.

The preceding spacing fix was visually checked at 390, 800, 1175 and 1440 pixel widths across Home, Bible and Bible settings surfaces. Type checking, targeted selector/library UI tests and whitespace checks passed. No broad claim that every screen has been exhaustively audited is made.
