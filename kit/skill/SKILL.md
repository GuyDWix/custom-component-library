---
name: component-craft
description: Build, redesign or review a component in the custom component library (components/<Name>/) to the owner's showpiece bar. Use whenever you create or change a component from a concept card, fix a component after feedback, run a QA sweep, or are asked "does this meet the bar". Encodes the quality bar, the art-direction law, the hard-won misses list, the build process and the file contract.
---

# Component Craft

You are building ONE component of a curated library: plain React 18 + TypeScript + a CSS module, no dependencies. A site owner pastes it into an AI assistant and a page gets built from it. The audience browsing the showcase is product owners picking what to adopt, so every piece must be striking at a glance and useful in a real site.

**Your work is judged by the owner's eye, not by a checklist.** The checks below are a floor. Self-scores were inflated all through this project (components that self-scored "Craft 3" were called bland, crude, lame; a QA sweep passed one the owner then asked to remove). Distrust your own score; look at the render.

Last verified against the project record: 2026-11-24.

## The 4 rules that decide most outcomes

1. **Would it sit next to the gold list in craft AND usefulness?** `CardStack`, `EmbroideredWord`, `FoilTiltCard`, `InlineImagePillText`, `SizeAgainstObjects`, `ShortlistSwipeDeck`, `WorldConnectionsMap` (all in `components/`). If a designer would not screenshot yours beside them, it is a 2 and does not ship. Details: [references/quality-bar.md](references/quality-bar.md).
2. **Material and light on the hero moment only; contemporary flat UI everywhere else.** No warm-craft default, no eyebrows, less skeuomorphic, less cartoonish. Details: [references/art-direction.md](references/art-direction.md).
3. **Know what "good" means here.** One primary action, designed empty/disabled states, a unique mechanism with real value, soft premium effects, props for triggers and speeds (colours are root CSS variables, never props), a preview with only the component. Read [references/design-standard.md](references/design-standard.md) before you build.
4. **Nothing ships unseen, and you report only what you verified.** Capture your own render at 1280, 375 and `?worst=1`, and look at every frame before you report. Every default image URL returns 200 and has a CSS-painted fallback. Details: [references/common-misses.md](references/common-misses.md).

## Paste-safe contract (hard gate)

The owner pastes `PROMPT.md` (only the `.tsx` and `.css`) into Studio 2, and codegen rebuilds the component from it. Break one of these and the paste fails or comes out different from the preview. No exceptions, no craft trade-off.

1. **React 18 and TypeScript, no dependencies.** No npm imports in `Component.tsx` or its CSS, no Wix imports, no external files (no `./fonts/`, no local images).
2. **Every prop is an owner setting, with a default.** Each prop becomes a settings-panel control, so no preview or test hooks. Every prop is optional and its default looks finished.
3. **Every visible text comes from a prop.** Include `alt` text and any label a visitor reads. Only aria help nobody would translate may be hard-coded.
4. **Colours and fonts as CSS variables** on the root (`--ft-foil`, `--cs-font-ui`), with neutral defaults.
5. **Fonts are Wix catalog families only, named, never loaded.** Pick from [references/wix-fonts.md](references/wix-fonts.md). No `@font-face`, no `fonts/` folder, no base64 faces. Codegen loads the face itself (paste test 2026-11-25: it added `@fontsource/bricolage-grotesque` imports and the font picker showed the family). For the showcase, `preview.tsx` imports the same Fontsource package.
6. **Size to the container, no viewport media queries.** Set `container-type: inline-size` on the root and use `@container`. `@media (prefers-reduced-motion)` and `(hover: hover)` are fine.
7. **No browser globals while rendering.** `window`, `document`, `navigator` and observers belong only inside `useEffect` or handlers. Use `useId()`, never `Math.random()`, in render.
8. **Placeholder images from royalty-free URLs.** Use Unsplash or `static.wixstatic.com`, each verified 200, with a CSS fallback behind it, so codegen can swap them.

Also portable (CONTRACT §2): no `dangerouslySetInnerHTML`, no `transition: all`, arrays of flat objects, flat single-class selectors, logical properties. `check-component.sh` checks most of this; the rest is in the QA checklist.

## Where things are

| What | Where |
|---|---|
| Build rules (binding: §2, §5, §7, §8, §9, §10) | `contract/CONTRACT.md` |
| This skill's depth | `skills/component-craft/references/*.md` |
| Mechanical gate for one component | `bash scripts/check-component.sh <Name>` |
| Screenshots (needs `npm run dev`, port 5188) | `bash scripts/shot.sh <Name> <scratch-dir>` |
| Regenerate the paste prompt | `bash scripts/build-prompts.sh <Name>` |
| Portable-rule detail (SSR, canvas, animation, default images, visual quality) | `.skill/references/` (synced read-only copy of the Wix codegen skill; it is git-ignored, so run `bash scripts/sync-skill.sh` once per clone; needs `gh` access). Portable rules only; ignore its manifest/Wix specifics. |
| Preview a component | `http://localhost:5188/?c=<Name>` and `&worst=1` |

