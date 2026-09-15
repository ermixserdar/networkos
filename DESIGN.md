---
name: NetworkOS
description: A private, local-first personal CRM that reads like a quiet paper ledger of the people who matter.
colors:
  ink: "#102F38"
  muted: "#64777B"
  paper: "#F6F8F7"
  card: "#FFFFFF"
  harbour-teal: "#0B4B52"
  teal-deep: "#082F36"
  teal-muted: "#B8D7D2"
  signal-coral: "#F0644F"
  coral-soft: "#F9D8D1"
  coral-ink: "#9E4738"
  sage: "#E3F0ED"
  line: "#E1E9E7"
  field: "#FFFFFF"
  placeholder: "#9BA3A3"
  good: "#2E8C78"
  warn: "#A85A4A"
typography:
  hero:
    fontFamily: "San Francisco (system)"
    fontSize: "32pt"
    fontWeight: 800
    lineHeight: "auto"
  title:
    fontFamily: "San Francisco (system)"
    fontSize: "25pt"
    fontWeight: 800
  body:
    fontFamily: "San Francisco (system)"
    fontSize: "16pt"
    fontWeight: 400
    lineHeight: "23pt"
  label:
    fontFamily: "San Francisco (system)"
    fontSize: "13pt"
    fontWeight: 900
    letterSpacing: "0.6pt"
  caption:
    fontFamily: "San Francisco (system)"
    fontSize: "12pt"
    fontWeight: 800
rounded:
  sm: "12pt"
  md: "16pt"
  lg: "18pt"
  xl: "24pt"
spacing:
  xs: "6pt"
  sm: "10pt"
  md: "16pt"
  lg: "22pt"
  xl: "30pt"
components:
  button-primary:
    backgroundColor: "{colors.signal-coral}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "16pt 16pt"
    height: "52pt"
  button-primary-disabled:
    backgroundColor: "{colors.line}"
    textColor: "{colors.muted}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  button-ghost:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.harbour-teal}"
    rounded: "{rounded.md}"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.signal-coral}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  card-sage:
    backgroundColor: "{colors.sage}"
    rounded: "{rounded.lg}"
  card-coral:
    backgroundColor: "{colors.coral-soft}"
    rounded: "{rounded.lg}"
  field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "15pt"
    height: "50pt"
  chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10pt 14pt"
    height: "44pt"
  chip-selected:
    backgroundColor: "{colors.harbour-teal}"
    textColor: "#FFFFFF"
---

# Design System: NetworkOS

## Overview

**Creative North Star: "The Quiet Ledger"**

NetworkOS is a paper ledger for people. Its surfaces are near-white and matte, its headings are ink, and a single coral mark sits in the margin wherever something needs a decision. The product's promise — a private memory that never raises its voice — is carried visually by restraint: the app never competes with the person the user is trying to remember. Density is generous rather than efficient; a screen would rather show six contacts calmly than fourteen in a grid.

The world is built from four materials. **Paper** (`#F6F8F7`) is the ground everything rests on. **Card** (`#FFFFFF`) is the raised leaf that holds one idea. **Harbour Teal** is the ink of intent: selected chips, the owner's own node, the checkbox that is on. **Signal Coral** is the only warm voice in the system and it is rationed — one accent per screen region, reserved for the next action and for relationship strength.

Depth is soft and singular: one diffuse teal-tinted shadow, never stacked, never dramatic. Corners are generously rounded (12–24 pt) so nothing feels administrative. Type is the system face at large sizes and heavy weights; the hierarchy is carried by weight and scale, not by rules, boxes, or color. Dark mode is a first-class appearance, not an inversion: paper becomes deep petrol (`#0B1E22`), cards lift to `#123037`, and coral stays exactly where it is so the accent means the same thing in both worlds.

**Key Characteristics:**
- Matte, near-white ground with white cards; no gradients, no glass, no texture.
- One soft teal shadow as the only depth device.
- Coral is rationed; teal carries state; everything else is ink and muted grey.
- Heavy weights (700–900) on small type; hierarchy through weight, not decoration.
- 44 pt minimum touch targets everywhere, with generous vertical rhythm.
- Bilingual by construction: every string is a key, so layouts must tolerate Turkish's longer words.

## Colors

A cool, low-chroma palette built from paper and ink, with a single warm accent that always means "act".

### Primary
- **Harbour Teal** (`#0B4B52`): the ink of intent. Selected chips, checked checkboxes, switch tracks, the owner's node in the graph, initials in avatars, ghost-button labels. It signals state and ownership, never decoration.
- **Teal Deep** (`#082F36`): reserved for the shadow colour and for the darkest surface in the lock and onboarding screens, where the app takes over the whole viewport.

### Secondary
- **Signal Coral** (`#F0644F`): the one warm voice. Primary buttons, the relationship-strength dot, the wordmark, chevrons that lead somewhere, and the loading spinner. It is the only colour allowed to interrupt.
- **Coral Soft** (`#F9D8D1`) and **Coral Ink** (`#9E4738`): the warning card pair — soft ground, dark text — used where the app must admit a limitation (unencrypted CSV export, database encryption off).

