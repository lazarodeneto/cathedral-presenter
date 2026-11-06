# Impeccable technical audit — 6 November 2026

## Implementation integrity verdict

**Fail for release readiness; coherent product identity is present.** Cathedral branding, local-first wording, dark tokens and restrained form structure fit the product. The login surface nevertheless promotes a nonfunctional action, omits several supported translations, and fails short-screen access. These are implementation findings, not a request to redesign the visual identity.

Scope: rendered login at localhost, with repository-wide source detector and recent build/test evidence. This is not a rendered audit of every editor, library, dialog or output state. Scores below apply primarily to the login surface and are provisional where noted.

## Audit health score

| Dimension | Score | Key finding |
|---|---:|---|
| Accessibility | 2/4 | Input boundary contrast falls below 3:1 |
| Performance | 3/4 | Transform-based motion; large shared translation bundle |
| Theming | 2/4 | Login CTA bypasses primary-action theme semantics |
| Responsive design | 2/4 | Short mobile screen hides the offline entry action |
| Implementation integrity | 2/4 | Active sign-in cannot complete; missing translations |
| **Total** | **11/20** | **Acceptable — significant work needed** |

Seven grouped issues: P0 0; P1 3; P2 3; P3 1. No application fixes were applied.

## Verification

- Read PRODUCT.md and DESIGN.md; ran the Impeccable context loader and audit playbook.
- Ran source detector over src/: 255 advisory occurrences (191 color, 55 font-size, 9 radius), no primary findings. These are leads, not 255 confirmed defects.
- Ran rendered detectors at 1280 × 800 and 390 × 844: four findings each, including one advisory. Reviewed against the requested moving-light effect and product context.
- Inspected Chromium screenshots at desktop/mobile sizes and measured DOM bounds at 1280 × 800, 390 × 844 and 320 × 568. These are emulated viewports, not physical-device tests. Touch gestures, iOS keyboard behavior and pinch zoom were not exercised.
- Measured all login controls: fields and entry buttons 48px high; password toggle 44 × 44px. Keyboard-focused email input has a visible 2px outline and 4px shadow.
- Read reduced-motion CSS: entrance effects are removed, ambient beams are hidden, and button transforms/transitions are suppressed. OS preference switching was not exercised at runtime.
- Used preceding build evidence: i18n JavaScript chunk approximately 810 kB raw / 280 kB gzip; main CSS approximately 332 kB raw / 57 kB gzip. No frame-rate or network timing benchmark was performed.

## Detailed findings

### [P1] Offline entry is below the viewport on short screens

Location: src/styles.css:159–161 (body overflow:hidden), :20160 onward (login layout); src/screens/LoginScreen.tsx:37.

Category: Responsive / Accessibility.

Evidence: at 320 × 568, document content is 926px tall; the offline button spans y=838–886. The body disables scrolling and neither login column establishes a scroll container. At 390 × 844 the button fits narrowly, leaving almost no room for browser chrome or an on-screen keyboard.

Impact: pointer/touch users on small screens cannot normally reach the only currently working entry action. Keyboard focus may move content, but that is not an adequate mobile route. Reflow requirement is relevant; a formal zoom compliance test was not run.

Recommendation: give login a bounded viewport scroll container or enable route-specific page scrolling; prioritize the form on short screens. Verify at 320px width and with the software keyboard open.

Suggested command: `/impeccable adapt`.

### [P1] Input outlines have insufficient non-text contrast

Location: src/styles.css:20175.

Category: Accessibility. Standard: WCAG 1.4.11, non-text contrast.

Evidence: computed border is rgba(255,255,255,.18), recessed fill is rgba(0,0,0,.2), on #0b0b0c. Compositing gives an approximately #363637 border against #09090a fill, about 1.65:1, below 3:1. Empty fields rely on this outline to identify their boundaries. Focus state is clearly visible and is not the issue.

Impact: low-vision users may struggle to locate fields before focusing them, especially in a dim booth.

Recommendation: use a stronger semantic field-boundary token that reaches 3:1 against adjacent surfaces; test unfocused, hover and focused states.

Suggested command: `/impeccable harden`.

### [P1] The filled primary action cannot complete sign-in

Location: src/screens/LoginScreen.tsx:13–16, :29–37.

Category: Implementation integrity.

Evidence: submission only sets a message; no authentication request or session is created. The introductory note discloses this, but the email/password fields remain enabled and the most prominent action still says Sign in.

Impact: users may type real credentials into an unavailable flow, then have to choose the visually secondary offline action. This is a task-completion failure for the advertised action, not evidence of credential transmission.

Recommendation: until a real account service exists, make local entry primary and show account availability as an explicit disabled/setup state. Do not imply account protection.

Suggested command: `/impeccable clarify`, then `/impeccable harden`.

### [P2] Four supported locales receive English login sentences

Location: src/i18n/dictionary.ts:3420–3450.

Category: Implementation integrity / localization.

Evidence: authEnglish is copied to all dictionaries and overrides are supplied only for pt and pt-BR. Spanish, French, German and Italian therefore display English login text. Existing i18n test fails for untranslated sentences.

Impact: the new entry screen breaks the app's supported-language promise. Portuguese is visually verified; other locale behavior is confirmed from dictionary construction.

Recommendation: supply full translations for all seven locales and rerun the i18n test.

Suggested command: `/impeccable harden`.

### [P2] Login primary action bypasses theme action semantics

Location: src/styles.css:20180; src/utils/branding.ts:168–175, :201–204.

Category: Theming.

