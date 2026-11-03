---
name: Church Presenter
description: A calm, graphite-dark operator console for preparing and running a Sunday service.
colors:
  sanctuary-dark: "#0b0b0c"
  sanctuary-deep: "#050506"
  surface: "rgba(30, 30, 33, 0.76)"
  surface-raised: "rgba(44, 44, 48, 0.62)"
  surface-solid: "#1c1c1f"
  surface-solid-raised: "#27272b"
  surface-well: "#161618"
  line: "rgba(255, 255, 255, 0.08)"
  line-strong: "rgba(255, 255, 255, 0.16)"
  text: "#f4f4f6"
  text-secondary: "#c9c9ce"
  text-muted: "#a3a3aa"
  text-faint: "#8a8a92"
  brass-fader-amber: "#ececf0"
  brass-fader-amber-bright: "#ffffff"
  brass-fader-amber-soft: "rgba(236, 236, 240, 0.14)"
  amber-ink: "#111113"
  selection-violet: "#9a8bdd"
  selection-violet-text: "#b4a7ef"
  live-green: "#65c98a"
  live-green-text: "#b3eac5"
  danger: "#e07a6c"
  danger-soft: "rgba(224, 122, 108, 0.12)"
  danger-text: "#f0a396"
typography:
  display:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "clamp(30px, 2.6vw, 42px)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "23px"
    fontWeight: 500
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 500
    letterSpacing: "-0.02em"
  display-hero:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "clamp(32px, 3.4vw, 50px)"
    fontWeight: 500
  display-greeting:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "clamp(30px, 2.4vw, 38px)"
    fontWeight: 500
  clock:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "58px"
    fontWeight: 500
  display-lg:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 500
  display-md:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "35px"
    fontWeight: 500
  display-sm:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "31px"
    fontWeight: 500
  headline-xl:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 500
  headline-lg:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "25px"
    fontWeight: 500
  headline-md:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 500
  headline-sm:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 500
  title-xl:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 500
  title-lg:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 500
  title-md:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 500
  title-sm:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 500
  title-xs:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
  lead:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
  lead-sm:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 500
  body:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  ui:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 550
  meta:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  label:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "0.16em"
  micro:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 550
rounded:
  hair: "3px"
  xs: "6px"
  sm: "8px"
  md: "9px"
  lg: "12px"
  xl: "14px"
  pill: "999px"
spacing:
  hair: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  screen-y: "30px"
  screen-x: "34px"
components:
  button-primary:
    backgroundColor: "{colors.brass-fader-amber}"
    textColor: "{colors.amber-ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "38px"
  button-secondary:
    backgroundColor: "rgba(255, 245, 230, 0.045)"
    textColor: "{colors.text-secondary}"
    typography: "{typography.ui}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "38px"
  button-secondary-hover:
    backgroundColor: "rgba(255, 245, 230, 0.075)"
    textColor: "{colors.text}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    typography: "{typography.ui}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "38px"
  button-ghost-hover:
    backgroundColor: "rgba(255, 245, 230, 0.05)"
    textColor: "{colors.text}"
  button-danger:
    backgroundColor: "rgba(224, 122, 108, 0.1)"
    textColor: "{colors.danger-text}"
    typography: "{typography.ui}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "38px"
  input:
    backgroundColor: "rgba(8, 7, 6, 0.38)"
    textColor: "{colors.text}"
    typography: "{typography.ui}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "35px"
  badge:
    backgroundColor: "rgba(255, 245, 230, 0.035)"
    textColor: "{colors.text-muted}"
    typography: "{typography.meta}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "22px"
  live-state:
    backgroundColor: "rgba(101, 201, 138, 0.12)"
    textColor: "{colors.live-green-text}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 9px"
    height: "25px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 11px"
    height: "40px"
  nav-item-active:
    backgroundColor: "rgba(154, 139, 221, 0.14)"
    textColor: "#f7eee0"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
---

# Design System: Church Presenter

## Overview

**Creative North Star: "The Quiet Control Room"**

Church Presenter is the room behind the room. The sanctuary is dim, the service is happening, and the operator's screen must glow just enough to work by without spilling light or attention. Everything sits on a neutral graphite near-black, with solid graphite cards and a floating sidebar above it. Light is spent only where hands and eyes are needed: the near-white primary on the one action that matters, Live Green on the slide the congregation is seeing, and nothing else competing.

