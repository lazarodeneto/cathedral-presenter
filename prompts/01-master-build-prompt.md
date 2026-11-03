# Master prompt for an AI app builder

Copy this prompt into the builder you choose:

```text
Build a polished local-first web app called Church Presenter for evangelical church presentations.

The long-term product is installable desktop software for macOS and Windows. Build the frontend so it can be packaged in Tauri or Electron later, and keep the core presentation workflow offline-capable. Do not make login, cloud storage, or a backend required for first launch.

The app is an operator workspace, not a marketing landing page. The main screen should feel like professional presentation software: a dark three-pane desktop layout with a service rundown on the left, a 16:9 slide editor in the center, and an inspector/operator rail on the right.

Use these visual references from the project:
- `assets/reference/church-presenter-first-screen.png` for the Home/launch screen.
- `assets/reference/church-presenter-bible-library.png` for the Bible Library screen.
- `assets/reference/church-presenter-live-service.png` for the live operator screen.
- `assets/reference/church-presenter-workspace.png` for the editor workspace.
- `assets/reference/church-presenter-add-slide.png` for the Add Slide flow.
- `assets/reference/church-presenter-slide-editor.png` for the focused individual canvas editor.

Treat the first three images as coordinated screens in one application, not unrelated mockups. Preserve their shared macOS-inspired glassmorphism, Golden Gate amber/copper accents, warm ivory typography, graphite surfaces, restrained violet selection, and luminous green LIVE status.

Before coding, read `docs/10-reference-screen-review.md` and apply its P0 fixes. Use one canonical navigation model, keep green exclusively for the live audience state, use free/open Bible examples, and implement a real Outputs/Monitor Settings surface rather than only status badges.

Security requirements are mandatory:
- Treat all imported files, URLs, provider responses, templates, QR payloads, and media as untrusted.
- Never render arbitrary HTML or executable SVG; sanitize or reject unsafe content.
- Do not expose arbitrary filesystem access, shell commands, or native IPC from the webview.
- Validate paths, URL schemes, redirects, file sizes, media types, and Windows UNC paths.
- Keep OAuth tokens out of frontend bundles, logs, exports, and IndexedDB; use the OS credential store in the desktop shell.
- Keep audience, confidence, and operator outputs isolated.
- Do not ship unsigned installers or updates.
- Add security-focused tests before claiming the desktop MVP is ready.

Before coding, read `docs/10-reference-screen-review.md` and apply its P0 fixes. Use one canonical navigation model, keep green exclusively for the live audience state, use free/open Bible examples, and implement a real Outputs/Monitor Settings surface rather than only status badges.

Core workflow:
1. Open a seeded Sunday service.
2. Browse upcoming and past services through a calendar view.
3. Duplicate an existing service in one action and edit the copy independently.
4. Browse sections such as Welcome, Worship, Message, and Response.
5. Search integrated Bible and song libraries, preview content, and add it to the service.
6. Select a song, Bible passage, announcement, sermon slide, or blank slide.
7. Edit the selected slide.
8. Preview current and next slides.
9. Start presentation mode.
10. Advance, return to previous slides, blank output, and show a message popup.

Use React + TypeScript + Vite unless the project already has a different framework. Use local mock data and local persistence; do not require a backend for the first version. Build realistic sample content, not lorem ipsum. Keep visible text in a translation dictionary and include locale options for en, pt, pt-BR, es, fr, de, and it.

Desktop requirements:
- Keep the UI compatible with a future Tauri or Electron wrapper.
- Store services, church branding, settings, and local media references locally.
- Core service editing and presentation must work without internet access.
- Treat online Bible providers, calendar sync, YouTube embeds, and cloud backup as optional network-dependent integrations.
- Keep an OutputProvider boundary so the desktop version can open a borderless fullscreen audience window on a selected monitor.
- Treat outputs as first-class: Audience output, Confidence/Stage output, and future broadcast/OBS output. Show monitor role, status, test output, fullscreen assignment, blank, freeze, and reconnect behavior.

Required content behavior:
- Prioritize the Bible library before songs or real external integrations. Implement a local offline Bible provider with bundled open/public-domain translations, reference search, keyword search, passage preview, one-verse-per-slide and multi-verse formats, bilingual passage creation, and license/attribution metadata.
- Services must be easy to duplicate from both the calendar and service workspace.
- Calendar must support at least month/list browsing, service search, and opening a service by date.
- Bible and song libraries must be integrated into the add-content flow, using local mock providers with clear adapter boundaries for real integrations later.
- Scripture slides must support two translations/languages on one slide. Render the primary passage at the top in bold and a larger font; render the secondary translation below in normal weight and a smaller font. Keep both references visible.
- Live presentation must keep Previous and Next controls visible and easy to reach. Preserve recent slide history so the operator can move backward through already-shown slides and then resume forward navigation. Add keyboard shortcuts for both directions and show the current slide position.
- Add Settings → Church identity where the user can change the church name and upload/replace/remove the logo. Reflect the saved name and logo in the top-left app header and any appropriate output identity surfaces. Persist this locally and fall back to the default Church Presenter identity when empty.
- Clearly mark the slide currently shown to the audience with a bright green border and subtle green glow across the rundown, active thumbnail, editor canvas, and Current Output preview. Add a visible “LIVE” label or status marker so the state is not communicated by color alone.
- The editor canvas must include the main media tools: upload local images and videos, add URL media, add YouTube links using an official embed or authorized import flow, and generate QR codes from URL/text/event data. Do not implement or imply unauthorized YouTube downloading; label provider behavior clearly and respect platform terms and content rights.
- Support slide elements for text, images, video, embeds, shapes, backgrounds, and QR codes. Include basic layer ordering, resize, crop, alignment, opacity, visibility, and duplicate/delete controls. Show useful upload, loading, unsupported-format, missing-file, invalid-URL, and offline states.

Visual direction: modern minimalist macOS-inspired desktop software with a refined glassmorphism treatment. Use translucent charcoal panels, subtle backdrop blur, fine borders, soft depth, warm ivory text, graphite backgrounds, Golden Gate amber/copper highlights, and restrained violet-indigo selected states. Keep the slide canvas as the visual focal point. Use moderate 10–14px radii, quiet motion, excellent spacing, and premium typography. Use the luminous green border/glow only for live/ready states and pair it with a visible label. Avoid generic SaaS dashboards, decorative analytics, excessive pills, noisy gradients, and clutter. The experience should feel like a high-end Mac creative tool without copying Apple branding or UI assets.

Important interaction requirements:
- Selected slide is always obvious.
- Add content opens a searchable menu.
- Editing text updates the canvas and the preview immediately.
- Present mode has working next/previous, blank, message, and exit controls.
- Message popup appears in the audience output preview.
- Buttons must work and show meaningful feedback.
- Include keyboard shortcuts for next, previous, present, blank, message, and save.
- Make the layout usable on a laptop-sized viewport.
- Keep audience output separate from operator and confidence content; never leak notes or controls to the audience screen.

Structure the code into focused components and keep service data, slide data, presentation state, and integration adapters separate. Create mock interfaces for BibleProvider, SongProvider, OutputProvider, and MediaProvider so real integrations can be added later.

Do not claim that Bible or song integrations are live. Label them as local sample libraries or provider-ready adapters.

Before finishing, verify the complete flow: create/open service → add content → select slide → edit slide → present → advance → show message → blank output → exit presentation. Fix visual issues, clipping, unreadable text, and inert controls.
```
