# Timer slides

A timer slide shows a full-screen countdown from 0 to 60 minutes. Common uses: "Service starts in…", a sermon or announcement time box, a break.

## Creating and editing

- **Add content → Timer.** Give it a title (optional; "Countdown" is used if empty) and a duration in minutes and seconds.
- **Duration rules.** Whole minutes and seconds, seconds 0–59, total 00:00 to 60:00. Empty fields count as 0. Negative, fractional, non-numeric, or over-60-minute entries are refused with a message under the field, and the slide keeps its last valid duration.
- **0:00 is allowed.** Starting a 0:00 timer completes it at once. This is useful for testing the completed screen.
- **The editor inspector** shows the duration fields and the Start / Pause / Resume / Reset controls for the selected timer slide.

## Controls and states

| State | Shown on the slide | Available actions |
|---|---|---|
| Ready (idle) | Full duration, "Ready" | Start |
| Running | Counting down, progress bar filling | Pause, Reset |
| Paused | Remaining time dimmed, "Paused" | Resume, Reset |
| Completed | 00:00 in amber, "Time's up" | Reset |

Actions that don't fit the current state are disabled. Reset always returns to the configured duration.

The same controls appear in the live console, under the main controls, whenever the slide on the audience screen is a timer.

## How the countdown keeps time

The countdown is stored as timestamps, not as a counter that ticks:

- Running: the time it will reach zero (`endsAt`).
- Paused: the time that was left (`remainingMs`).

Every view (editor canvas, thumbnails, live console, audience and confidence windows) computes the remaining time from the clock each time it draws. Views therefore always agree, and a slow, hidden, or busy view cannot make the timer drift. Full-size views redraw 5 times a second; thumbnails once a second. Drawing stops when the countdown reaches zero.

Output windows receive the timer state with the normal output snapshot and compute the remaining time themselves. This works because all windows share one machine clock. A future desktop shell that drives displays from a separate process must keep that property.

## Leaving and returning to a timer slide

A timer belongs to its slide, not to the screen showing it:

- **Switching to another slide** (in the editor or live) does not pause or reset the timer. It keeps counting in the background.
- **Returning to the slide** shows the true remaining time. If it ran out while you were away, it shows the completed state.
- **Ending live** does not reset timers either; reset them explicitly.

This matches how a physical countdown on stage behaves, and it lets an operator start a pre-service countdown and step away to fix another slide.

## What is saved

- **Saved with the slide** (local storage and backups): the configured duration (`slide.timer.durationSeconds`). Backups clamp it to 0–3600 seconds.
- **Not saved:** the live countdown (running, paused, or completed). It lives in session state like the live presentation itself, which also does not survive a reload. After a reload every timer returns to Ready at its configured duration.

This is the simplest behaviour consistent with the existing architecture. The live session is session-only, and restoring a half-finished countdown after a crash could show the congregation a wrong time.

Changing a timer's duration resets its countdown to the new value.

## Code map

- `src/utils/timer.ts`: validation, state transitions, formatting (pure, unit-tested).
- `src/store/useAppStore.ts`: `timers` session state and the `timerCommand(slideId, command)` action.
- `src/components/timer/`: `TimerFace` (on the slide), `TimerControls`, `TimerDurationField`, `useTimer` (clock and state hooks, `TimerSourceContext` for output windows).
- `src/store/outputState.ts`: adds the timers for slides currently on an output to the snapshot.
- Tests: `src/tests/timer.test.ts`, `src/tests/timer-ui.test.tsx`.

Styling options (font, colour, layout) can be added later as fields on `TimerConfig` and read by `TimerFace`.
