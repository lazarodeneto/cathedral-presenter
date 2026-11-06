# Keyboard shortcuts

Settings → **Shortcuts** lists every shortcut by category (Presenting, Timer, Editing, Navigation). Each row shows the action, what it does, where it works, its current keys, and its status: **Default**, **Custom**, **Off**, or **Fixed**.

## Default shortcuts

| Action | Default | Works in |
|---|---|---|
| Next slide | → or Space | Presentation |
| Previous slide | ← | Presentation |
| First / last slide | Home / End | Presentation |
| Blank screen | B | Presentation |
| Freeze screen | F | Presentation |
| Show or hide message | M | Presentation |
| Jump to slide | J | Presentation |
| Exit presentation | Esc (asks first) | Presentation |
| Start presentation | ⌘↵ / Ctrl+Enter (opens the pre-flight check) | Editor |
| Start / pause / reset timer | T / Shift+T / Alt+T | Editor and Presentation (timer slides only) |
| Save | ⌘S / Ctrl+S | Everywhere |
| Undo / Redo | ⌘Z / Ctrl+Z, ⇧⌘Z / Ctrl+Shift+Z (fixed) | Editor |
| Search | ⌘K / Ctrl+K | Everywhere |
| Open Song Library | ⌥S / Alt+S | Everywhere |
| Toggle fullscreen | Shift+F | Everywhere, including output windows |

"⌘" on macOS and "Ctrl" on Windows/Linux are stored as one "Mod" key, so a saved shortcut works on every platform. Letters follow the active keyboard layout. When a modifier changes the typed character (⌥S → ß, Shift+1 → !), the physical key is used instead.

The old static list showed "P" for Present; it was never wired up. Present now defaults to ⌘↵ / Ctrl+Enter so a stray key press can't start a service.

## Changing a shortcut

- **Change** starts recording ("Press keys…"). Press the new combination. **Esc** or the same button cancels; **Tab** leaves recording so keyboard users can move on.
- **Turn off** removes the shortcut. **Reset** restores its default. **Reset all** (confirmed) restores every default.
- Each change saves immediately and shows a confirmation message.
- Refused, with a message: keys the browser or operating system handles (⌘W, ⌘Q, ⌘T, ⌘R, Alt+F4, Tab, F5, F11, F12 and similar) and keys needed for editing text (⌘C/V/X/A/F, Backspace, Delete, Enter).
- Undo and Redo are **fixed** to each platform's standard keys.

## Conflicts and priority

- A key can belong to two actions only if they are never active at the same time. Editor and Presentation never overlap, so they may share keys. A key used by an "Everywhere" action can't be reused by any other action.
- When a new key is already taken, the conflicting action is named. **Use it for …** moves the key over (the other action loses only that key); **Keep current** leaves both unchanged. Fixed shortcuts can't be taken over.
- Reset is refused if the default key now belongs to another action; the message names it.
- If one key ever matches several active actions, the specific context (Presentation, Editor) wins over Everywhere, and the most recently opened screen wins among equals.

## Where shortcuts don't fire

- While typing in a text field, select, or editable text: only Save and Search fire there, because they use ⌘/Ctrl.
- Inside dialogs: the dialog owns its keys, and Esc closes it.
- On a focused button: Space and Enter press the button instead.
- Keys an element already handled (for example arrow keys nudging a selected element on the canvas).
- When **Enable keyboard shortcuts** is off.

## Output windows

When an audience or confidence window has focus, presentation keys are sent to the operator window and run there, as if pressed in the live console. Fullscreen applies to that output window.

## Saving

- Custom shortcuts are saved in the app settings on this computer (like the other settings) and included in backups. Sign-out revokes the account session; shared installation presentation content remains available for offline preparation.
- Only differences from the defaults are stored, so new or changed defaults in later versions still reach you, and valid custom shortcuts are kept across updates.
- Saved data is checked on load. Unknown actions, invalid or reserved keys, and entries that would clash fall back to the defaults.

## Undo history

Undo and Redo cover changes to services (rundown, slides, elements). Edits within 0.7 s of each other count as one step (typing, dragging). History holds 60 steps and is cleared on reload.

## Code map

- `src/shortcuts/actions.ts`: the action list, contexts and defaults.
- `src/shortcuts/keys.ts`: reading key events, formatting, reserved keys.
- `src/shortcuts/bindings.ts`: conflicts, assign, disable, reset, repairing saved data.
- `src/shortcuts/registry.ts`: the single window listener, context rules, and `useShortcutHandlers`.
- `src/store/history.ts`: undo/redo.
- `src/components/settings/ShortcutSettings.tsx`: the settings screen.
- Tests: `src/tests/shortcuts.test.tsx`.
