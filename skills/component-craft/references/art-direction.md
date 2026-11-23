# Art direction

Sources: CONTRACT §10 (v0.6), BUILDER-BRIEF "Contemporary polish", owner feedback 2026-11-23 16:06 ("ART-DIRECTION LAW"), the restyle plan. Newest rule wins.

## The law, in one paragraph

Give the hero moment real material and light; make everything the visitor operates contemporary and quiet. Do not default to the warm craft look. Be playful only with restraint. Realism serves the subject, never decoration. Any style (editorial, minimal, bold, warm craft, dark) is fine; dated execution is not.

## 1. Choose the direction from the use scene

Your concept card's `art_direction` line gives palette + mood. Before styling, write one sentence: who looks at this, where, under what light? That picks light or dark (not the category). Examples already in the library:

| Scene | Direction | Component |
|---|---|---|
| Evening, phone, booking | Night dial: graphite-black, mint glow | `TimeSlotTape` |
| Control-room dashboards | Mission control: dark lit-dot map | `WorldConnectionsMap` |
| Studio lighting on a product | Product lab: cool light ground, blueprint grid | `SizeAgainstObjects` |
| Recipe app | Basil: deep green panel, white type, giant numeral | `ServingScaleCard` |
| Gallery at night | Gallery night: dark slate, track-lamp cone | `MatBoardFrame` |

Diversity targets (library-wide, CONTRACT §10): at least 30% dark; serif display in at most a third; sans/grotesk is the default voice; at most a handful of warm-earned pieces; no two neighbours share a palette. Before you commit a palette, skim 3 to 5 sibling `meta.json` `art_direction` lines (`grep -h art_direction components/*/meta.json`) and pick something that is not among them.

## 2. Warm-craft is earned, not default

Banned as a default: cream/oatmeal/kraft ground + serif display + orange-brown/terracotta accent + paper grain. Allowed only when the subject IS that object (a postcard, a wax seal, an apothecary jar, a letterpress menu) and the card says why. Then it is the hero's material, not the whole component's skin: controls beside it stay flat.

## 3. Material and light: hero only

| Part | Treatment |
|---|---|
| Hero moment (the glass jar, wax seal, thread, foil, lamp cone) | Layered: base, material, light, a subtle texture. Realistic up close or deliberately graphic |
| Chips, buttons, steppers, sliders, tabs, rows, body text | Flat or near-flat fill, crisp 1px hairline, soft low shadow (offset + blur), generous spacing, refined type |
| Never | Glossy gradient pills, bevels, inner-highlight "candy" buttons, heavy drop shadows, zero-blur offset block shadows |

Read `art_direction` as palette + mood. If the card says "gloss", "embossed" or "tactile keys", apply that to the hero only. Paid lesson: the owner called AddOnChipTotal "outdated, less polished" (glossy raspberry pills, heavy shadows), and called LoupeZoomImage's magnifier, ExpandInPlaceCard's plus button and PeelCornerCard too skeuomorphic or kitsch.

## 4. Less skeuomorphic, less kitsch, less cartoonish

Playful is allowed; restraint is the point. Tests:
- Would a polished 2026 product ship this control? (A toy-like magnifier, cartoon cord, candy knob: no.)
- Does the realism serve the subject or decorate it? Decorative realism goes.
- Is the playful part one idea, executed crisply, or five?
Owner queue examples (2026-11-23 16:06): "less cartoonish (playful is ok)" for PullCordReveal, SlidingDoorPanels, StitchedCompare.

## 5. Banned (holds even if the concept card asks)

- A kicker or eyebrow label above a heading, and any "small heading" setting. Delete the label; the heading carries its own weight. (Also no section numbers like "01 / 02" unless the sequence carries information.)
- Gradient text. Emphasis comes from weight or size.
- Glass or blur as decoration (allowed only as a specific, purposeful effect such as depth of field).
- A coloured `border-left` or `border-right` wider than 1px on cards, rows or callouts.
- Hard offset shadows (`4px 4px 0`).
- Emoji or unicode glyphs as icons. Draw icons as inline SVG in one consistent stroke.
- Monospace as a "technical" costume (fine for data and measurement, e.g. `ReceiptCard`).
- A system display face (Impact, Arial Black, the platform sans) as the display voice. Source a face that matches the character and self-host it.
- Geometric masks standing in for organic contours (a circle cut-out approximating a photographed subject).
- Nested cards.

## 6. Type with intent

- A deliberate scale with obvious weight steps; display up to about 6rem; tracking no tighter than -0.04em on large text; balanced headings (`text-wrap: balance`).
- Where text is the subject, it is the image (`InlineImagePillText`).
- Self-host the faces (see common-misses.md). Pick a face that fits the scene, not the first grotesk that comes to mind.

## 7. Browser surfaces are part of the design

Theme `::selection`, `:focus-visible` ring, scrollbars (if any scroll), `accent-color`, and use `font-variant-numeric: tabular-nums` for numerals in data. This is the cheapest signal a component was built rather than assembled.

## 8. Colours and fonts as root CSS custom properties

Neutral, re-themable defaults on the root (`--ft-foil`, `--cs-font-ui` style, per component prefix) so an owner can re-theme. The defaults must look finished, not placeholder grey.

## Spectrum check (DIY vs studio owner)

A studio owner picks a direction deliberately and supplies their own imagery and brand colours. A DIY owner keeps the defaults, so the default look is the product: it must carry the art direction without any settings changed, survive 3 sparse items, and tolerate a swapped accent colour (contrast stays at least 4.5:1 for typical colours). Flag the trade-off in `meta.json` `notes` if a very dark or very saturated default will clash with many sites.