`.skill/` is NOT where this skill lives: `scripts/sync-skill.sh` overwrites `.skill/SKILL.md` with the upstream file on every run and `.skill/` is git-ignored, so anything written there is lost and never reaches anyone else. This skill is tracked in git. Read `.skill/references/VISUAL-QUALITY.md` (CONTRACT §9 points at it) plus `SSR.md`, `DEFAULT-IMAGES.md`, `ANIMATED-COMPONENTS.md` / `CANVAS-COMPONENTS.md` when they match your component.

## Authority order when sources disagree

1. The owner's latest words. Gallery feedback is distilled in [references/design-standard.md](references/design-standard.md) and the references; the PM-ledger files (`GUY-FEEDBACK-1606.md`, `ROUND*-BRIEF.md`, BUILDER-BRIEF) live outside this repo and are absent in other worktrees, so rely on the references and on what your task prompt attaches.
2. This skill (it merges everything below, newest rule wins).
3. `contract/CONTRACT.md` v0.6 sections §2, §5, §7, §8, §10, then §9.
4. Impeccable's craft floor (`~/.claude/skills/impeccable/reference/craft-floor.md`) when you have it.

Known conflict, already resolved: CONTRACT §9.2-9.3 say "never a single flat fill, always a material and a texture layer". The owner later narrowed that (CONTRACT §10, 2026-11-23) and then said less skeuomorphic over-design (2026-11-23 16:06). Rule: layer material, light and texture on the hero only.

## The quality bar (Showpiece bar, 2026-11-23; ALL 8 must hold for Craft 3)

1. **Stop-the-scroll still.** At 1280 a designer would screenshot it. Photo + text + icon rows, a review grid, a centred object on a beige stage, or a two-column "visual left, list right" layout is a 2.
2. **The hero carries the piece.** Big share of the composition; holds up at 2x zoom (form, material/light, micro-detail).
3. **Realism or stylisation, never halfway.** An object hero is convincing up close (stitch direction, thread twist, wax pooled edges, fold thickness, glass reflection) or deliberately graphic. Halfway reads "crude".
4. **Choreographed motion.** At least 3 beats with overlap, secondary motion and physics (pierce, pull, fabric dimples, thread tightens). One fade, draw or slide is a 2.
5. **Composition with a point of view.** Scale contrast, depth, asymmetry, one focal point. Not a template.
6. **Finish.** No text under 12px at 1280 or 375, no unreadable small-caps labels, obvious type hierarchy, aligned edges, browser surfaces themed (selection, focus ring, scrollbars, tabular numerals for data).
7. **Interaction and states.** One clear primary action, designed empty/disabled states, soft effect edges, trigger/speed props with safe defaults, colours as root CSS variables ([design-standard.md](references/design-standard.md)).
8. **Benchmark.** Put your 1280 shot beside `FoilTiltCard`'s. Both featured on a design showcase? If yours is weaker, it is a 2.

Craft scale is 1-3 (never 4; a builder once wrote 4). A clean, correct component is a 2. Ship only at 3; a 2 gets one polish pass, then `backlog`. FoilTiltCard is the level of polish, not the style: never copy its holo/pastel/glass look unless your card asks for it.

## The art-direction law (owner, 2026-11-23)

- **No warm-craft default** (cream/oatmeal/kraft + serif display + orange-brown/terracotta + paper grain), unless the subject IS that object and the card says why. The library once read as one "Claude" world: 25/33 warm accents, 31/33 serif, 13/33 eyebrows (VERIFIED scan, 2026-11-23).
- **Material/light on the hero moment only.** Controls, chips, buttons, steppers, tabs, rows, body text: flat or near-flat fills, crisp hairlines, soft low shadows, generous spacing. No glossy pills, bevels, inner-highlight candy buttons or heavy drop shadows.
- **Less skeuomorphic over-design, less kitsch/cartoon.** Playful is OK when restrained; realism serves the subject, not decoration. (Paid lesson: LoupeZoomImage's magnifier, ExpandInPlaceCard's plus button, PeelCornerCard, PullCordReveal, SlidingDoorPanels, StitchedCompare were all called kitsch or over-designed.)
- **Eyebrows/kickers are banned**, including a "small heading" setting. Also banned: gradient text, glass/blur as decoration, coloured `border-left`/`border-right` over 1px, hard offset shadows, emoji/unicode glyphs as icons, monospace as a "technical" costume.
- **Diversity:** at least 30% of the library dark, serif display in at most a third, sans/grotesk is the default voice, no two neighbours share a palette. Pick light or dark from the use scene (who, where, under what light), not from the category. Read `art_direction` as palette + mood, never as literal gloss.

