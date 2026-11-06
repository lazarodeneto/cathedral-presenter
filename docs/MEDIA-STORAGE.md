# Church media storage

Uploaded images, videos and audio are stored in the local backend under `.data/media/`, outside public assets and the Git repository. SQLite stores the library; files use random identifiers, retain stable playback URLs and support video byte ranges. All browsers on this computer use the same backend library. Sign in before uploading or managing the library. Native output windows can read the installation's scanned files without a separate login.

Choose **This computer** or **Google Drive · local copy** in Media. Drive uploads keep a local copy for offline presentation. Connecting the church's same Google account on another installation allows **Sync Drive** to discover the shared files; opening a remote file downloads, verifies and scans it before caching and displaying it. Browser URL/YouTube links remain remote resources and are not downloaded by the backend.

## Antivirus

Install [ClamAV](https://docs.clamav.net/manual/Installing.html) on the host computer, then run:

```sh
npm run antivirus:update
```

The backend looks for the standard ClamAV executable on macOS, Windows and Linux. For a custom installation, set `CLAMSCAN_PATH`, `FRESHCLAM_PATH` and optionally `CLAMAV_DATABASE_DIR` in the host environment. Keep the signatures updated using this command or the operating system's FreshClam service.

Every new file first enters a private quarantine directory. The server validates the filename extension, detected file signature, declared MIME type and size, then runs ClamAV. Only a clean verdict permits local storage or a Drive upload. Detection, an engine error, a missing signature database or a timeout blocks the file and removes the temporary upload. Logos use the same scan boundary. Scanning limits are set above the application's upload limits, with exceed-limit alerts enabled. Antivirus reduces risk; it does not prove a file is harmless.

The development computer was configured with ClamAV and signed virus databases. A real scan accepted a clean PNG and detected the harmless EICAR antivirus test file. The engine and signature databases are machine dependencies and are not committed to Git.

## Shared church Google Drive

An administrator connects the church's Google account once on each installation. Other signed-in operators can use that shared connection. Tokens are encrypted with a machine-local key and never returned to the browser or committed to Git. This is installation-wide church storage, not a separate personal Drive for each user.

1. Create a Google Cloud OAuth **Web application**, enable the Drive API and configure its consent screen.
2. Register this redirect URI: `http://localhost:4173/api/media/drive/callback` (or the local origin configured in `BETTER_AUTH_URL`).
3. In Media → Configure church Drive, enter the OAuth client ID and secret as the installation administrator. The app encrypts these on disk and shows the exact redirect URI to register. Alternatively, set the private environment values below and restart:

```dotenv
GOOGLE_DRIVE_CLIENT_ID=your-web-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-web-client-secret
MEDIA_ADMIN_EMAIL=church-administrator@example.org
BETTER_AUTH_URL=http://localhost:4173
```

4. Sign in with the configured administrator account, choose **Connect church Drive**, and authorize the common church Google account.

The app requests only Google's `drive.file` scope, creates or reuses its **Cathedral Presenter** media folder and uses offline access to refresh access tokens. OAuth includes an expiring, single-use, session-bound state and PKCE. If `MEDIA_ADMIN_EMAIL` is omitted, installation administrators and the existing Drive connection owner can manage it. A new ordinary operator cannot configure or take over Drive. In the desktop app, Connect opens the local Media page in the system browser; sign in as administrator there to complete Google authorization.

Local media works without Google credentials. The cloud connection remains unavailable until the OAuth client is configured and the church account authorizes it. This implementation does not make Drive files public.

Removing a media item hides its record from the library and keeps its stored file for recovery; it does not permanently erase the cloud original. Back up `.data/media/` securely if the local computer is the only storage location. Do not put that folder in the source repository.

Google protocol references: [OAuth web server flow](https://developers.google.com/identity/protocols/oauth2/web-server), [Drive uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads).

## Portable backup

Settings → Data packages original media into a checksummed ZIP with services, songs, Bibles and settings. Restores are staged and scanned before commit; media gets fresh IDs. Secrets remain excluded. See [operations](OPERATIONS.md). A real Google authorization has not yet been completed on this installation.