The system is dense, like a mixing console, but never cramped. Labels are small and uppercase, controls are compact, and the canvas or current-output frame is always the largest, brightest thing on screen. Inter carries the whole app, interface and audience output alike: bold for titles, semibold for headings and controls, tabular figures for numbers. Slide content keeps its own serif option (Noto Serif), separate from the interface.

Controls are quiet until needed. Ghost and outlined buttons recede into the surface. Only the primary white action and the live state carry visual weight, so a volunteer can find "what do I press next" at a glance.

**Key Characteristics:**
- Graphite base (Sanctuary Dark) with solid graphite cards; glass only on chrome.
- One action voice: the near-white primary (code name `--amber`) for action, selected navigation, and focus.
- Three reserved state colors: green means live, violet means selected, red means destructive.
- One family, Inter, with bold headings and tabular figures for dense data.
- Dense, console-like spacing on a 4px rhythm. The 16:9 canvas is always the focal point.

## Colors

A graphite, monochrome palette where three saturated colors each own exactly one meaning. Token and variable names keep their historical `amber`/`gold` names; in the default theme they hold near-white.

### Primary
- **Primary White** (`brass-fader-amber`, `--amber`): the single action color, near-white `#ececf0`.
  - Used for the primary button and the Present button (a top-to-bottom gradient from `#ffffff` to `#e2e2e6`), the selected sidebar pill, text links, and keyboard focus rings at 78% opacity.
  - **Amber Bright** (`brass-fader-amber-bright`) is used for emphasis text on dark, such as active filter chips and warning states.
  - **Amber Soft** (`brass-fader-amber-soft`) is used for tinted fills behind amber icons and badges.
  - Text sitting on a primary fill uses **Ink** (`amber-ink`, `#111113`).

### Secondary
- **Selection Violet** (`selection-violet`): means "selected or editing", never "live".
  - Used for the active sidebar marker (2px bar), the selected rundown row, selected canvas elements and their resize handles, segmented-tab selection, active mobile tab, text-selection highlight, and frozen output.

### Tertiary
- **Live Green** (`live-green`): reserved exclusively for what the audience is seeing right now.
  - Used for the LIVE chip, the current-output frame border with its faint inner glow, the current item in the live rundown, and output-ready status.

### Neutral
- **Sanctuary Dark** (`sanctuary-dark`): the app background. One very faint white radial wash sits on top of it from the top-right, at 5% opacity.
- **Sanctuary Deep** (`sanctuary-deep`): the deepest wells, used for output and black-screen states.
- **Surface / Surface Raised** (`surface`, `surface-raised`): translucent graphite layers for panels and raised controls. They become opaque when Reduce Transparency is on.
- **Line / Line Strong** (`line`, `line-strong`): hairline borders. Use Line for panel edges and dividers, and Line Strong for inputs on hover, secondary buttons, and dialogs.
- **Text** (`text`): primary copy and headings. It is neutral off-white (`#f4f4f6`), never pure white.
- **Text Secondary** (`text-secondary`): body copy inside panels and input values.
- **Text Muted** (`text-muted`): default control labels and nav items.
- **Text Faint** (`text-faint`): eyebrows, metadata, placeholders, and counts. This is the lowest text tone allowed. It holds at least 5.3:1 contrast on surfaces.
- **Danger** (`danger`, `danger-soft`): delete, End live, and error text.

- **Solid surfaces** (`surface-solid`, `surface-solid-raised`, `surface-well`): opaque versions of the panel layers. Wells hold grouped data inside dialogs and Settings. The solid pair replaces the translucent surfaces when Reduce Transparency is on.
- **Text on tint** (`selection-violet-text`, `live-green-text`, `danger-text`): the readable light variant used for the label inside a chip or button filled with that family's tint (the LIVE chip, a selected tab, the danger button).

