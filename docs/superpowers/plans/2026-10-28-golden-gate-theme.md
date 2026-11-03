# macOS Golden Gate Global Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply one consistent macOS Golden Gate visual system across every Church Presenter page and shared component without changing application behavior.

**Architecture:** Keep the existing React component structure and make `src/styles.css` the primary implementation surface. Establish Golden Gate design tokens first, then tune shared primitives and screen-specific surfaces only where the shared primitives are insufficient. Use the existing reduced-transparency and responsive media-query paths instead of introducing a second theme system.

**Tech Stack:** React, TypeScript, Vite, CSS custom properties, Vitest, Vite production build, existing CUA browser validation.

**Spec:** `docs/superpowers/specs/2026-10-28-golden-gate-theme-design.md`

## Global Constraints

- Preserve existing routes, business logic, data models, slide dimensions, and user workflows.
- Do not add a UI framework or external dependency.
- Use existing CSS variables and shared classes before adding screen-specific rules.
- Keep the projected slide visual separate from the operator UI theme.
- Preserve responsive behavior, reduced-transparency behavior, and keyboard focus visibility.
- Preserve explicit green Live and red Offline/destructive semantics; do not use violet as a live-state substitute.
- Use `apply_patch` for edits and validate with `npm test` and `npm run build`.

## Review Focus

- Low-contrast text on warm dark surfaces: verify primary, secondary, muted, and disabled text remain distinguishable in shared controls and cards.
- Live/offline/warning/destructive states: verify color, icon, and text remain semantically clear and do not collapse into the decorative gold palette.
- Reduced transparency: verify all major surfaces remain legible and opaque when the setting is enabled.
- Narrow and touch layouts: verify topbar, sidebar replacement, filters, editor, modals, and live controls do not clip or overflow.
- Projected output isolation: verify operator-theme changes do not alter slide content or output-window layout rules.

---

### Task 1: Establish the Golden Gate design tokens

**Files:**
- Modify: `src/styles.css:3-88`
- Test: `src/tests/theme.test.ts` (create)

**Interfaces:**
- Produces stable CSS custom properties for color channels, surfaces, borders, shadows, radii, typography, and focus treatments that all later tasks consume.

- [ ] **Step 1: Write the failing token contract test**

  Add a test that reads `src/styles.css` and asserts the Golden Gate token names exist: `--surface-glass`, `--surface-glass-strong`, `--gold-rgb`, `--gold-bright`, `--line-gold`, `--shadow-gold`, and `--focus-ring`.

- [ ] **Step 2: Run the targeted test to verify it fails**

  Run: `npx vitest run src/tests/theme.test.ts`
  Expected: FAIL because the new token contract is not present.

- [ ] **Step 3: Implement the token layer**

  Add the Golden Gate tokens in `:root` while retaining compatibility aliases for existing `--amber`, `--violet`, `--green`, `--danger`, surface, line, shadow, and radius variables. Use a warm champagne/gold family for action/focus, espresso graphite surfaces, restrained glass translucency, and explicit green/red state channels. Keep `body.reduced-transparency` mapping the glass tokens to opaque surfaces.

- [ ] **Step 4: Run the targeted test to verify it passes**

  Run: `npx vitest run src/tests/theme.test.ts`
  Expected: PASS.

- [ ] **Step 5: Run the full suite**

  Run: `npm test`
  Expected: all existing tests plus the token contract pass.

### Task 2: Restyle shared shell, navigation, controls, forms, and overlays

**Files:**
- Modify: `src/styles.css:126-900`
- Modify: `src/components/TopBar.tsx` only if semantic grouping or accessible labels need adjustment after the CSS pass
- Test: `src/tests/theme.test.ts`

**Interfaces:**
- Consumes: Golden Gate tokens from Task 1.
- Produces: shared visual primitives used by every page: app shell, sidebar, topbar, buttons, badges, fields, modals, command palette, toasts, and focus states.

- [ ] **Step 1: Add shared primitive assertions**

  Extend the token contract test to assert the shared stylesheet contains Golden Gate rules for `.sidebar`, `.topbar`, `.panel`, `.btn-primary`, `.field input`, `.modal`, and `.command-trigger` using the new surface/border/focus tokens.

- [ ] **Step 2: Implement shell and navigation styling**

  Update the app shell, sidebar, topbar, breadcrumb/context badge, grouped action cluster, active navigation, and responsive icon rail. Use layered translucent surfaces, warm separators, restrained inner highlights, and consistent 8/12/16 spacing rhythm.

- [ ] **Step 3: Implement controls and input styling**

  Update primary, secondary, ghost, danger, live, present, icon, badge, status chip, field, select, textarea, toggle, command search, keyboard hint, and scrollbar rules. Add clear hover/focus/disabled/pressed states and preserve explicit green Live and red destructive/offline semantics.

- [ ] **Step 4: Implement overlays and feedback styling**

  Update modal backdrops, dialogs, command palette, popovers, toast notifications, warnings, errors, empty states, and confirmation surfaces so depth and borders share the same Golden Gate hierarchy.

