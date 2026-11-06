# Local accounts

Cathedral Presenter uses Better Auth email/password authentication with SQLite. Run `npm run dev` and open http://localhost:4173. The top-right church logo opens the account menu. New accounts can be created from that menu or the login screen; signed-in operators see their name, email, Settings and Sign out.

Accounts identify operators. The presentation workspace remains local-first and shared by browsers on the local OS installation. Sign-out revokes the server session and opens login; it does not erase services or prevent the explicit offline workspace entry. This is not per-account data isolation or a protected cloud workspace.

## Server and storage

The development/preview middleware and packaged production backend serve `/api/auth/*`. Password hashing, sessions, origin checks and cookie management are handled by Better Auth. Passwords require 12–128 characters. Database-backed rate limiting is enabled. Local account tables are initialized automatically.

Private database and generated signing secret live in `.data/`, excluded from Git and blocked from HTTP access. Back up that directory privately if local accounts need to survive moving computers. Do not publish its files. Never put the signing secret in a `VITE_*` environment variable.

By default the account origin is http://localhost:4173 and the server fails rather than silently changing its development port. Set server-side `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` environment variables before starting if the origin changes or when deploying. The secret must contain at least 32 high-entropy characters. Cookies become secure on HTTPS through Better Auth's normal configuration.

A static `dist/` upload alone does not provide account APIs. Hosted use needs a persistent Node backend serving the same auth handler, durable database storage and the correct HTTPS origin. `npm run preview` includes the middleware for local production-build verification; it is not a hardened production hosting recommendation.

Email verification and password-reset email delivery are not configured. Creating a local account does not verify email ownership. Do not use these local accounts as proof of identity or church membership.

## Verification performed

- Created a temporary local account, signed in, confirmed the session, signed out, and verified the old session was revoked; removed the temporary account afterwards.
- Confirmed HttpOnly session cookie and rejected cross-origin sign-out request.
- Confirmed `.data/auth-secret` and encoded `.data/accounts.sqlite` requests return 404.
- UI tests cover anonymous menu actions, Escape focus return, session revocation before navigation and sign-out error recovery.

## Administrator boundary

The first account on a clean installation claims the installation administrator role in a database transaction. The client cannot supply its role. Existing administrators are preserved on upgrade. Administrator-only APIs govern Google client setup and paired controller keys. Authenticated operators can manage shared media; offline preparation remains available. This is an installation-level trust model, not per-account content isolation. There is no built-in universal administrator password.

Packaged application data resides under the operating system application-data directory, separate from the source checkout. Export a portable workspace ZIP to move presentation content; transfer account databases/secrets only through a private administrator backup. Email/password recovery delivery is still not configured.
