# Calendar Weekday Highlight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let the administrator choose one weekday in the calendar sidebar and softly highlight every matching date.

**Architecture:** Extend the existing persisted `AppSettings` with a nullable JavaScript weekday index. The calendar reads and updates that setting, renders a translated dropdown in the right sidebar, and applies a class to matching cells. Existing selected/today states remain higher priority in CSS.

**Tech Stack:** React 19, TypeScript, Zustand persistence, Vitest, existing CSS and i18n dictionaries.

**Spec:** `docs/superpowers/specs/2026-10-28-calendar-weekday-highlight-design.md`

## Global Constraints

- Preserve local-first persistence through the existing Zustand workspace store.
- Support all existing locales through the dictionary system.
- Highlight exactly one weekday or none.
- Keep the current date and selected date visuals readable over the weekday background.

## Review Focus

- Old persisted settings without the new field must default to no highlight.
- The dropdown must support clearing the choice.
- Sunday-to-Saturday indices must match the calendar's Sunday-first columns.
- Selected and today cells must remain visually distinct.
- Changing the setting must update the calendar immediately and persist through reload.

### Task 1: Persist the weekday preference

**Files:**
- Modify: `src/types.ts` (`AppSettings`)
- Modify: `src/store/useAppStore.ts` (`DEFAULT_SETTINGS` and persisted settings merge)
- Test: `src/tests/calendar-weekday.test.ts`

- [ ] Write a failing test asserting the default setting is `null` and an existing state merge without the field keeps it unset.
- [ ] Run the focused test and verify it fails because the setting does not exist.
- [ ] Add `highlightWeekday: number | null` to `AppSettings`, default it to `null`, and preserve it through the existing settings merge.
- [ ] Run the focused test and verify it passes.

### Task 2: Add translated weekday labels and sidebar control

**Files:**
- Modify: `src/i18n/dictionary.ts`
- Modify: `src/screens/CalendarScreen.tsx`
- Modify: `src/styles.css`

- [ ] Add translated strings for the control label, no-highlight option, and Sunday through Saturday in every supported locale.
- [ ] Render a right-sidebar panel with a labeled `<select>` bound to `settings.highlightWeekday`, using `null` for the no-highlight option and numeric values `0` through `6` for weekdays.
- [ ] Update the store immediately on selection change.
- [ ] Add compact styling consistent with the existing sidebar panels.

### Task 3: Apply and verify the calendar highlight

**Files:**
- Modify: `src/screens/CalendarScreen.tsx`
- Modify: `src/styles.css`
- Test: `src/tests/calendar-weekday.test.ts`

- [ ] Add a failing test for weekday matching using Sunday-first indices.
- [ ] Run it and verify the failure is caused by missing weekday matching behavior.
- [ ] Add the matching class to calendar cells and style it with a soft translucent background; keep `.is-selected` and `.is-today` visually dominant.
- [ ] Run focused tests, the full test suite, and typecheck.
- [ ] Verify in the browser that changing the dropdown highlights only the selected weekday and that clearing it removes the highlight.