### Category tones
Five decorative tones give sections and content types a recognisable colour: **Blue** (`--tone-blue-rgb`, slides, services, readiness), **Violet** (`--tone-violet-rgb`, history, setup), **Rose** (`--tone-rose-rgb`, songs), **Amber** (`--tone-amber-rgb`, Scripture, time), and **Cyan** (`--tone-cyan-rgb`, data and media). Set `data-tone="blue"` (etc.) on an element and use `rgb(var(--tone-rgb) / alpha)` inside it.
- **Icon chip** (`.tone-chip`): a 32px rounded square with a tone gradient fill, a tone hairline and the icon in the tone. Panel headers, stat tiles, the backup and setup panels use one.
- **Stat tiles** carry a chip, the label, a large number and one tinted line of context, with a faint tone glow in the corner.
- **Sidebar** icons take their section's tone; the selected white pill keeps Ink.
- The readiness ring is a blue-to-violet gradient; completed checks are blue.
- **Screen tones** come from one map, `SCREEN_META` in `src/components/ScreenIcon.tsx`: Home and Services blue, Calendar and Templates violet, Bible amber, Songs rose, Media cyan, Settings neutral. The sidebar icon and the 52px heading chip beside each screen title use it, so a section has the same colour everywhere.
- Each screen root carries `data-tone`, which drives a faint tone wash behind the heading, a 4px tone bar before panel headings, and tinted icon discs in empty states.
- Settings tabs each have their own tone; the active tab is a tinted pill.

**The Tones Are Not States Rule.** Category tones only label what something is. They never mean live, selected, success or error: Live Green, Selection Violet and Danger keep those jobs, and no tone is used for a status chip.

### Tints and channels
Every translucent tint comes from its family's channel token, not a hand-typed value. In code each hue exists once as an RGB channel (`--amber-rgb`, `--violet-rgb`, `--green-rgb`, `--danger-rgb`, `--text-rgb`, `--wash-rgb`, `--ink-rgb`), and tints are written `rgb(var(--amber-rgb) / 0.12)`. Changing a hue in one place re-tints its fills, borders, focus rings and glows everywhere. `--wash-rgb` is white (255 255 255) behind hover fills and quiet surfaces. `--ink-rgb` is the black inside recessed fields. `--gold-rgb` and `--gold-bright` are aliases of the brand primary, so a church theme re-tints the whole chrome.

### Church branding
A church can replace the primary (near-white by default) and Selection Violet (accent), and set its own dark background, in Settings → Branding. The theme overrides the channel tokens on `<html>`, so every tint follows. Themes must pass the same contrast floors: 4.5:1 for primary on the background and for button labels, 3:1 for the accent, and 4.5:1 for the faintest text on the background. Live Green and Danger are never customisable. Saved branding that still holds the old default gold (`#e5a44f`) is migrated to the current default on load.

### Named Rules
**The One Source Rule.** Never hand-type an `rgba()` of an existing family. Use `rgb(var(--family-rgb) / alpha)`. Only shadow black, highlight white, button gradient stops and slide background art stay literal.

**The Green Means Live Rule.** Live Green appears only on the slide, output, or chip that is on the audience screen at this moment. Selected, saved, success, and "ready" states use amber or violet. Green is always paired with a visible "LIVE" label or dot, never color alone.

**The One Voice Rule.** Primary White is the only accent that asks for action. A screen has one filled primary button at most. Every other action is secondary, ghost, or a text link.

**The No Pure White Text Rule.** Text tops out at neutral off-white (`text`). Pure `#fff` appears only as a primary fill (button, selected pill) and on slide content rendered on the audience canvas.

## Typography

**Display Font:** Inter Variable (`--font-display`), bold 700 for screen titles and h2, semibold 650 for h3/h4. The optical-size axis gives large titles Inter Display shapes.
**Body Font:** Inter Variable (`--font-ui`), 400 body, 600 buttons and the selected nav item. Bundled with @fontsource (weight 100–900, optical size), so it works offline. Slides use it for their default sans; only a slide set to the Serif option uses Noto Serif.
**Numbers:** stat values, the readiness percentage, calendar day numbers and the clock use bold tabular figures with tight tracking (-0.035em). Inter has no width axis, so nothing is condensed.
**Slide Serif:** Noto Serif Variable (`--font-slide-serif`), used only by slide and message-box content

**Character:** Inter is built for screens and stays crisp at small sizes in a dim booth. Hierarchy comes from weight and size rather than a second family.

### Hierarchy
- **Display** (500, clamp 30–42px, 1.08, -0.035em): screen titles such as "Bible Library", and the service name in the editor and live headers.
- **Headline** (600, 23px, -0.025em, display sans): dialog titles.
- **Title** (600, 19px, -0.02em, display sans): panel headings such as "Service rundown" and "Next output".
- **Body** (400, 14px, 1.45): body copy and inputs. Scripture previews use the slide serif at 14px with 1.55 line height.
- **UI** (550, 13px): buttons, list titles, and field labels.
- **Meta** (400, 12px): secondary lines, timestamps, and captions.
- **Label** (650, 12px, 0.16em tracking, uppercase): section eyebrows such as "WELCOME" and "CURRENT OUTPUT".
- **Micro** (550, 11px): badges, counts, key caps, and tool labels.

