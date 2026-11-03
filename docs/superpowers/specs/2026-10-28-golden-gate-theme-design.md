# macOS Golden Gate Global Theme

## Intent

Give the entire Church Presenter application one coherent macOS Golden Gate visual language: warm graphite surfaces, soft gold accents, translucent desktop-like layers, quiet separators, refined typography, and clear interactive states. The redesign should make every page feel like part of the same focused operator workspace rather than a collection of independently styled screens.

## Goals

- Apply the Golden Gate visual language globally across navigation, top bars, sidebars, cards, forms, modals, tables, filters, editor surfaces, live controls, and empty/error states.
- Preserve the current information architecture, routes, business logic, data model, and user workflows.
- Make hierarchy, focus, hover, selected, disabled, online/offline, live, warning, and destructive states visually consistent.
- Improve spacing rhythm, border treatment, depth, and contrast without making the interface visually noisy.
- Keep the existing responsive behavior and ensure the theme remains usable on narrow screens.

## Non-goals

- No route or feature redesign.
- No changes to slide content, slide dimensions, service data, song data, or date behavior.
- No new external UI framework or dependency.
- No replacement of the application’s existing icon set.
- No visual changes to presentation output that would alter the actual projected slide design; the Golden Gate theme applies to the operator UI around it.

## Anti-goals

- Do not turn the interface into a literal Apple clone or reproduce proprietary macOS artwork.
- Do not use excessive gradients, glass blur, glow, or gold accents that reduce readability.
- Do not hide labels or controls behind decorative chrome.
- Do not use color alone for live/offline, warning, or destructive states.

## Chosen approach

The approved approach is a global theme-system update. The existing shared CSS variables and component classes are the source of truth, so the implementation will first establish Golden Gate tokens, then tune shared primitives, then make focused component-level corrections only where the global tokens cannot express the intended hierarchy.

Golden Gate direction:

- Base: near-black espresso graphite with warm neutral surfaces.
- Accent: muted champagne/amber for focus, selection, primary action, and active navigation.
- Success/live: clear green with a restrained glow and text/icon reinforcement.
- Offline/attention: clear red or amber depending on severity, always paired with text/icon.
- Borders: thin warm-gray separators with stronger amber focus rings.
- Depth: layered panels, restrained inner highlights, soft shadows, and limited backdrop blur.
- Shape: compact rounded rectangles for controls, larger radii for panels, circular status/avatar elements.
- Typography: preserve the current font families, strengthen display/body hierarchy, and reduce low-contrast microcopy.

## Alternatives considered

1. Redesign every page independently. Rejected because it would duplicate styling decisions and create drift between surfaces.
2. Golden Gate theme plus only the main editor components. Rejected because the user asked for the visual language to apply to the whole application.
3. Global theme-system update. Chosen because it gives the broadest consistency with the smallest functional risk and preserves the current component structure.

## Constraints

- Use the existing React and CSS architecture.
- Prefer existing CSS variables and shared classes over one-off inline styles.
- Use `apply_patch` for source changes.
- Verify with the existing test suite and production build.
- Perform rendered validation on the main workspace and at least one narrow viewport.

## Expected touch points

- `src/styles.css`: global tokens, shared controls, panels, navigation, form fields, modals, status states, responsive adjustments.
- `src/components/TopBar.tsx` and shared navigation components: only if hierarchy or semantic grouping needs adjustment after token work.
- Shared status/badge/button/modal components: align states and contrast with the new theme.
- Workspace, services, calendar, songs, Bible, media, settings, live, and output screens: only targeted class or layout fixes where global primitives are insufficient.
- Existing UI tests and new visual/state assertions where a behavior is made more explicit.

## Definition of done

- Every primary app surface uses the same Golden Gate tokens and interaction states.
- No page retains a visibly unrelated dark-theme treatment.
- Main desktop and narrow viewport checks show no clipping, unreadable text, broken contrast, or overflow introduced by the theme.
- Existing tests pass, the production build succeeds, and the rendered app has no relevant console errors.