- [ ] **Step 5: Run unit/build validation**

  Run: `npm test && npm run build`
  Expected: all tests pass and Vite produces a production build.

### Task 3: Apply Golden Gate treatment to content pages and editor surfaces

**Files:**
- Modify: `src/styles.css:1594-3548`
- Modify: `src/styles.css:4729-5055`
- Test: `src/tests/theme.test.ts`

**Interfaces:**
- Consumes: shared primitives from Task 2.
- Produces: consistent home, services, calendar, Bible, songs, media, templates, settings, workspace, inspector, toolbar, slide strip, and editor panel styling.

- [ ] **Step 1: Add screen-surface assertions**

  Extend the theme test to assert the stylesheet includes Golden Gate surface rules for `.home-hero`, `.calendar-layout`, `.songs-screen`, `.media-layout`, `.settings-layout`, `.workspace`, `.editor-toolbar`, `.inspector`, and `.slide-strip`.

- [ ] **Step 2: Restyle page-level surfaces**

  Normalize cards, panels, list rows, filter bars, section headers, tabs, search fields, empty states, and action clusters across Home, Services, Calendar, Bible, Songs, Media, Templates, and Settings. Use one panel treatment and one spacing rhythm rather than bespoke dark boxes.

- [ ] **Step 3: Restyle editor-specific surfaces**

  Apply the Golden Gate hierarchy to the rundown, workspace header, editor toolbar, canvas frame, slide thumbnails, element action rail, inspector tabs, inspector fields, layer drawer, background picker, and dialogs. Keep slide canvas content itself unchanged except for surrounding chrome.

- [ ] **Step 4: Run unit/build validation**

  Run: `npm test && npm run build`
  Expected: all tests pass and the production build succeeds.

### Task 4: Refine Live, Offline, and output-adjacent states

**Files:**
- Modify: `src/styles.css:3548-4145`
- Modify: `src/components/StatusChip.tsx` only if a semantic class or accessible label is required
- Test: `src/tests/theme.test.ts`

**Interfaces:**
- Consumes: shared tokens/primitives from Tasks 1-3.
- Produces: clearly differentiated Live, Offline, warning, frozen, disconnected, and destructive state treatments across live console and output-adjacent UI.

- [ ] **Step 1: Add state contract assertions**

  Extend the theme test to assert distinct green, red, amber, and violet state selectors exist for `.live-state`, `.status-chip`, `.status-dot-disconnected`, `.live-control-primary`, and `.live-preview-frame`.

- [ ] **Step 2: Implement state styling**

  Restyle live topbar, live preview card, next-output panel, rundown, controls, history, message strip, preflight checks, output framing, and status indicators. Green must communicate LIVE/active, red must communicate OFFLINE/disconnected/destructive, amber must communicate pending/attention, and violet must remain selection/frozen/editing only.

- [ ] **Step 3: Verify output isolation**

  Confirm output-specific selectors retain their black/projection-safe backgrounds and do not inherit operator-only glass, gold borders, or decorative UI chrome.

- [ ] **Step 4: Run unit/build validation**

  Run: `npm test && npm run build`
  Expected: all tests pass and the production build succeeds.

### Task 5: Rendered visual QA and responsive cleanup

**Files:**
- Modify: `src/styles.css` only for issues found during visual QA
- Modify: relevant component files only for issues that cannot be fixed through shared styling
- Test: no new test file; reuse `src/tests/theme.test.ts` and the existing suite

**Interfaces:**
- Consumes: completed Golden Gate theme from Tasks 1-4.
- Produces: validated desktop and narrow-viewport rendering with no clipping, overlap, unreadable text, broken focus state, or theme leakage into projected output.

- [ ] **Step 1: Start the local app and define the target flow**

  Flow under test: app loads → Services/Home renders → open a service → editor renders → open search → close search → switch to Live → inspect Live/Offline states.

- [ ] **Step 2: Capture desktop visual evidence**

  Inspect the topbar, sidebar, Services, Calendar, Songs, Workspace, Inspector, modal, and Live surfaces at the current desktop viewport. Record any mismatch in spacing, contrast, clipping, or inconsistent state treatment.

- [ ] **Step 3: Capture narrow visual evidence**

  Inspect the responsive layout at a phone-sized viewport, focusing on the topbar/search, navigation replacement, filters, editor/inspector stacking, modal actions, and Live controls.

- [ ] **Step 4: Fix visual regressions**

  Apply the smallest shared CSS fix for each issue, then rerun the affected desktop and narrow checks.

- [ ] **Step 5: Run final verification**

  Run: `npm test && npm run build`
  Expected: all tests pass, production build succeeds, the app renders without framework overlay, and no relevant console errors appear during the target flow.

- [ ] **Step 6: Review the final diff and report evidence**

  Confirm only the approved Golden Gate theme scope changed, summarize the user-visible result, list tested viewports and flows, and include the final desktop and narrow screenshots as evidence.
