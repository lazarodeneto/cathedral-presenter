# Cathedral Presenter

Local-first church presentation workspace for service rundowns, Bible presentation, media and native display outputs on macOS and Windows. The default Bible library contains complete **Bíblia Livre** and **Tradução Brasileira** in Brazilian Portuguese.

## Run locally

With Node.js 24 or later installed:

```sh
npm ci
npm run desktop
```

Open [localhost](http://localhost:4173) in a browser on the same computer. Keep the desktop engine running for physical outputs; connect TVs/projectors as extended displays and assign their roles in Settings → Outputs. Browsers share the installation workspace and media library.

Sign in to upload/manage media. The first account on a clean installation becomes administrator. There is no universal administrator password. ClamAV and current signatures must be installed before importing files; missing protection blocks imports. Google Drive uses one authorized church account and needs administrator OAuth setup.

## Cloud hosting

The cloud application is hosted at [Cathedral Presenter](https://cathedral-presenter-algarve.netlify.app). Netlify builds the cloud mode; it does not replace the installed engine for physical TV/projector outputs. See the [deployment guide](docs/NETLIFY-DEPLOYMENT.md) for owner enrollment, shared church Drive, antivirus workers, pairing and recovery. Cloud signup requires a private owner bootstrap or administrator invitation.

Import PDF, visual PowerPoint (.pptx), Gamma PDF/PPTX exports and image sequences through Import presentation. Visual imports preserve rendered pages; review fonts and previews before presenting. PowerPoint animations and embedded playback are not reproduced as static slides. Create/import/export reusable layouts in Templates.

## Verify and build

```sh
npm run typecheck
npm run lint
npm test
npm run desktop:package:mac
# On a Windows machine:
npm run desktop:package:win
```

Packaged apps include the frontend/backend/runtime and store private data in the OS application-data folder. Build on the target OS because SQLite is native. The manual [Desktop validation workflow](https://github.com/lazarodeneto/church-presenter/actions/workflows/desktop-validation.yml) tests, packages and starts a clean installation on both systems, then provides unsigned ZIP artifacts. It does not publish releases.

## Operations and readiness

- [Operator guide](docs/OPERATIONS.md): playback, stage timers, cues, portable backup/recovery and local controllers.
- [Implementation status and remaining gates](docs/PRESENTER-IMPLEMENTATION.md).
- [Physical displays](docs/DESKTOP-OUTPUTS.md), [media/Drive](docs/MEDIA-STORAGE.md), [accounts](docs/ACCOUNTS.md).
- [Full audit and verified limits](FULL-AUDIT-REPORT.md), [action plan](ACTION-PLAN.md).
- [Netlify deployment and cloud operations](docs/NETLIFY-DEPLOYMENT.md).

The installed runtime provides shared local/offline operation; the Netlify cloud app adds authenticated shared content and paired native control. This is one church workspace, not isolated multi-tenant SaaS. Credentials and user media stay outside Git. Signing/notarization, antivirus provisioning, Google authorization and a full rehearsal on the intended display/audio hardware remain deployment gates. Advanced NDI/SDI, genlock, blending and licensed provider integrations are not implemented.