### Heading steps
The display headings use more sizes than the core roles above. These steps are deliberate and match the density of each surface:
- **Display steps** (31, 35, 36px): large hero and screen headings below the fluid Display clamp, such as the Song hero and Home hero.
- **Headline steps** (22, 24, 25, 28px): dialog-scale titles, big figures in stat blocks, and empty-state headings.
- **Title steps** (16, 17, 18, 20, 21px): panel and rail titles. Dense rails (live rundown, next output) sit at 16–18px, while page sections and previews sit at 20–21px.
- **Lead** (14.5–15px, sans or serif): a strong single line just above body, such as the sidebar service name, hymn stanzas, and the home hero note.
- **Clock** (58px): the welcome clock, the only number set at display size.
- **Home hero** (fluid 32–50px) and **home greeting** (fluid 30–38px): the two fluid display headings on Home.

Audience output and the confidence monitor size their text with the viewport (`vw`), and slide content sizes with the canvas (`cqw`). Both are projected content, so the operator type ramp and the 11px floor do not apply to them.

New headings pick the nearest existing step. Don't add a new size between two steps.

### Named Rules
**The 11px Floor Rule.** No operator-facing text is smaller than 11px. The booth is dim, and the screen is often a laptop across a desk. Slide content on the canvas is exempt because it scales with the canvas.

**The Steady Digits Rule.** Clocks, timers, slide positions, and counts use tabular numerals so they don't shift while live.

## Layout

The layout is one macOS-style window: a floating sidebar card (248px column, 12px inset, `xl` radius, solid graphite) running the full window height, a unified toolbar (52px) over the content, and a scrolling content area. The toolbar is one row in three zones: the page title and LIVE chip on the left, search centred, and storage status, clock, settings, and language on the right. On displays 1680×940 or larger the app floats as a single window with the `xl` radius and a window shadow; on laptop screens it is full-bleed. When the browser window loses focus, the chrome dims and the selected sidebar row turns neutral, as an inactive Mac window does. Installed (standalone) windows show decorative window controls at the top of the sidebar; normal browser tabs never show fake controls. Library screens cap content at 1540px with 30px top and 34px side padding. The editor is a three-column workspace: rundown (250px), canvas (flexible), and inspector (288px by default). Wider than 1240px, the inspector resizes from a slim grip on its left edge (260–420px, arrow keys too, double-click resets); the width is saved per device in localStorage. Panes are separated by hairlines, not gaps. Live mode drops the shell entirely for a full-bleed console. The current output sits large on the left with the controls bar beneath it, and the next slide and rundown fill a 328px side rail.

Spacing runs on a dense 4px-based rhythm. Tight groups use 4–8px, related controls 8–12px, and panel padding 12–16px. Panels are separated by 13–16px.

Panels reflow at narrower widths rather than disappearing:
- **1180px or narrower:** the sidebar collapses to a 76px icon rail. Inside the editor this happens at 1360px or narrower, so the canvas keeps its width.
- **980px or narrower:** the inspector drops below the canvas, and the rundown stays fixed on the left as you scroll.
- **820px or narrower, or a portrait tablet:** everything stacks into one column. In the editor the order is canvas, inspector, rundown. In live mode it is current output, controls, next slide, rundown.
- **620px or narrower:** a bottom tab bar (Home, Calendar, Bible, Songs, More) replaces the sidebar, and live controls stay pinned at the bottom of the screen.

### Named Rules
**The Canvas Is the Center Rule.** In the editor and in live mode, the 16:9 slide is the largest element on screen at every width. Panels give up space before the canvas does.

**The Reflow, Never Hide Rule.** Narrow widths move panels; they never remove a feature. The inspector, rundown, next slide, and history must be reachable at every size.

## Elevation & Depth

Depth comes from layered glass, used on chrome only. The toolbar, sidebar, rundown, inspector, popovers, and sheets share one glass recipe: tint `rgb(var(--chrome-rgb) / var(--glass-opacity))`, `--glass-filter` (26px blur, 140% saturation), and a top-edge hairline highlight (`--glass-edge`). Content panels inside screens (slides, lyrics, Scripture, cards) sit on opaque `--surface-solid` so text stays crisp on any background. Settings → General → Glass opacity (55–100%, default 80%) writes `--glass-opacity`; sheets and popovers never go below 92–94%. Shadows are ambient and soft. They separate layers, but they never carry hierarchy on their own. When Reduce Transparency is on (in Settings or from the OS `prefers-reduced-transparency`), the blur disappears everywhere, `--glass-opacity` becomes 1, and surfaces become opaque. The layering still reads through borders and tone.

