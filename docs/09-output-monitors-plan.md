# Church Presenter — Output Monitors Plan

## Goal

Let a volunteer connect a projector, TV, confidence monitor, or broadcast output and know exactly what each screen will show before going live.

## Output types

### Audience output

The main congregation/projector/TV output. It follows the live slide and opens borderless fullscreen on the selected display.

### Confidence/stage output

A private screen for worship leaders or speakers. It may show:

- Current slide.
- Next slide.
- Service timer.
- Clock.
- Speaker/operator notes.
- Song key or chord information when available.

### Additional outputs

Future outputs may include:

- Lobby display.
- Overflow room display.
- Livestream/OBS overlay.
- Stage timer or lyrics-only output.

## Monitor setup flow

1. Open Settings → Outputs or the output selector in the live screen.
2. Detect connected displays.
3. Name each display by role.
4. Assign Audience, Confidence, or Disabled.
5. Preview a test pattern or sample slide.
6. Open the audience output fullscreen.
7. Confirm output status before pressing Present.

## Required controls

- Display name and monitor name.
- Resolution and aspect ratio.
- Fullscreen/windowed mode.
- Audience/Confidence/Disabled role.
- Follow live vs manual slide selection.
- Blank output.
- Freeze output.
- Test output.
- Reconnect/retry.
- Output status: Ready, Connecting, Disconnected, Unsupported.

## Live screen behavior

- Show monitor status in the top bar and right rail.
- Keep the live audience output visually dominant.
- Make the current slide, next slide, and output destination unambiguous.
- When a monitor disconnects, keep the operator view alive and show a clear recovery message.
- Never send operator notes to the audience output.
- Keep Previous, Next, Blank, Freeze, and End Live available even if a secondary monitor fails.

## Output security rules

- Audience, Confidence, Lobby, and Broadcast outputs are separate profiles with explicit assignments.
- Never send operator notes, provider tokens, private URLs, or hidden metadata to an audience output.
- Remote content must be labeled and preflight-checked before it can go live.
- A monitor disconnect must fail closed to a safe state; it must not expose the operator workspace.
- Test patterns must contain no sensitive service content.

## Desktop implementation

During web prototyping, simulate outputs as separate windows or routes. In the Tauri desktop app:

- Enumerate displays through a native output provider.
- Create borderless windows on selected displays.
- Remember the last valid display assignment.
- Recover gracefully when display order or resolution changes.
- Prevent the audience window from showing browser chrome or operating-system UI.
- Keep output rendering isolated from editor re-renders.

## Acceptance checklist

- One display works as the audience output.
- Two displays support Audience and Confidence roles.
- The audience output opens fullscreen on the selected monitor.
- Confidence output shows current/next and notes without leaking to the audience.
- A disconnected monitor produces a clear recovery state.
- Blank and Freeze affect the intended output.
- Output assignments persist after restart.
- A test pattern confirms the selected monitor before going live.
- The live screen still operates if the confidence monitor is unavailable.
