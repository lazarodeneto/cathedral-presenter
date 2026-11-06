# Physical display outputs

Run `npm run desktop` from the project directory. This opens Cathedral Presenter in an Electron desktop window and starts the local server if it is not already running. Node and the project's dependencies must be installed. This command runs the development desktop app. Packaged builds include their own local backend; see [operations](OPERATIONS.md) for build and release gates.

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

Audience outputs follow the live slide or pin an independent slide selected in Settings. Profiles support full slide, text-only, lower-third and safe margins. Confidence outputs include current/next, private messages and countdowns, with lyrics/speaker layouts. Broadcast has its own profile and format. A test pattern is scoped to one physical display. Independent screens do not provide separate service timelines. Edge blending, genlock, arbitrary audio-device routing, NDI and SDI are not implemented.

Chrome, Safari, Firefox, Opera and other browsers can control the local desktop display engine through a loopback-only relay. Keep `npm run desktop` running on the presentation computer. Settings → Outputs also discovers the native companion from the browser, lists the real OS displays and allows role assignment. Browsers do not need their own display-enumeration permission or browser-specific Window Management API. The native engine creates the fullscreen windows on macOS or Windows.

Present refreshes the physical connections first. A single unassigned external display becomes Audience automatically; multiple unassigned displays require choosing their roles. A Confidence/Broadcast assignment is never silently replaced. Output windows request the current snapshot as they start, then acknowledge the slide they render. Bible Mode's green indicator requires a recent acknowledgement for the exact verse. Stale snapshots and duplicate relayed keyboard commands are ignored. Changing between Service and Bible Mode immediately sends a black frame until a slide or verse is explicitly presented.

The browser which last explicitly pressed Present controls the installation's outputs; an idle desktop operator cannot overwrite that browser's verse with its own welcome screen. Native TV windows share one relay connection through the desktop operator, so additional TVs do not exhaust the browser's per-origin HTTP connection limit. Native rendering disables background throttling. Discovery also polls for hot-plug changes and refreshes on focus. Reconnecting AirPlay can produce a new OS display identifier; Present detects current displays rather than relying only on saved IDs.

Workspace editing data, revision history and media are shared through the installation backend. Browser navigation and display assignments remain local. Conflict protection prevents silent overwrites; changes from other operators are not applied during live presentation. This does not synchronize services between computers.

## Native boundary

Renderer windows have Node integration disabled, context isolation and process isolation enabled, and share an application-specific persistent browser partition. Native display IPC is restricted to the operator window's main application document. Remote pages cannot replace that document and arbitrary popup windows are denied. Display assignments are saved under the OS application-data folder for Cathedral Presenter.

Development runs the HTTP/auth service in host Node. Packaged builds run a bundled backend in Electron with SQLite rebuilt for its runtime in isolated packaging staging. macOS uses simple fullscreen windows on display bounds; Windows uses native fullscreen windows. Display coordinates are OS logical coordinates, including negative origins; windows render with the display's scale factor.

## Validation

- Launched the desktop app on macOS and verified Settings → Outputs reports macOS and the actual HP 527sh display at 1920 × 1080, reserved for the operator.
- Automated tests simulate five OS displays, open four independently assigned outputs, preserve multiple Audience assignments, isolate test patterns and verify unplugging one output closes only that window.
- Automated platform detection tests cover Windows and macOS.
- The Windows native UI and a physical four-output installation have not been tested on hardware. Before a live service, verify the exact GPU/dock/display arrangement, fullscreen placement, reconnect handling and video playback on that machine.

An unsigned standalone macOS arm64 package was launched with renderer and database ready. A Windows cross-build was blocked by native SQLite; the subsequent native Windows x64 runner passed tests, packaging and clean-profile startup. [Validation](https://github.com/lazarodeneto/church-presenter/actions/runs/42294726910). Current Samsung retesting is pending OS-level reconnection. These are not signed release or four-output acceptance results.