### Shadow Vocabulary
- **Panel ambient** (`box-shadow: 0 8px 30px rgba(0, 0, 0, 0.22)`): default under every panel.
- **Overlay** (`box-shadow: 0 20px 60px rgba(0, 0, 0, 0.38)`): popovers and floating menus.
- **Dialog** (`box-shadow: 0 35px 100px rgba(0, 0, 0, 0.6)`): modals and the command palette, over a dimmed and blurred backdrop.
- **Amber lift** (`box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 6px 17px rgba(190, 120, 42, 0.2)`): the primary button only. A top highlight plus a soft under-glow makes it feel lit from within.
- **Live glow** (`box-shadow: 0 0 0 1px rgba(101, 201, 138, 0.05), inset 0 0 26px rgba(101, 201, 138, 0.025)`): the current-output frame only.
- **Focus ring** (`outline: 2px solid rgba(229, 164, 79, 0.78); box-shadow: 0 0 0 4px rgba(229, 164, 79, 0.12)`): every keyboard-focusable control.

### Named Rules
**The Ambient Only Rule.** Shadows are soft and offset downward. No hard offset shadows and no colored halos, except the amber lift on the primary button and the live glow on the output frame.

## Shapes

Corners are gently rounded and grow with the size of the container. Every radius uses one of seven steps, available in code as `--rounded-*`:
- `hair` (3px): grips, resize handles, and slim bars.
- `xs` (8px): small icon buttons and chips inside dense rows.
- `sm` and `md` (10px, 12px): inputs and list rows use `sm`, buttons use `md`.
- `lg` (18px): cards and preview frames.
- `xl` (24px): panels, the sidebar card, dialogs, and sheets.
- `pill`: badges, the LIVE chip, tag filters, and switches. True circles (dots, avatars) use 50%.

**The Seven Corners Rule.** Use a `--rounded-*` step, never a raw pixel radius. Slide content on the canvas is exempt because it scales with the canvas.

Borders are hairlines (1px) in white at 8–16% opacity, never solid grey. Slide thumbnails and the canvas keep a 16:9 frame with a 6–9px radius. The only drawn ornament is a short amber rule under slide headlines.

## Components

### Buttons
Quiet until needed: only one button per view is allowed to glow.
- **Shape:** gently rounded (9px), 38px tall, 14px horizontal padding, 13px semibold label. On touch screens the minimum is 44px.
- **Primary:** amber top-to-bottom gradient (`#f0bb70` to `#dfa04b`) with Amber Ink text and the amber lift shadow. Used for Present, Open service, Search, and Add to slide.
- **Secondary:** a 4.5% white fill with a Line Strong border and Text Secondary label. On hover the fill rises to 7.5% and the label turns to Text.
- **Ghost:** no fill and a Text Muted label. On hover it gets a 5% fill.
- **Danger:** a 10% red fill with a red-tinted border and `#f0a396` label. Used for End live and Delete.
- **Focus:** the amber focus ring. **Disabled:** a not-allowed cursor and reduced opacity.

### Chips and Badges
- **Style:** pill-shaped, 22px tall, hairline border, 3.5% fill, Meta text in Text Muted.
- **Variants:** amber (soft amber fill, Amber Bright text) for highlights, quiet (Text Faint) for metadata, and live (green) only for live status.
- **Filter chips:** 24px minimum height. When active they switch to the amber variant.

### Panels / Containers
- **Corner Style:** 14px.
- **Background:** `surface` with a faint 150° sheen and 20px backdrop blur.
- **Shadow Strategy:** panel ambient (see Elevation & Depth).
- **Border:** 1px Line.
- **Internal Padding:** 12–16px. Panel headers pair a Label eyebrow with a display Title.

### Inputs / Fields
- **Style:** a dark recessed fill (`rgba(8, 7, 6, 0.38)`), 1px Line border, 8px radius, 35px tall, 13px text in Text. Labels sit above in UI weight, with units (%) inline and faint.
- **Hover:** the border steps up to Line Strong.
- **Focus:** a Selection Violet border plus a deeper fill. Search fields with an inner borderless input show the amber ring on the outer frame instead.
- **Selects:** use the same treatment as inputs. They are never left in the native grey style.

