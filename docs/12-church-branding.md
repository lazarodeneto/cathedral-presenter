# Church branding

Settings → **Branding** lets a church set its name, the app title, a logo, and its colours.

## What can be changed

| Setting | Where it shows | Default | Rules |
|---|---|---|---|
| Church name | Sidebar, Home greeting, slide footers and headers, output screens | Grace Community Church | Required, up to 80 characters |
| App title | Sidebar title, header breadcrumb, browser tab title | Church Presenter | Required, up to 60 characters |
| Logo | Sidebar, header avatar, slides, output screens, preview | Initials mark | PNG, JPG, WebP or SVG, up to 2 MB |
| Logo as tab icon | Browser tab (favicon) | On | Uses the logo when one is set |
| Primary colour | Primary and Present buttons, icons, links, focus outlines, highlights, brand mark | #E5A44F | Must keep 4.5:1 contrast on the background and for button labels |
| Accent colour | Active navigation, selected items, selection highlight | #9A8BDD | Must keep 3:1 contrast on the background |
| Background colour (optional) | App background and panel surfaces | Sanctuary Dark #0A0908 | Must stay dark enough that the faintest text keeps 4.5:1 |

Live Green (what the congregation sees) and Danger red are not customisable. They carry fixed meanings (see DESIGN.md).

## Editing flow

- Changes are a draft until **Save**. The preview on the right shows the draft colours, logo and names, including a sample slide. The rest of the app keeps the saved branding until you save.
- **Cancel** returns the draft to the saved branding. **Reset to defaults** fills the draft with the default branding, which also needs **Save**.
- With unsaved changes, leaving the screen (sidebar, tabs, back button) asks before discarding. Closing or reloading the window shows the browser's leave warning.
- Errors appear under each field; Save is refused until they are fixed.

## Logos

- Each upload is checked for size (2 MB), file type, and a matching file signature, then decoded to prove it is not damaged.
- **SVG** files are converted to PNG in the browser (512 px on the long side, aspect ratio kept). The SVG is loaded as an image, where browsers never run scripts or fetch external files, and only the PNG is stored. This keeps the existing rule that no SVG markup is stored or rendered.
- Logos are always shown with `object-fit: contain`, so they are never stretched or cropped.
- A stored logo that fails to load falls back to the initials mark.

## Saving and church isolation

- Branding is saved locally with the rest of the workspace and restored on reload. Sign-out revokes the account session; shared installation presentation content remains available for offline preparation.
- Branding is stored per church id (`brandingProfiles[churchId]`). Saving and resetting only ever write the active church's entry, so one church's branding cannot overwrite another's. A single install has one church (`church_local`); `switchChurch` exists for future multi-church installs and is covered by tests.
- Missing or partial data (older saves, hand-edited files, backups) is repaired field by field: invalid values fall back to their defaults, and a stored colour theme that fails the contrast rules is not applied.
- Backups include the branding and restore it into the active church.

## Output windows

The audience and confidence windows receive the branding with each output snapshot and apply the same colours, so presentation mode always matches the operator screen.

## Code map

- `src/utils/branding.ts`: defaults, colour maths, contrast validation, theme variables, normalisation.
- `src/utils/logo.ts`: logo checks, SVG to PNG conversion.
- `src/components/branding/BrandingPanel.tsx`: the settings form, preview, and unsaved-changes guard.
- `src/store/useAppStore.ts`: `saveBranding`, `resetBranding`, `switchChurch`, per-church profiles.
- `src/hooks/useHashRoute.ts`: `setNavigationGuard` for screens with unsaved changes.
- Tests: `src/tests/branding.test.ts`, `src/tests/branding-ui.test.tsx`.

New branding options (fonts, slide backgrounds) can be added as fields on `Branding`, with a default in `DEFAULT_BRANDING` and a rule in `normalizeBranding`.