### Tertiary
- **Sage** (`#E3F0ED`): the quiet affirmative. Ghost-button ground, checked rows, avatar fallback, "how it works" cards. It is teal at a whisper.
- **Teal Muted** (`#B8D7D2`): body copy on full-teal screens (lock, onboarding) where muted grey would disappear.

### Neutral
- **Ink** (`#102F38`): every heading and primary label. Warm-shifted near-black; never pure black.
- **Muted** (`#64777B`): secondary text, section labels, hints, empty states.
- **Paper** (`#F6F8F7`): the app ground.
- **Card** (`#FFFFFF`): raised surfaces and input fields.
- **Line** (`#E1E9E7`): hairline separators, unselected chip borders, disabled button fill.
- **Placeholder** (`#9BA3A3`): input placeholder text only.
- **Good** (`#2E8C78`) / **Warn** (`#A85A4A`): relationship health only — healthy versus cooling. They never appear as buttons or backgrounds.

### Dark appearance

Dark mode redefines the same token names rather than adding new ones: paper `#0B1E22`, card `#123037`, ink `#EDF4F2`, muted `#9DB5B1`, line `#1E3D43`, sage `#183239`, field `#16343B`, teal `#12454C`, teal-muted `#8FB6B1`, coral-soft `#3A2220`, coral-ink `#F2A796`, good `#5FBFA6`, warn `#E08774`. **Signal Coral is identical in both appearances.**

### Named Rules

**The One Warm Voice Rule.** Coral appears at most once per screen region, and only on the action the user is most likely to want next. A screen with two coral buttons has no primary action.

**The Teal-Is-State Rule.** Teal marks what is on, selected, or yours. If a teal surface is not communicating state or ownership, it is decoration and must be sage or card instead.

**The Constant Accent Rule.** Coral's hex never changes between light and dark. The accent is the one fixed point the user learns; the rest of the palette may move around it.

## Typography

**Display / Body / Label Font:** San Francisco (the iOS system face). No custom or brand typeface is loaded, and none should be added for UI text.

**Character:** The voice is plain and confident. Personality comes from weight and size, not from a face: headings are heavy and large, supporting copy is regular and generously leaded, and the smallest text is the heaviest so it survives at 11–13 pt.

### Hierarchy
- **Hero** (800, 32 pt): screen titles (`Title`) and onboarding headline (42 pt in the full-bleed teal case). One per screen.
- **Headline** (800, 25 pt): stat and summary figures inside cards.
- **Title** (800, 17–19 pt): card headings and contact names on detail screens.
- **Body** (400–700, 16 pt, 23 pt leading): contact names in rows, field text, card body copy. Turkish runs ~15% longer than English; body blocks must wrap, never truncate.
- **Label** (900, 13 pt, +0.6 pt tracking, upper case at call sites): `SectionLabel` — the ledger's column headings.
- **Caption** (800, 12 pt): field labels and rating captions.
- **Eyebrow** (900, 11 pt, +2 pt tracking): the `NETWORKOS` wordmark on lock and onboarding only.

### Named Rules

**The Heavy-Small Rule.** The smaller the type, the heavier the weight: 16 pt body sits at 400–700, 13 pt labels at 900. Small and light never appear together.

**The One Hero Rule.** Exactly one 32 pt title per screen, always the first text after the back link. Sub-sections use 13 pt section labels, never a second hero.

## Layout

A single-column, vertically-scrolling ledger. `Screen` and `ScreenScroll` set the frame: 22 pt horizontal gutters, 58 pt top inset (clearing the status bar without a navigation chrome), 30–44 pt bottom padding. There is no grid and no multi-column layout at any width — on iPad the app runs in the iPhone compatibility window, and the design assumes that width.

Rhythm comes from a 5-step scale (6 / 10 / 16 / 22 / 30 pt). Cards are padded 16 pt and separated by 10–12 pt. List rows are separated by hairlines rather than gaps, and each row clears 62 pt so a photo, two lines of text, and a strength mark sit comfortably. Section labels get 9 pt of air beneath them and 20–26 pt above.

Navigation is a five-item tab bar (home, contacts, network, follow-up, more) at 84 pt tall, with every other screen pushed onto the stack and returned from by an explicit `‹ Back` text link at the top left plus the system edge-swipe.

## Elevation & Depth

The system is nearly flat and uses exactly one shadow. Cards and floating buttons carry a soft, wide, teal-tinted shadow (`#082F36` at 10% opacity, 20 pt blur, 8 pt Y-offset, Android elevation 4). It is ambient, not structural: it separates a card from paper, it never implies a stack or a modal layer.

Everything else conveys depth tonally: paper → card is a lightness step in light mode and a lift from `#0B1E22` to `#123037` in dark mode. Inputs use a hairline border instead of a shadow. The privacy cover and lock screen use a full teal fill rather than a blur.

