# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

The UI is built with web technology (React + Vite) and is planned to ship as an installable desktop app for macOS and Windows through a Tauri-style shell. The desktop shell is not built yet. Its design language stays web, not native macOS or Windows.

## Users

Two primary users, weighted equally in design decisions:

- **Service leader / preparer:** a worship leader, pastor, or media coordinator who builds the service during the week. Jobs: build the rundown, add songs, Scripture, announcements, sermon points, and media, edit slides, and duplicate last week's service.
- **Live operator:** a church volunteer, often non-technical, who runs the presentation during the service. They work under time pressure and are sometimes trained minutes before the service starts. Jobs: advance, go back, jump to a slide, blank the screen, show a message, and recover when something goes wrong.

The same person often does both jobs.

## Product Purpose

Church Presenter is a local-first presentation app for evangelical churches. A church can prepare a full service quickly, edit slides without friction, and run live output with confidence.

Success means:

- A complete service is assembled from blank in under 10 minutes.
- The audience output is previewed exactly before it goes live.
- The service is presented reliably across one or more screens.
- The current service state is clear at a glance.

## Positioning

Distribution: built first for one church (the author's). It may be shared with other churches later. No pricing, licence model, or commercial claims exist. Do not invent them.

What it does differently:

- **Local-first and offline by default.** Services, media, libraries, branding, and settings stay on the presentation computer. The network is needed only for optional, clearly labeled features.
- **Bilingual Scripture as a first-class slide.** Primary translation on top in bold, larger type. Secondary translation below in smaller, normal-weight type. Both references stay visible.
- **Live state you can trust.** Green means "on the audience screen now" and nothing else.

## Operating Context

- A dim sanctuary or AV booth on a Sunday, on a laptop-size screen, with one or more external displays (audience output and an optional confidence monitor).
- Weekly cycle: prepare during the week, then rehearse, then run live.
- Volunteers rotate, so they must learn the core live workflow in minutes.
- Keyboard shortcuts drive live operation: Next, Previous, Present, Blank, Message, Freeze, Jump.
- Content comes from the local Bible library (public-domain/open translations such as WEB, OEB, and BSB, plus imported translations), a local public-domain hymn library, uploads, public URLs, and official YouTube embeds.
- Canonical navigation: Home · Calendar · Bible · Songs · Media · Templates · Settings. Inside a service, show its title and a back action. Do not replace the navigation.

## Capabilities and Constraints

Built (browser prototype, `src/`):

- Service rundown with sections, calendar, and one-action service duplication.
- Bible and song libraries behind provider adapters, with local sample data.
- Bilingual Scripture slides.
- Slide editor: text, image, video, URL media, YouTube embed, QR (URL, text, event, contact), shapes, backgrounds, layers, crop, alignment, opacity, visibility, and drag-and-drop upload.
- Live Service: Previous/Next, recent-slide history, quick jump, blank, message popup, and current/next preview.
- Settings: church branding (logo and name), outputs/monitors, shortcuts, and backup/restore.
- UI locales: en, pt, pt-BR, es, fr, de, it. Every visible string goes through the translation dictionary.

Hard rules:

- **Green is reserved for LIVE.** The slide on the audience output gets a green border, a subtle glow, and a visible "LIVE" label, so state is never shown by color alone. Selected/editing state uses amber or violet, never green. The rule applies to the rundown, thumbnails, canvas, and output preview.
- **Previous is always reachable during live operation**, beside Next/Present, with a keyboard shortcut and history.
- **Audience output never receives operator notes or confidence-only content.**
- **Every file, URL, embed, QR payload, template, and backup is untrusted.** See `docs/SECURITY-REVIEW.md`.
- **No unauthorized YouTube downloading.** Official embed only, labeled online-only.
- **Online-only features say so** and degrade to a clear offline state.
- **No real licensed provider is connected.** Never claim one is. Integrations such as API.Bible, CCLI/SongSelect, and JEM are adapters only.

Open decisions:

- Desktop shell (Tauri vs Electron), installers, signing, and auto-update.
- Whether and how to distribute to other churches.
- Licensed Bible/song providers and their agreements.

## Brand Commitments

- Product name (app title): **CATHEDRAL INTL**, for the church **Campus Algarve**, with the Cathedral INTL circular logo as the default. The church can change the app title, church name and logo in Settings. The codebase and backups keep the internal id `church-presenter`.
- Intended feel (from the brief): a calm control room. Powerful enough for Sunday, simple enough for a volunteer to learn in minutes.

## Evidence on Hand

- Screen references: `assets/reference/church-presenter-*.png` (home, workspace, add-slide, slide-editor, bible-library, live-service). Reviewed in `docs/10-reference-screen-review.md`.
- Product and planning docs: `docs/00`–`docs/10`, plus `prompts/`.
- Sample content: the fictional "Grace Community Church" seed service, public-domain hymns, and open Bible excerpts in `src/data/`.
- Absent: real users, testimonials, usage data, church partners, pricing, and licence agreements. Do not fabricate any of them.

## Product Principles

1. **The live moment comes first.** Any feature that adds risk or hesitation during live operation loses to one that keeps the operator calm and in control.
2. **State is never ambiguous.** Live vs selected, online vs offline, local vs remote, and saved vs unsaved are always visible, and never shown by color alone.
3. **Local and offline by default.** The network is an optional extra, labeled every time.
4. **A volunteer learns it in minutes.** Common jobs need no hunting through menus. Power features stay out of the way.
5. **Respect content rights and safety.** Never imply a licence or integration that does not exist. Treat all imported content as untrusted.

## Accessibility & Inclusion

- **Operator UI:** WCAG 2.2 AA. This covers contrast in a dim booth, visible focus, full keyboard operation, and state not shown by color alone.
- **Projected output:** text must read from the back of the room. Use projection-scale type sizes, strong contrast against backgrounds and media, and keep content inside the 16:9 safe area. Long verses and lyrics must adapt rather than overflow.
- Seven UI locales, with Portuguese and English primary for bilingual Scripture.
