# Checklists

Run these as written. Replace `<Name>` with your component. Tick items with evidence (a frame you looked at, a command you ran), not belief.

## A. Concept to shipped (worked checklist)

**Prepare**
- [ ] Read `SKILL.md`, `contract/CONTRACT.md` §2, §5, §7, §8, §9, §10, and `.skill/references/VISUAL-QUALITY.md` (run `bash scripts/sync-skill.sh` first if `.skill/` is missing; skip it and say so if you have no `gh` access).
- [ ] Open the gold list in the browser (`npm run dev`, `http://localhost:5188/?c=FoilTiltCard`, `CardStack`, `EmbroideredWord`, `WorldConnectionsMap`, ...). Calibrate your eye to their level.
- [ ] Read your concept card. It is the only design input. Note its `art_direction`, `tier`, `owner_settings`.
- [ ] Write the use-scene sentence: who looks at this, where, under what light (picks light/dark). Run `grep -h art_direction components/*/meta.json` and confirm your palette is not a neighbour's.
- [ ] Write the hero-moment sentence: what is the ONE focal effect, and what are its 3+ motion beats?

**Scaffold (shared-server safety)**
- [ ] `mkdir components/<Name>` and write the stub `preview.tsx` (`export default function Preview() { return null; }`).

**Build**
- [ ] `Component.tsx`: typed props with finished-looking defaults, arrays of flat objects, all text from props, `className` on the root, no browser globals in render.
- [ ] `Component.module.css`: colours on real CSS properties (≤2 plainly named root colour vars, nothing internal on the root), `container-type: inline-size`, `@container` for responsiveness, fonts named from `wix-fonts.md` with no `@font-face`, `:focus-visible` ring, `::selection`, reduced-motion block.
- [ ] Hero has material and light; controls are flat with hairlines and soft low shadows. No eyebrow, no warm-craft default, no nested cards.
- [ ] Motion: 3+ beats, spring/eased, staggered, interruptible; `IntersectionObserver` pause; `matchMedia` reduced-motion static state.
- [ ] After EVERY edit: `npx tsc --noEmit 2>&1 | grep "components/<Name>/"` is empty.

**Wire**
- [ ] Replace the stub with the real `preview.tsx` (default + `?worst=1`). Re-run tsc.
- [ ] Fill `meta.json` (all fields, honest `notes`, `craft_score` provisional, `status: built`).

**Verify yourself**
- [ ] `bash scripts/check-component.sh <Name>` shows no FAIL (fonts loaded, URLs 200, portable rules, meta fields).
- [ ] `bash scripts/shot.sh <Name> /tmp/<Name>-shots`: LOOK at `-1280`, `-375`, `-worst`, `-reduced`. Then one mid-motion frame with `SHOT_CLICK`.
- [ ] Run section B (QA checklist) against those frames. Fix what one look shows, then look again (at most one fix per gate).
- [ ] Benchmark: open your 1280 beside FoilTiltCard's. If it would not be featured beside it, it is a 2: one polish pass, else `status: backlog`.

**Finish**
- [ ] `bash scripts/build-prompts.sh <Name>`, then `bash scripts/check-component.sh <Name>` again (PROMPT freshness).
- [ ] Report in 12 lines: status, craft score (advisory), gates, frames, PROMPT.md bytes, one honest weakness. Do not commit unless told to.
- [ ] Hand off to the independent QA sweep and then the owner's gallery review. If either fails you: at most 2 fix rounds, then backlog.

## B. QA checklist (the 8 items + the misses; use on captured frames)

**Bar items (all 8 must hold for Craft 3)**
- [ ] 1. Stop-the-scroll still at 1280: a designer would screenshot it. Not photo+text+icon rows, a review grid, a centred object on a beige stage, a two-column visual-left/list-right, a heading over a grid, or a template (pricing card, Gantt, calendar, accordion).
- [ ] 2. The hero carries the piece: a big share of the composition, still convincing at 2x zoom.
- [ ] 3. Realism or stylisation, never halfway: the WHOLE object is consistent (including how it falls, folds, moves).
- [ ] 4. Choreographed motion: 3+ beats with overlap and physics, not one fade/draw/slide.
- [ ] 5. Composition with a point of view: scale contrast, depth, asymmetry, a focal point.
- [ ] 6. Finish: no text under 12px (1280 and 375), type hierarchy obvious, edges aligned, browser surfaces themed.
- [ ] 7. Interaction and states: one primary action, empty/disabled states designed, soft effect edges, trigger/speed props with safe defaults, colours on real CSS properties.
- [ ] 8. Benchmark: beside FoilTiltCard's 1280 shot it would also be featured.
- [ ] Usefulness: an owner could drop it into a real site with their content and it still works (not a flashy demo nobody can use).

**Art-direction law**
- [ ] No warm-craft default (cream + serif + orange-brown + paper grain) unless the subject IS that object.
- [ ] Material and light on the hero only; chips, buttons, rows, steppers, body text are flat/near-flat with hairlines.
- [ ] Not over-skeuomorphic, not kitsch or cartoonish (no toy-like controls, no candy gradients, no heavy shadows).
- [ ] No eyebrow/kicker (also no "small heading" prop), no gradient text, no decorative glass/blur, no coloured side-border over 1px, no hard offset shadow, no emoji/unicode icons, no monospace costume.
- [ ] Palette differs from neighbours; light/dark fits the use scene.

**Misses**
- [ ] Every font family is in `wix-fonts.md`, nothing is loaded in the component, and `preview.tsx` imports its `@fontsource` package (the script checks for `@font-face`).
- [ ] Paste-safe contract (SKILL.md) holds: no dependencies, every prop a setting with a default, all visible text from props.
- [ ] Every remote URL returns 200; every image slot has a CSS fallback; the 375 capture shows images.
- [ ] No truncation, ellipsis, clipped chips/tabs, overlapping labels or mid-word breaks at 1280, 375 and `?worst=1`, full height checked; the worst case does not cover the hero.
- [ ] Quiet text is at least 4.5:1 on its real background, in every state (day/night, hover, selected).
- [ ] The card fills the frame with a point of view: no empty half, no blank rails, no centred stage; no nested cards.
- [ ] SSR/portable: no `window`/`document` in render, no `dangerouslySetInnerHTML`, no `transition: all`, no viewport `@media`.

**Contract and behaviour**
- [ ] Props are owner settings only: no test/preview hooks, no hint or replay controls on screen.
- [ ] Keyboard operable with a visible themed focus ring; screen-reader names, roles, `aria-hidden` on decoration; touch works.
- [ ] Reduced-motion frame is static and still beautiful; animation pauses off-screen; continuous motion over 5s has a quiet pause.
- [ ] `meta.json` complete (honest `notes`), `PROMPT.md` generated by `scripts/build-prompts.sh` and fresh.

**Verdict rules**
- Report only findings that change the outcome, each as "Fails if ___" plus the cheapest test and the frame.
- QA PASS means "no reason to stop", not "good"; the owner's eye is the standard.