## Common misses (each cost a rebuild; full list with checks in the reference)

- **A font outside the Wix catalog, or one the showcase never loads.** A look-alike (Inter Tight, Hanken Grotesk, Barlow Condensed) is a fail; check the exact name in [references/wix-fonts.md](references/wix-fonts.md). A family `preview.tsx` does not import renders as a system font in your captures. Paid lesson: Batch A (2026-11-23) sent components back over unloaded faces, and the self-hosted fix (`fonts/`, 39 components) never travelled with the paste.
- **Dead image URLs.** `curl` every remote URL for 200, and paint a CSS fallback behind every image. Paid lesson: dead Unsplash defaults shipped blank in LoupeZoomImage, StoryReel, RecordCrateBrowser.
- **No truncation, ellipsis or mid-word break** at 375 or in `?worst=1`; check full height, not the first 900px.
- **Quiet text at least 4.5:1** on its real background.
- **Layout traps:** no two-column visual-left/text-right, no heading over a grid, no centred object on a beige stage, no nested cards. The card fills the frame with a point of view; the hero breaks the grid or bleeds off an edge.
- **Realism covers the WHOLE object** (a real pad with a leaf that falls as a clean rectangle is half-real).
- **Any break of the paste-safe contract** above.

## The process (concept to shipped)

1. **Concept card is your design input** (CONTRACT §4), plus the real source of any reference it names: read it first, keep its techniques, never copy its code (process.md step 1).
2. **Stub `preview.tsx` FIRST.** The showcase eagerly imports every `components/*/preview.tsx`; a syntax error in yours breaks the page for everyone building. Keep the stub until `Component.tsx` passes tsc.
3. **Build** `Component.tsx` + `Component.module.css`.
4. **tsc gate per folder after EVERY edit:** `npx tsc --noEmit 2>&1 | grep "components/<Name>/"` (empty = pass; ignore other folders).
5. **Write the real `preview.tsx`** (default + `?worst=1`), then `meta.json`.
6. **Self-verify with your own headless captures:** `bash scripts/check-component.sh <Name>`, then `bash scripts/shot.sh <Name> <scratch-dir>` and LOOK at all four PNGs plus one mid-motion frame. Fix, re-capture.
7. **Independent QA sweep** (a different agent; it needs rendered frames, so use a general-purpose agent with captures, never a reviewer that cannot render). It judges against the 8 bar items and the misses list. **QA is a floor; the owner's eye is the standard** (TypeIndexList passed QA, the owner removed it).
8. **Feedback-fix cycles with a circuit breaker:** at most 2 rounds per component, with the owner's screenshot or words attached. Still below the bar after round 2 means `status: backlog`. Never loop forever.
9. `bash scripts/build-prompts.sh <Name>` last. Full detail, model and token rules: [references/process.md](references/process.md).

## The file contract (`components/<Name>/`)

| File | Rule |
|---|---|
| `Component.tsx` | One default-exported component; typed props with defaults; exports its prop types |
| `Component.module.css` | Flat single-class selectors, logical properties, CSS custom properties on the root for colours/fonts |
| `preview.tsx` | Default content, plus `?worst=1` worst case (long names, long text, many items, missing optional fields), plus `import '@fontsource/<family>/<weight>.css'` for each face. Copy `components/FoilTiltCard/preview.tsx` |
| `meta.json` | Fields of `components/FoilTiltCard/meta.json` (template in the reference) |
| `PROMPT.md` | ONLY from `bash scripts/build-prompts.sh <Name>`. Never hand-written. |

Props and fonts: see the paste-safe contract. No on-screen hint text or replay/demo buttons (guideline; the one exception is a small, quiet pause control for motion running over 5s). Keyboard, screen reader and reduced-motion are REQUIRED; animation pauses off-screen (`IntersectionObserver`). Detail and templates: [references/file-contract.md](references/file-contract.md).

## Checklists

[references/checklists.md](references/checklists.md) has the worked concept-to-shipped checklist and the QA checklist (the 8 bar items + the misses list). Use them as written.

## Think in spectrums

Before you finish, ask: does this work for the casual DIY site owner as well as a studio? A DIY owner has less content (sparse or missing images), edits few settings, and will not fix a broken default. Defaults must look finished with 3 items and with 20; a missing image must still look designed.
