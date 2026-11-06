# Physical display outputs

Run `npm run desktop` from the project directory. This opens Cathedral Presenter in an Electron desktop window and starts the local server if it is not already running. Node and the project's dependencies must be installed. This is the development desktop app, not a signed installer.

In **Settings → Outputs**, the desktop app:

- Identifies the operating system from the native runtime: macOS or Windows.
- Enumerates the displays reported by the operating system, including TV/projector names, render resolution, scale and bounds.
- Reserves the operator's current display. Overlapping/mirrored logical displays are also reserved, so an output cannot cover the operator screen.
- Lets each remaining screen receive Audience, Confidence or Broadcast, or remain unassigned.
- Opens a separate borderless fullscreen window on every assigned display. Several TVs can share Audience, while others receive Confidence or Broadcast. There is no artificial four-display limit.
- Lets the operator test or close one output independently, or open all assigned outputs.
- Keeps assignments across desktop restarts. Outputs do not reopen automatically when a display reconnects.
- Closes an output if its display disappears, instead of leaving the OS to move it to the operator screen. Other connected outputs remain open.

With five independently detected displays, one can host the operator and four can host output windows. The computer/GPU/dock must support that number of extended displays. An HDMI splitter or OS mirror mode may expose several TVs as one logical screen; software cannot address them independently in that configuration.

## Content routing

Audience outputs receive the current audience slide. Confidence outputs include current/next and operator notes. Broadcast outputs mirror the audience feed in the broadcast format. A test pattern is scoped to the selected physical display rather than every screen sharing its role. Separate output windows do not mean separate service timelines: different slides on every TV, edge blending, genlock, audio-device routing, NDI and SDI are not implemented here.

The ordinary browser keeps preview windows and labels them as previews. It does not claim to enumerate native displays. The desktop app and an ordinary browser use separate browser profiles; export/import a workspace backup to move services between them. The account backend is shared, but local presentation data is not automatically synchronized between profiles.

## Native boundary

Renderer windows have Node integration disabled, context isolation and process isolation enabled, and share an application-specific persistent browser partition. Native display IPC is restricted to the operator window's main application document. Remote pages cannot replace that document and arbitrary popup windows are denied. Display assignments are saved under the OS application-data folder for Cathedral Presenter.

The local HTTP/auth service runs in the host Node runtime, avoiding Electron/native-module ABI mismatches with SQLite. macOS uses simple fullscreen windows on display bounds; Windows uses native fullscreen windows. Display coordinates are OS logical coordinates, including negative origins; windows render with the display's scale factor.

## Validation

- Launched the desktop app on macOS and verified Settings → Outputs reports macOS and the actual HP 527sh display at 1920 × 1080, reserved for the operator.
- Automated tests simulate five OS displays, open four independently assigned outputs, preserve multiple Audience assignments, isolate test patterns and verify unplugging one output closes only that window.
- Automated platform detection tests cover Windows and macOS.
- The Windows native UI and a physical four-output installation have not been tested on hardware. Before a live service, verify the exact GPU/dock/display arrangement, fullscreen placement, reconnect handling and video playback on that machine.