Evidence: `.login-submit` uses the editable accent/violet fill and literal #111018 text. The design specifies the brand primary as the action voice and violet as selection. Branding validation checks primary button ink contrast, while accent validation only guarantees 3:1 against the page background; it does not guarantee the login button's fixed dark label contrast. Default colors are readable; a failing custom theme was not synthesized.

Impact: the login CTA can drift from the rest of the app and custom accents may produce unreadable labels.

Recommendation: reuse the primary button fill/ink tokens and existing component styles; retain the requested ambient lighting independently.

Suggested command: `/impeccable harden`.

### [P2] Login loads shared application resources before entering the workspace

Location: src/App.tsx (eager LoginScreen/store imports), src/i18n/dictionary.ts (all locales), src/styles.css (shared stylesheet).

Category: Performance.

Evidence: the prior production build reports about 810 kB of shared i18n JS and 332 kB CSS. Login mounts within App, which imports the application store and shared dictionaries. Existing screens are lazy-loaded, which is positive.

Impact: first entry loads more application code than a small account/offline entry screen needs, particularly over a slow connection. This is a bundle opportunity, not a measured slow-load or dropped-frame claim.

Recommendation: inspect the production waterfall before deciding whether to split translations by locale and defer workspace initialization. Keep local-first startup reliable and avoid unnecessary architectural changes for a locally installed deployment.

Suggested command: `/impeccable optimize`.

### [P3] Portuguese headline ends with a short isolated line

Location: src/styles.css:20166; src/screens/LoginScreen.tsx:22.

Category: Responsive / typography.

Evidence: rendered detector reports a last line approximately 25% of the previous line; desktop screenshot confirms “culto.” alone. No text is clipped.

Impact: minor visual imbalance; does not block comprehension.

Recommendation: test text-wrap:balance across supported languages without changing the factual copy.

Suggested command: `/impeccable polish`.

## Detector interpretation and false positives

- Uppercase Campus Algarve eyebrow: identifies the actual church campus and is meaningful branding. Do not count the detector's generic hero-pattern warning as a functional defect.
- Radial lighting: explicitly requested by the user and supported by the existing ambient-light design system. Not counted as a defect solely for matching a stylistic pattern.
- Green body glow: detector reports a zero-offset #65c98a glow, but computed body box-shadow in the inspected state is none. Not independently reproduced; excluded from verified findings.
- Small cqw text: several source findings are slide-preview text. DESIGN.md exempts projected/canvas text from the operator type ramp, so these cannot be treated as operator readability failures automatically.
- Radius drift: literal 10px is outside the YAML scale but is described elsewhere in DESIGN.md's shape prose. The documentation is internally inconsistent; do not mechanically replace every reported radius.
- Existing raw color values warrant contextual review, but 191 literal-color advisories are not 191 accessibility failures.

## Systemic patterns

The new login duplicates button styling instead of consuming the existing component rules, and introduces fallback translations without completing localized content. Root layout assumptions designed for the fixed operator console leaked into a standalone page. Shared global resources make tiny screens inherit workspace startup costs. Address these boundaries rather than adding isolated CSS overrides repeatedly.

## Positive findings

- Visible labels, correct email/password autocomplete, native form controls and a named password visibility toggle.
- All measured controls meet the project's 44px touch-target goal.
- Decorative lighting is hidden from assistive technology and cannot intercept pointer events.
- Motion uses transform/opacity; no casual width/height animation was added.
- Reduced-motion alternatives preserve readable final content; particles are absent as requested.
- No horizontal overflow at the tested widths; desktop split layout and mobile stacking render coherently.
- Cathedral logo/campus identity, offline wording and existing theme tokens remain present.

## Recommended actions

1. **[P1] `/impeccable adapt`** — restore short-screen scrolling and verify offline entry with the software keyboard open.
2. **[P1] `/impeccable harden`** — fix field boundaries, complete translations and use theme-safe primary button tokens.
3. **[P1] `/impeccable clarify`** — align the active primary action with the working offline flow until account authentication is connected.
4. **[P2] `/impeccable optimize`** — measure production startup and split shared payloads only where it helps.
5. **[P3] `/impeccable polish`** — balance translated headings after functional corrections.

You can ask me to run these one at a time, all at once, or in any order you prefer. Re-run `/impeccable audit` after fixes to see your score improve.

## Remediation — 6 November 2026

All seven grouped login findings have been addressed:

- Login owns a viewport-height scroll container. Chromium at 320 × 568 confirms clientHeight 568, scrollHeight 733 and working scrollTop; the primary entry link is reachable.
- Removed inactive credential fields, eliminating their low-contrast boundaries and unnecessary password entry.
- Offline entry is the primary action. Account sign-in is disabled with an explanatory description until a backend exists.
- All seven locales now have dedicated entry translations; translation tests pass.
- Primary entry uses the existing primary gradient and computed ink tokens. Removed obsolete field CSS and moved the campus identity into the brand block.
- Introduced a lightweight Entry boundary and lazy-loaded workspace. Removed the forced i18n chunk grouping, which otherwise pulled shared dependencies into the entry. Production entry JS is about 41.5 kB raw / 26.7 kB gzip; it imports runtime/vendor only and defers the workspace/dictionaries. Shared application CSS remains; further splitting is not required for this finding.
- Headline uses text-wrap:balance. Requested beams and ambient lighting remain, without particles and with reduced-motion handling.

Verification: production build passed; full existing suite 947/947 passed; follow-up targeted suite including three new entry/navigation regression tests 60/60 passed; ESLint passed on changed TypeScript files. Desktop and mobile screenshots inspected; offline navigation verified in Chromium. Physical-device/software-keyboard interaction remains untested. Original scores describe the pre-fix state, not a new WCAG certification.
