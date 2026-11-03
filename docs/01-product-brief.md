# Church Presenter — Product Brief

## Product intent

Church Presenter is a local-first presentation app for evangelical churches. It helps worship teams prepare a service quickly, edit slides without friction, and operate live presentation output with confidence.

The final product is downloadable and installable software for macOS and Windows. A church should be able to install it on a presentation computer, use its core workflow without an internet connection, and keep its services, media, libraries, branding, and settings locally on that computer.

The product should feel like a calm control room: powerful enough for a Sunday service, simple enough that a volunteer can learn it in minutes.

Security is part of the product experience: local/online state, provider permissions, content sources, output destinations, and backup contents must be understandable to the operator.

## Primary screen references

Use these visual references as the coordinated screen set:

- `assets/reference/church-presenter-first-screen.png` — Home.
- `assets/reference/church-presenter-bible-library.png` — Bible Library.
- `assets/reference/church-presenter-slide-editor.png` — Individual slide editor.
- `assets/reference/church-presenter-live-service.png` — Live Service.
- `assets/reference/church-presenter-workspace.png` and `assets/reference/church-presenter-add-slide.png` — supporting editor references.

Implementation must follow `docs/10-reference-screen-review.md`, especially its canonical navigation, free/open Bible examples, output setup, and selected-versus-live state rules.

## Primary users

- Worship/service leader preparing a Sunday service.
- Presentation operator running slides during the service.
- Pastor or speaker creating scripture, sermon, and announcement slides.
- Church media coordinator managing songs, Bible versions, languages, and reusable content.

## Core outcome

Given a blank service, a user should be able to assemble a complete presentation in under 10 minutes, preview the exact audience output, and present it reliably across one or more screens.

## Required capabilities

### Service duplication

Any service can be duplicated in one action. The copy must receive a new ID, remain independently editable, and be usable as the starting point for a new date.

### Calendar integration

Services are organized around a calendar. Users should be able to browse upcoming and past services, open a date to find its rundown, create a service from a date, and search by title, date, event type, or reference. Start with a local calendar view and a provider-ready adapter for Google Calendar or Outlook later.

### Bible and song library integration

Bible and song libraries are part of the core authoring workflow. Users can search, preview, choose a language or translation, and add content directly to the current service. Start with local sample providers and clear adapter boundaries for licensed Bible APIs and song-library integrations such as JEM where permitted.

### Bilingual scripture slides

Scripture slides support two language/translation fields on the same slide. The primary scripture appears at the top in bold, larger type. The secondary translation appears below in normal weight and a smaller size. Both references remain visible and the layout must adapt to long verses.

### Church branding

The church can customize the app identity from Settings. Users can upload or select a church logo and change the displayed church/app name. The logo and name update in the top-left navigation area and any appropriate presentation identity surfaces. Store the branding locally in the first version, with the default Church Presenter identity as a fallback.

### Rich slide editor

The editor canvas must support the main media and utility features needed during a church service:

- Upload local images and videos.
- Add image/video URLs and preview them before inserting.
- Add YouTube links using an official embed or authorized import flow. Do not present unauthorized downloading as a supported feature; any download/import must respect YouTube terms and content rights.
- Generate QR codes from URLs, text, contact details, or event information.
- Add and edit text, images, video, shapes, backgrounds, and QR codes on a slide.
- Reorder layers and adjust alignment, size, crop, opacity, and visibility.
- Keep media local-first and show clear loading, unsupported-format, and missing-file states.

## MVP workflow

1. Create or open a service.
2. Add items from a library: song, Bible passage, announcement, sermon point, blank slide, or media.
3. Reorder the service rundown.
4. Edit the selected slide with simple controls for text, background, alignment, and theme.
5. Preview current and next slides.
6. Start presentation mode.
7. Advance or return to previous slides, show a message popup, blank the output, or switch to a different slide.
8. Save everything locally and reopen it later.

## Live navigation requirement

Returning to previous slides must be fast and obvious during a live service. Presentation mode must include a persistent Previous action beside Next/Present controls, support a keyboard shortcut, and preserve enough navigation history to move backward through recently shown slides without losing the current rundown position. The operator must be able to jump back to a previously shown slide and then resume forward navigation.

## Live slide indicator

The slide currently being shown to the audience must have a bright green border with a subtle green glow. It must also display a visible “LIVE” label or status marker so the state is not communicated by color alone. The indicator must be consistent in the rundown, slide thumbnails, editor canvas, and current-output preview.

## MVP content types

- Song: title, author, lyrics, verses, chorus, bridge, language.
- Bible passage: book, chapter, verse range, primary translation, optional secondary translation, formatted text.
- Announcement: title, body, date/time, optional image.
- Sermon slide: title, body, scripture reference, speaker notes.
- Blank slide: free-form text and layout.

## Language support

The UI must be structured for localization from day one. Support these locale keys:

- `en` — English
- `pt` — Portuguese
- `pt-BR` — Brazilian Portuguese
- `es` — Spanish
- `fr` — French
- `de` — German
- `it` — Italian

Use English seed copy initially, but keep all visible UI strings in a translation dictionary.

## Important non-goals for MVP

- Do not implement real Bible licensing or external song-provider authentication yet.
- Do not claim that integrations are connected; represent them as provider-ready adapters with sample data.
- Do not build a full video editor or complex motion graphics system.
- Do not make the first version depend on a cloud account or network connection.

## Desktop installation requirements

- Provide a macOS installer and a Windows installer.
- The app must launch as a standalone desktop application, not require a browser tab, and support offline use for core presentation workflows.
- Store services, settings, church branding, imported media, and local libraries on the device.
- A network connection may be required only for optional integrations such as online Bible providers, calendar sync, YouTube embeds, or cloud backup.
- The app must clearly communicate when a feature requires internet access.

## Security-aware product requirements

- Imported files and media must not be able to execute code.
- Online providers must not expose local files or credentials.
- Audience output must never receive operator notes or private confidence content by accident.
- Backups and exports must not contain OAuth tokens or hidden private files.
- Installers and updates must be signed and verified.

## Success criteria

- The user understands the current service state at a glance.
- The selected slide is easy to edit without hunting through menus.
- The preview clearly separates operator view from audience output.
- Adding and reordering slides feels faster than creating them manually from scratch.
- The interface remains usable at laptop size and in presentation mode.
- The most important actions have keyboard shortcuts.
