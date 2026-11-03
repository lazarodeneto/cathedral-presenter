# Golden Gate macOS style and layout prompt

```text
Restyle the Church Presenter web app to follow the macOS 27 "Golden Gate" design language, as a senior macOS product designer. Change the look and the app-shell layout only. Keep every workflow, route, keyboard shortcut, store action, and i18n string working.

Read first:
- `DESIGN.md` and `PRODUCT.md` (product intent, colour roles, type roles, corner scale)
- `src/styles.css` `:root` (the authoritative token list; part of a Golden Gate gold palette already exists there: `--gold-rgb`, `--gold-bright`, `--line-gold`, `--surface-glass`)
- `src/App.tsx`, `src/components/layout/`, `src/components/Sidebar.tsx`, `src/components/TopBar.tsx`, `src/components/MobileNav.tsx`, `src/components/Modal.tsx`
- The screens in `src/screens/`, Workspace and Output in particular

Apply these Golden Gate traits:

1. Window shell. Render the app as one macOS window: a single, consistent, slightly tighter corner radius on the outer frame, sheets, and popovers. Use the existing `--rounded-*` scale; do not add a new radius per component. Give the focused window state a stronger edge and shadow than the unfocused state (use `window` focus/blur events to toggle a class on the root).

2. Unified toolbar. Merge the TopBar into one unified toolbar row at the top of the window: title and context on the left, segmented controls and search in the middle, the Present/Blank/output controls on the right. No separate title bar plus toolbar stack. Optional decorative traffic-light dots at the far left only when the app runs in a standalone/PWA window; never show fake controls in a normal browser tab.

3. Edge-to-edge sidebar. The sidebar runs the full height of the window, flush to the window edges, under the toolbar's glass, with no floating inset card. Sidebar icons get colour again: one muted tint per section from the existing families (gold, violet, green, wash); the selected row uses a gold-tinted fill with `--amber-ink`-legible text. Keep section headers small, uppercase-free, in `--text-meta`.

4. Legible Liquid Glass. Glass is for chrome only: toolbar, sidebar, inspectors, popovers, sheets. Content (slide canvas, lyrics, Bible text, rundown rows) sits on opaque or near-opaque surfaces (`--surface-solid`, `--surface-well`). Use uniform blur and saturation across all glass layers, a hairline highlight on the top edge, and enough tint that text passes WCAG AA on any wallpaper. Add a "Glass opacity" control in Settings (Appearance) that drives a single CSS variable, and make `prefers-reduced-transparency` and the existing Reduce Transparency fallback switch glass to the opaque surfaces.

5. Controls. macOS-like sizing: 28px toolbar buttons, 24px dense icon buttons, segmented controls with a sliding selected thumb, switches as pills, inputs with a recessed `--surface-well` fill and the `--focus-ring` focus state. Press states darken slightly; no bouncy scale.

6. Three-pane operator layout. Keep sidebar / main / inspector. Panes are separated by hairlines (`--line`), not gaps between cards. Inspector panes are resizable with a slim `--rounded-hair` grip and remember width in local storage. The slide canvas stays the visual centre of gravity in Workspace and Output.

7. State colours keep their meaning. Gold = action, focus, selected navigation. Violet = selected/editing. Green = audience-visible LIVE only. Danger = destructive. Never use green or glass effects on anything that is not live.

8. Motion. Short, calm transitions (120 to 200 ms, ease-out) for sidebar selection, segmented thumbs, sheets sliding from the toolbar, and popovers. Respect `prefers-reduced-motion`.

9. Responsive. At laptop width (1280 x 800) all three panes fit. Below 1024px the inspector becomes a sheet. Below 768px the sidebar becomes `MobileNav` and the toolbar collapses overflow controls into a menu. No horizontal page scroll.

Hard constraints:
- Use only token names that exist in `:root`: `--line`/`--line-strong` (not `--border`), `--text`/`--text-2`/`--muted`/`--faint` (not `--fg`), `--amber`/`--amber-rgb`/`--amber-bright` (not `--accent`), `--rounded-xs..xl`/`--rounded-pill`/`--rounded-hair`, `--text-micro`/`--text-meta`/`--text-ui`/`--text-body`, `--surface*`. If a new token is truly needed, add it to `:root` with a comment and to `DESIGN.md`.
- Alpha syntax is `rgb(var(--x-rgb) / 0.15)`, never `rgba(var(--x-rgb), 0.15)`.
- Type floor stays 11px. Keep the serif display roles from `DESIGN.md`; UI text uses the system font stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif`).
- Do not imitate Apple branding, icons, or wallpaper artwork. Take the layout and material ideas only.
- Do not touch audience output rendering (`SlideRenderer`, output window) beyond its surrounding chrome.

Verify before finishing:
- `npm run build`, `npm run lint`, and the test suite pass. Component tests reset locale to 'en' in `beforeEach`.
- Grep the changed CSS for any `var(--...)` name not defined in `:root`.
- Check Home, Bible, Songs, Workspace, Output, and Settings in the browser at 1280x800 and 375x812, with Reduce Transparency on and off, and with keyboard-only navigation.
- Update `DESIGN.md` with the Golden Gate shell rules (toolbar, sidebar, glass usage, glass opacity control).
- Report what changed per screen and anything left unfinished.
```
