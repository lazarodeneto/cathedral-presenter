# Cathedral Presenter — audit action plan

Updated 7 November 2026. Detailed evidence: [full audit](FULL-AUDIT-REPORT.md).

| Order | Priority | Action | Status / acceptance |
| --- | --- | --- | --- |
| 1 | Immediate | Durable cloud accounts, roles, workspace, private media, output pairing and safe imports | Implemented; 439 automated tests pass including real PostgreSQL integration |
| 2 | Quick win | Branding, fitted uppercase title, translations, minimum spacing, Bible layout, service Open action and accessible calendar controls | Implemented; seven locales checked; 20 responsive route checks pass |
| 3 | Immediate | Commit, merge and synchronize main; connect GitHub continuous deployment; verify release health | Release verification in deployment guide |
| 4 | Immediate | Activate owner account with a private one-use bootstrap link | Requires owner to choose their own password; no shared administrator password |
| 5 | Immediate | Authorize the common church Google Drive and keep a trusted ClamAV scanner online | Code and worker container ready; requires Google OAuth/account authorization and scanner host or paired native installation |
| 6 | Immediate | Email verification and password recovery | Supply SMTP configuration, then test delivered messages and recovery links |
| 7 | Immediate | Hardware acceptance on macOS and Windows | Connect real displays in OS extended mode; verify exact verse, black on both mode switches/clear, reconnect, audio and offline behavior |
| 8 | Strategic | Offline Bible startup performance | Split text loading asynchronously while retaining both complete bundled Bibles; measure actual startup and field responsiveness |
| 9 | Strategic | Manual accessibility | Check contrast over gradients, keyboard/screen-reader flows and media captions; automatic checks do not certify WCAG compliance |
| 10 | Release | Sign/notarize native releases | Requires publisher certificates; current validation packages remain unsigned |
| 11 | Maintenance | Provider and dependency operations | Update ClamAV signatures, patch LibreOffice and dependencies, monitor failed jobs, test recovery and review Netlify/Drive access |

Do not enable unscanned media, expose cloud keys in the browser, merge two active outputs by model name, or claim physical display success from renderer acknowledgement alone.
