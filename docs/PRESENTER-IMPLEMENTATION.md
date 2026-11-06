# Presenter implementation status — 6 November 2026

This supersedes the pending statuses in the original readiness review. Implementation is distinct from hardware acceptance and provider authorization.

| Requested phase | Implemented behavior | Validation / remaining work |
| --- | --- | --- |
| Media and audio | Shared play/pause/seek/volume/loop, foreground audio, silent backgrounds, audio files, end actions, render readiness, frozen frame and transport | Automated clock/freeze tests; real 38-second MOV loaded and inserted. Physical audio-device rehearsal remains. |
| Backup and readiness | Portable ZIP with original media, songs, imported Bibles, checksums, antivirus restore, review before replacing services, new media IDs, disk checks and Present preflight | Server tests cover original bytes, remapping, infected atomic refusal and traversal. Internet-dependent links remain online resources. |
| Shared installation | SQLite WAL workspace, optimistic conflict protection, 100 revisions, browser migration snapshot, recovery UI | Persistence/restart/conflict tests. Shared by local installation, not isolated per account or synchronized between computers. |
| Desktop runtime | Standalone bundled backend, native outputs, bounded output crash/load recovery, operator recovery, isolated native dependency packaging | Unsigned macOS arm64 app launched with renderer and database ready. Windows cross-build refused: native SQLite requires a Windows runner. The initial macOS GitHub job passed tests, packaging and clean-profile startup; Windows validation is in progress. The workflow uses pinned Node 24 actions and uploads portable unsigned ZIPs. |
| Outputs and stage | Independent pinned slides, follow-live profiles, full/text/lower-third, safe margins, persistent backgrounds, layer clearing, private stage messages/countdown | Routing/privacy tests. Native OS detection currently reports only HP 527sh; Samsung physical retest awaits reconnection. Four-display hardware test remains. |
| Operator workflow | Countdown toolbar, arrangements, OpenLyrics, text-only PPTX/plain-text import, cues, timed advance/loop, paired local controller API | Import bounds, controller permissions and cue atomicity tests. PPTX visual fidelity is not preserved. |
| Requested UI/content | Responsive video selectors, icon buttons for layer order, single-line Bible references, standard book typography, language flags, one-Bible default, tags and renaming, photographic soft-motion templates, supplied login video | Browser checks include a 274px inspector without clipped playback selections. Worship photograph shows both arms raised. |
| Local/cloud media | Authenticated shared library, signatures and ClamAV, shared church Drive client setup with encrypted secrets, PKCE authorization and offline cache | Real local video confirmed. Google client/account authorization still required; protocol tests do not establish a live Google connection. |

## Release gates

1. Reconnect the Samsung in macOS Displays, then verify exact verse acknowledgement, clear-to-black, both mode switches, unplug/reconnect and foreground audio. Renderer acknowledgement is not a measurement of physical TV pixels.
2. Run the Windows build on Windows and test actual output hardware. Test the intended GPU/dock and four independent outputs, followed by a complete offline rehearsal and sustained playback.
3. Provision ClamAV and current signatures on each installation. The app blocks unscanned imports; installers do not bundle this dependency yet.
4. Configure/authorize the church Google account and verify upload, second-installation sync and offline cache.
5. Supply signing/notarization certificates for distributable releases. Local artifacts and workflow artifacts are unsigned; nothing is automatically published.

NDI/SDI, genlock, edge blending, key/fill hardware, arbitrary audio-device routing, a visual stage-layout designer and licensed SongSelect/Planning Center connections remain outside the implemented feature set. No ProPresenter feature-parity claim is made.

See [operations](OPERATIONS.md), [display outputs](DESKTOP-OUTPUTS.md), [media storage](MEDIA-STORAGE.md) and [accounts](ACCOUNTS.md).