### Shadow Vocabulary
- **Ambient card** (`shadowColor #082F36, opacity 0.1, radius 20, offset 0/8, elevation 4`): every `Card` and the floating import button. The only shadow in the system.

### Named Rules

**The Single Shadow Rule.** One shadow value exists. If a surface needs more separation than it provides, change the tone or add a hairline — never deepen or stack the shadow.

## Shapes

Soft rectangles throughout, with radius encoding size rather than importance: fields 12 pt, buttons and chips 16 pt, cards 18 pt, the largest containers 24 pt. Circles are reserved for people and counts — avatars (`size/2`), rating pips (22 pt), and the round add button (44 pt) — so anything circular reads as "a person or a quantity".

Borders are hairlines (1 pt) in `line`, used on inputs, unselected chips, and between list rows. Selected states replace the border colour with teal rather than thickening it. No strokes on cards, no outlines on images, no dividers inside cards.

## Components

### Buttons
- **Shape:** softly rounded (16 pt radius), 52 pt minimum height, 16 pt vertical padding, icon and label centred with 8 pt between them.
- **Primary:** coral ground, white label at 800/16 pt. Disabled and busy both fall back to a `line` ground with muted text, and busy swaps the label for a spinner in the label's colour.
- **Outline:** transparent ground, ink label, 1 pt ink border. The default "second" action.
- **Ghost:** sage ground, teal label, no border. Used for affirmative secondary actions inside cards.
- **Danger:** transparent ground, coral label, 1 pt coral border. Destructive actions never get a filled coral ground — the fill is reserved for what the user wants, not for what deletes.
- **States:** no hover on touch; pressed state is the platform default opacity. Disabled is announced through `accessibilityState`.

### Chips
- **Style:** 44 pt tall, 16 pt radius, card ground, 1 pt `line` border, 700 weight label.
- **Selected:** teal ground, white label, teal border. Used for filters, language, theme, grace period, interaction type.

### Cards / Containers
- **Corner Style:** 18 pt.
- **Background:** white (`card`) by default; `sage` for explanatory cards; `coralSoft` for warnings.
- **Shadow:** the single ambient card shadow.
- **Border:** none.
- **Internal Padding:** 16 pt, with 10–12 pt between stacked cards.

### Inputs / Fields
- **Style:** white field, 12 pt radius, 1 pt `line` border, 15 pt padding, 50 pt minimum height, 16 pt ink text, a 12 pt/800 muted label above and an optional placeholder in `placeholder` grey.
- **Focus:** platform default caret; no glow, no border shift.
- **Error:** errors surface as an `Alert`, not as inline red — the fields stay calm.

### Navigation
- **Tab bar:** 84 pt tall, card ground, hairline top border, 11 pt/700 labels, outline Ionicons; coral for the active tab and muted for the rest.
- **Back:** a text link (`‹ More`, `‹ Companies`) at the top left, 800 weight ink, 44 pt tall hit area, always paired with the live edge-swipe gesture.

### Rows
- **Contact row:** avatar (48 pt circle, photo or sage-backed teal initials), name at 16 pt/700, role · company at muted, and a coral `● n` strength mark on the right. Hairline beneath. 62 pt tall.

### Signature: the network canvas
The graph is the one place the system spends visual energy. Nodes are circles sized by importance; the owner is teal, everyone else is card with a teal hairline; edges are thin teal-muted lines. It is pinch-zoom and drag, it lays out in animation-frame chunks so the tab never freezes, and every node repeats as a text row underneath so the whole graph is reachable with VoiceOver.

## Do's and Don'ts

### Do:
- **Do** put exactly one coral primary action on a screen; use outline or ghost for everything else.
- **Do** use teal only for state and ownership — selected, checked, on, yours.
- **Do** keep every interactive element at 44 pt or taller, with `hitSlop` on text-sized controls.
- **Do** write both an English and a Turkish string for every new label; the type system enforces it, and the layout must survive the longer one.
- **Do** carry new colours through both palettes in `src/theme.ts`; a screen that reads a raw hex breaks dark mode.
- **Do** keep the ambient card shadow as the only shadow, and reach for tone or a hairline when more separation is needed.
- **Do** design the empty state with the screen: muted, centred, one sentence, and the action that fills it.

### Don't:
- **Don't** introduce gradients, glassmorphism, blur panels, or texture; the ground is matte paper.
- **Don't** fill a destructive button with coral — destructive is outlined.
- **Don't** add a second typeface or a custom UI font; the system face is the voice.
- **Don't** pair small type with light weight; 13 pt and under is 800–900.
- **Don't** use `good` / `warn` as decoration — they belong to relationship health only.
- **Don't** stack cards inside cards, or place a divider inside a card; cards hold one idea.
- **Don't** hard-code light-mode hexes in a screen; read from `useTheme()`.
