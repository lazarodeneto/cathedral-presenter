# Cathedral Presenter operations

## Start and connect

For development, run `npm ci`, then `npm run desktop`. This starts the local service and desktop display engine. Open `http://localhost:4173` in a browser on the same computer to operate it. A packaged app includes its own backend and needs no development server; it normally uses port 4173, falling back to an available port if another server owns that port. Use the browser opened by that app when its port differs.

Connect TVs as **extended displays** in the operating system. Settings → Outputs lists current OS displays, reserves the operator screen and assigns audience, confidence or broadcast roles. A remembered disconnected TV is not an available screen. HDMI splitters/mirroring may expose only one logical screen.

## Present deliberately

Present checks local media, decoding readiness and disk status before launching a service. Resolve errors; online links produce warnings. Exact-verse output acknowledgement enables the Bible Mode green status. Clearing a verse and switching in either direction between Bible and Service sends black until content is explicitly presented. This black-frame rule is separate from clearing only text or media layers during a service.

The live transport controls position, play/pause, mute, volume and loop. Only the selected audience output owns sound; editor previews stay silent. Foreground video can hold its last frame, advance or black at its end. Background video is silent and can continue across lyrics. Freeze preserves the displayed slide and media position while edits continue in preparation.

Choose per-screen follow-live or an independent pinned slide, layout and safe margins. Stage messages/countdowns appear only on confidence outputs. The Timer toolbar opens a full-screen countdown slide. Cues save and trigger a slide, background, broadcast layout and optional stage message/countdown together. Slide auto-advance is opt-in; service looping is explicit.

## Media and accounts

Sign in to upload, rename, tag, import or export media. Upload errors are shown in the dialog. The first account on a clean installation becomes administrator; new accounts cannot set their own role. All operators on this OS installation share content. Accounts are not separate cloud workspaces.

New files are quarantined, signature-checked and scanned by ClamAV before use. Missing protection blocks import. Google Drive uses one common church account; configure it as administrator in Media, then authorize in a regular browser. The native Connect button opens the local Media page in that browser. Sign in there with the installation administrator; the desktop app keeps its restricted navigation policy. After connection, return to the desktop app and focus it to refresh status.

## Backup and recovery

Settings → Data exports a ZIP containing original library media, services, songs, imported Bibles, settings and branding. Remote URLs remain references. Passwords, session cookies, controller keys and Drive secrets are excluded. Restore validates paths, checksums, file signatures and antivirus verdicts, then assigns new media IDs instead of overwriting current files. Individual media entries are limited to 300 MiB; package total is 2 GiB and manifest is 12 MiB. Disk staging needs additional free space.

The backend retains 100 workspace revisions. Stop live presentation before recovery or resolving an editing conflict. Export a separate portable backup to another storage device before a service. Revision history on the same disk is not protection against losing that disk.

## Local hardware controllers

An administrator can create/revoke a paired key in Settings → Data. It expires after two hours or server restart and permits only next, previous, black, freeze and saved cue commands. Configure a local HTTP-capable controller with `POST /api/control`, `Authorization: Bearer <key>` and JSON such as `{"command":"next"}` or `{"command":"cue","id":"saved-cue-id"}`. Maximum rate is ten commands per second. This endpoint is loopback only; it does not expose remote LAN control.

## Build and release

`npm run desktop:package:mac` runs on macOS; `npm run desktop:package:win` runs on Windows. Isolated staging rebuilds SQLite for Electron without changing the development database driver. Run `node desktop/verify-package.cjs` against an unpacked arm64 macOS/x64 Windows build for a clean-profile startup check.

The manual **Desktop validation** GitHub workflow builds/tests on each target OS and uploads unsigned artifacts for review. It does not publish releases. Signing credentials, target hardware tests, Google authorization and antivirus provisioning remain required before deployment; see [implementation status](PRESENTER-IMPLEMENTATION.md).