### Navigation
- **Sidebar:** 32px rows, 13px label in Text Secondary, 18px icons at 1.7 stroke. Icons carry a muted tint per section (`data-tone`: gold, violet, green, or wash).
  - **Hover:** a 6% white fill.
  - **Active:** a solid primary-white pill (`--rounded-pill`) with Ink label and icon, semibold, and a soft drop shadow. In an inactive window it turns to a neutral 12% wash.
  - Icons sit in Text Muted; the `data-tone` tint is overridden by the graphite theme.
  - **Icon rail:** the sidebar collapses to icons, each with its name kept for screen readers and shown as a tooltip.
- **Mobile tab bar:** a fixed bottom bar with five 50px tabs showing an icon plus an 11px label.
  - **Active tab:** violet tint, with the icon in Amber Bright.
  - **More:** opens a bottom sheet listing Media, Templates, and Settings.

### Toolbar Controls
- Toolbar controls are 28px tall: search field (recessed, 280px, 240px under 1360px), language select, settings avatar.
- Segmented controls use a 24px row with a raised neutral thumb on the selected segment.
- Press states darken slightly (brightness 90%); nothing scales or bounces.
- Motion is 120–200ms ease-out (`--ease-out`) and respects Reduce Motion.

### Live State Chip (signature)
- **Style:** a pill, 25px tall, uppercase label (700 weight, 0.1em tracking), with a 6px dot ringed by a 3px soft halo of the same color.
- **Live:** green-tinted pill. **Warning:** amber. **Frozen:** violet.
- It is always paired with the word, never just the dot. The dot is static: the live moment is calm, not blinking.

### Editor Toolbar (signature)
- Each tool is a 48px-minimum tile with an amber 16px icon over an 11px label. Tools are separated by hairline dividers.
- On desktop the toolbar wraps as one even flow and never hides tools. On phones it scrolls sideways and fades at the right edge to show there is more.

### Message Box (on slides)
- **Default:** a warm near-black panel (`#100d0a` at 84%) with light text (`#f8f0e3`), a 2px amber edge, 18px corners, and semibold sans at 34px (1280 reference). It stays readable on light and dark slides.
- **Rules:** text must keep 3:1 (large) or 4.5:1 (small) over both a black and a white backdrop. The box never leaves the slide and always sits above the slide's own text layer.

### Timer Slide (signature)
- **On the slide:** large light-weight sans digits in tabular numerals (`MM:SS`, about 21% of the slide width), the slide title as a small uppercase label above, a state word below, and a thin amber progress bar.
- **States:** Ready shows the full duration. Running fills the progress bar. Paused dims the digits to 55%. Completed turns the digits and the word "Time's up" amber. Amber, not green: a finished timer is not "live".
- **Controls:** a readout with a status chip (quiet when ready, amber tint when running, dashed outline when paused, solid amber when completed). Below it sit one primary action (Start or Resume) or a secondary Pause, plus a ghost Reset. Actions that don't fit the state are disabled.

## Do's and Don'ts

### Do:
- **Do** keep Live Green exclusively for audience-visible state, always with a "LIVE" word or dot.
- **Do** use Selection Violet for selected or editing state: rundown row, canvas element, active tab.
- **Do** limit each view to one filled amber button. Make everything else secondary, ghost, or a link.
- **Do** set screen titles, service names, dialog titles, and panel titles in bold Inter. Set everything interactive in regular or semibold Inter. Slide text keeps the slide serif.
- **Do** keep operator text at 11px or larger, and use tabular numerals for anything that counts or ticks.
- **Do** use warm off-white hairlines (8–15% opacity) for borders and the 9px / 14px radius pair for controls and panels.
- **Do** reflow panels at narrow widths. The canvas stays the largest thing on screen.
- **Do** respect the Reduce Transparency and Reduce Motion settings. Both must keep working.

### Don't:
- **Don't** use green for success toasts, "saved" states, or selection.
- **Don't** use pure white UI text, solid grey borders, or a light theme surface.
- **Don't** leave native grey form controls. Every select and input takes the recessed dark field style.
- **Don't** add hard offset shadows or colored glows beyond the amber lift and the live frame glow.
- **Don't** hide the inspector, rundown, next slide, or history at small widths. Move them instead.
- **Don't** set operator UI text below 11px, and don't put a second framed focus box inside an already-framed field.
