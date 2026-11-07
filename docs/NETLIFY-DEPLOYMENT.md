# Netlify deployment and operations

Updated 7 November 2026. Live application: https://cathedral-presenter-algarve.netlify.app. Site ID: `0de40af1-f7db-4893-a6ac-77c826424db5`. Source repository: https://github.com/lazarodeneto/church-presenter (private).

## Architecture

Netlify publishes the cloud frontend and the authenticated `/api/*` function. PostgreSQL holds accounts, workspace revisions, role grants, installations and job metadata. Private Netlify Blobs holds quarantined chunks and checked media; `/protected/media/*` requires short-lived signed tickets. The shared church Google Drive receives scanned media. No `.data` directory or user media is published with the site.

The installed runtime owns physical displays and initiates its cloud connection; the browser is the operator interface. Chrome, Safari, Firefox and other browsers can control a paired installation without receiving native Electron privileges. Keep the installation running for TVs/projectors, local media caching and offline operation.

## Build and continuous deployment

Use Node 24 and `npm ci`. `netlify.toml` builds with `VITE_CATHEDRAL_MODE=cloud`, publishes `dist`, and bundles the API and Edge handler. Hash routes do not need a blanket SPA redirect; private API failures must not return the frontend HTML.

Main-branch pushes run cloud validation: types, lint, seven-locale audit, real PostgreSQL integration tests, dependency audit, cloud build and worker build. The manual Desktop validation workflow packages and starts unsigned apps on both macOS and Windows. These tests do not validate physical display hardware.

GitHub access for Netlify uses a repository-specific read-only deploy key and a push-only webhook. No personal GitHub access token is stored as an application environment variable. Confirm the resulting deployment commit equals main before considering a release synchronized.

## Server configuration

Configure these in Netlify, production context only:

- `CATHEDRAL_ORIGIN`: canonical HTTPS origin, no path.
- `CATHEDRAL_ADMIN_EMAIL`: first owner email.
- `BETTER_AUTH_SECRET`: stable random authentication secret, at least 32 characters.
- `CATHEDRAL_ENCRYPTION_KEY`: stable 64-character random hex key. Back it up securely; rotating it without migration makes encrypted Drive credentials unreadable.
- `CATHEDRAL_BOOTSTRAP_TOKEN`: random one-use first-owner enrollment secret.
- `CATHEDRAL_WORKER_TOKEN`: private token for a trusted scanning/conversion worker.
- Managed Netlify database connection, or an explicitly configured `DATABASE_URL`.
- Optional `SMTP_URL` and `SMTP_FROM` to enable email verification/recovery.

Never prefix secrets with `VITE_`. Never commit secrets, credentials, workspace data or bootstrap URLs. Netlify Free rejected granular/masked secret-variable scopes during provisioning; production-context server variables are configured instead. They are not frontend exports. Restrict access to project members, builds and logs; use an eligible plan if granular masked scopes are required.

Apply `netlify/database/migrations/001_cloud.sql` to a new database. Better Auth initializes its own schema under a database lock on first use. Migration 001 was applied to the managed production database; do not blindly reapply it to a populated database.

## First owner and operators

An unauthenticated visitor cannot self-assign administrator privileges. The configured owner enrolls at `/#/login?mode=signup&invite=PRIVATE_BOOTSTRAP_TOKEN` and chooses a password of at least 12 characters. Keep this link private. Bootstrap is consumed after successful enrollment. There is no universal administrator password. Subsequent users require expiring administrator invitations; role changes and disabling accounts are checked server-side.

The private local deployment setup file contains the bootstrap token for this installation. It is excluded from Git. Do not paste its content into an issue or chat. Configure SMTP before relying on password recovery; the interface reports when email delivery is unavailable.

## Church Drive and antivirus

An administrator configures a Google OAuth client in Settings → Media storage, adds the exact callback shown by the app to the Google console, and authorizes the common church account. Refresh credentials are encrypted on the server. Files placed directly into Drive do not bypass quarantine or automatically become trusted.

For an always-on scanner, build `npm run worker:build`, then use `worker/compose.yml` on a trusted Docker host. Set `CATHEDRAL_CLOUD_ORIGIN` and the private `CATHEDRAL_WORKER_TOKEN` outside Git. The non-root container installs ClamAV, refreshes signatures and includes LibreOffice/fonts for visual PPTX conversion. Its persistent volumes contain signatures and work data; the root filesystem is read-only. The Docker image has not been run on an external host in this audit.

Alternatively, explicitly authorize scanning for a paired native installation with current ClamAV signatures. It scans only while running and connected. If no ready trusted scanner is online, uploads are blocked; if no converter is available, visual PPTX import explains the requirement. PDF and image imports are also scanned. Scanning is not a guarantee that a file is harmless.

## Native downloads

The app links to a separate public [downloads repository](https://github.com/lazarodeneto/cathedral-presenter-downloads/releases/latest). The private source repository and church data are not published there. Build Windows x64, macOS Apple Silicon and macOS Intel installers using the manual Desktop installers workflow; verify each clean-profile startup and publish SHA-256 checksums. The initial release is a test preview: installers are unsigned, and the macOS packages are not notarized. Obtain signing identities before a production release.

## Native installations and offline use

In the cloud app, an administrator generates a short-lived pairing code and assigns scanner capability deliberately. Enter the code in the installed app's Cloud settings. Select the intended computer in the browser. Revoke installations that are no longer trusted.

Use the installed app's explicit offline-copy action before a service. It downloads the cloud workspace and verified media into the local installation while preserving local recovery history. This is a download workflow, not automatic bidirectional merge of arbitrary offline edits. Full portable ZIP backups with original media are created/restored through the native app; cloud JSON backups reference the shared media library.

Assign displays only after they appear in the OS as extended displays. Current displays and historical names are shown separately. Emergency black is available locally even if the cloud connection is lost. A disconnected cloud link does not prove a physical TV has changed.

## Verification and rollback

After every release, check `/api/app-health` returns 200/configured, `/api/auth/get-session` returns 200/null without a session, and `/api/workspace` and `/api/media/library` return 401 without a session. An unsigned private-media request must fail. Verify favicon, noindex headers, robots.txt and that `.env`/`.data` paths are not served. Check the published frontend does not contain the configured secret values.

Then sign in and rehearse the actual service with the target output/audio hardware. Test black on clear and both mode changes, media readiness, reconnect and offline playback. Keep a portable backup and an independent fallback presentation available.

Rollback frontend/API through a previously successful Netlify deploy, and verify database compatibility before rolling code backward. Workspace revisions are content recovery, not a substitute for database and encrypted-secret backups. Retain the encryption key securely with the operational backup.

## Remaining external setup

Owner enrollment, Google OAuth authorization, SMTP and an always-on scanner host are not fabricated by application tests. Physical Samsung/four-output acceptance and signing/notarization require their respective hardware and certificates. See [audit](../FULL-AUDIT-REPORT.md) and [action plan](../ACTION-PLAN.md).
