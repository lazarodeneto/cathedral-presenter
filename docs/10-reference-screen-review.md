# Church Presenter — Reference Screen Review

Date: 2026-10-27
Scope: Home, Bible Library, Add Slide, Slide Editor, Workspace, and Live Service reference images.

## Overall verdict

The visual direction is compelling: premium, calm, warm, and appropriate for a church presentation tool. The strongest screens are Bible Library, Slide Editor, and Live Service because they communicate a clear task and visible hierarchy.

Before implementation, resolve the consistency and workflow gaps below. These are design/product improvements, not evidence of runtime defects; the project does not yet have a working application.

## Priority fixes

### P0 — Resolve before building

#### 1. Choose one navigation system

The references currently show three different top navigations:

- Home / Calendar / Bible / Songs / Media.
- Services / Media / Templates / Settings.
- Rundown / Media / Bible / Settings.

Use one canonical navigation everywhere:

**Home · Calendar · Bible · Songs · Media · Templates · Settings**

Inside an open service, show the service title and a clear “Back to Home” or “Back to Services” action rather than replacing the entire navigation model.

#### 2. Align the Bible references with the free-content strategy

The Add Slide reference shows ESV and CUV, while the current product plan prioritizes public-domain/open translations. Replace those examples with WEB, OEB, BSB, and a clearly labeled Portuguese import translation.

#### 3. Add a real monitor setup surface

The Home and Live Service screens show monitor status, but no screen explains how to assign displays. Add Settings → Outputs with:

- Connected display list.
- Audience/Confidence/Disabled roles.
- Test pattern.
- Fullscreen preview.
- Reconnect/retry state.
- Output naming.

#### 4. Separate selected from live state

The Slide Editor shows the selected slide with the green LIVE treatment. In the actual app, green must mean “currently on audience output” only. Use amber/violet for selected/editing and green for live.

#### 5. Make navigation and recovery explicit in Live Service

Keep Previous/Next prominent, but add:

- Recent slide history.
- A quick-jump search.
- Clear current position.
- Disabled state at the beginning/end.
- Recovery state when a monitor disconnects.

### P1 — Improve before production use

#### 6. Make bilingual Scripture selection complete

The Bible Library preview shows a secondary language, but the screen needs an explicit secondary translation selector before creating the bilingual slide. Show language, translation, and license metadata for both passages.

#### 7. Add first-run onboarding

The Home screen needs a first-run path for:

- Church name and logo.
- Default language.
- Default Bible translation.
- Importing a Bible file.
- Connecting the first display.
- Creating the first service.

#### 8. Add backup and migration access on Home

The launch screen should expose or clearly link to:

- Export backup.
- Import backup.
- Data location.
- Last backup date.
- Recovery after a failed launch.

#### 9. Clarify destructive live controls

“End Live” should require confirmation or a short undo window. Blank and Freeze should clearly indicate which output they affect. Message should preview the overlay before sending it live.

#### 10. Unify identity and branding

The references use different logo marks and sometimes “Church Presenter” while the church name is prominent. Define:

- Default product mark.
- Custom church logo rules.
- App name vs church name hierarchy.
- Fallback behavior when the logo is removed.

### P2 — Strong future improvements

#### 11. Add a dedicated confidence/stage preview reference

The Live Service screen shows Confidence as a status only. A future screen should show the actual stage layout with current slide, next slide, timer, clock, notes, and optional song key/chords.

#### 12. Add service health before going live

Show warnings for:

- Missing media.
- Missing fonts.
- Unsupported video codecs.
- Unlicensed or unverified Bible/song content.
- Text overflow.
- No audience output selected.
- Disconnected confidence monitor.

#### 13. Add import/migration entry points

For churches moving from another tool, provide import paths for approved formats such as plain text, ChordPro, OpenLyrics, OSIS, USFM, Zefania XML, images, videos, and service backups.

## Screen-by-screen findings

### Home

Strengths: clear Create Service action, useful Duplicate Last Service action, Bible Library prominence, and monitor readiness.

Improve: add first-run onboarding, backup/recovery, data location, and a clearer distinction between upcoming events and recent services.

### Bible Library

Strengths: strongest information architecture; offline status, translation list, passage preview, license/source, recent passages, and bilingual preview are all valuable.

Improve: add an explicit secondary translation selector, import translation flow, keyword/reference search mode, verse-count/slide-count preview, and overflow warning for long passages.

### Add Slide

Strengths: clear content types, recent items, templates, preview, and Add to Service action.

Improve: align the visual style with the Golden Gate system, replace ESV/CUV demo content with open/free examples, and make the destination section explicit before insertion.

### Slide Editor

Strengths: excellent canvas focus, safe areas, layers, element selection, toolbar, inspector, and autosave.

Improve: distinguish selected vs live state, add a clear canvas zoom/pan model, show media status, add keyboard shortcut hints, and keep advanced inspector controls collapsible.

### Workspace

Strengths: clear rundown, current/next preview, and monitor rail.

Improve: align it with the newer glassmorphism and Golden Gate treatment, add persistent Previous/Next, and make the live state more explicit.

### Live Service

Strengths: best operator screen; current output is dominant, LIVE is unmistakable, and controls are easy to locate.

Improve: add monitor assignment details, recent history interaction, quick-jump, confirmation for End Live, output-specific blank/freeze states, and a real confidence preview.

## Accessibility and readability review

- Glass blur must have a reduced-transparency mode.
- Warm ivory text must remain readable over the warm background glow.
- Green LIVE must always be paired with text/icon status.
- Amber primary buttons need sufficient contrast with black text.
- Small metadata in cards should not be the only place where important state appears.
- Every icon-only control needs a tooltip and accessible label.
- Keyboard navigation should match the visible hierarchy.
- Reduced motion should disable glow pulses and large transitions.

## Final implementation recommendation

Implement the screens in this order:

1. Home.
2. Bible Library.
3. Add Slide with Bible insertion.
4. Slide Editor.
5. Workspace.
6. Live Service.
7. Outputs/Monitor Settings.
8. First-run onboarding and backup/recovery.

Do not add more visual surfaces until these screens share one navigation, one branding system, one output model, and one free/open Bible content strategy.
