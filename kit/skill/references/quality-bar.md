# The quality bar

Source: owner review 2026-11-23 (BUILDER-BRIEF "Showpiece bar"), CONTRACT §9, the gold list set 2026-11-23 14:47. Where this file is stricter than CONTRACT §9, this file wins (it came later and the brief says it "overrides softer wording").

## The pass question

> Would this sit next to the gold list in craft AND in usefulness?

Craft alone is not enough (a flashy piece nobody can drop into a site fails), and usefulness alone is not enough (a tidy demo of a good idea is a 2). Both halves, every time.

## The gold list (study these before you build)

All in `components/`. They set the level, not the style. Never copy one's look unless your concept card asks for it.

| Component | Study it for | Direction it was built to |
|---|---|---|
| `FoilTiltCard` | Spring-physics tilt, glare that tracks the pointer, a still that is already finished. The owner: "one of the best looking, behaving and on point". | Prism foil on pearl stock |
| `CardStack` | Depth, flick-to-back with arc and shadow travel, drag + click + keyboard + autoplay that pauses | Alpine morning (restyle plan: "heavy stock") |
| `EmbroideredWord` | Realism that covers the WHOLE object: canvas denim twill, chain-stitch links with twist highlights, a Verlet thread, a snip at the end. The owner: "looks amazing". Its per-letter re-sew is an owner setting (`resewOnHover`, default off). | Denim chainstitch |
| `InlineImagePillText` | Type as the image: huge display type whose words open into photos | Magazine cover |
| `SizeAgainstObjects` | A useful job done beautifully: technical line drawings, dimension lines with tabular labels, a springy re-scale | Product lab |
| `ShortlistSwipeDeck` | Stack depth, inertial swipe with rotation, thumbnails fly to a tray. Re-done 2026-11-24 after the owner found equal-weight CTAs and a weak empty state: study the new hierarchy (one primary), not the old one | Editorial stack |
| `WorldConnectionsMap` | Dark lit-dot map, arcs as light trails with comet heads, camera eases to the route | Mission control |

Known blemishes in the exemplars (do not copy): both carry an `eyebrow` prop (banned by CONTRACT §10, which came after they were built); `CardStack` keeps a hint line (the owner allowed that single exception). Run `bash scripts/check-component.sh FoilTiltCard` to see the gate flag them. The exemplars teach the polish level, the file shape and the `?worst=1` pattern; the rules in this skill beat anything they do.

## The eight items (Craft 3 needs ALL of them)

1. **Stop-the-scroll still.** At 1280 a designer would screenshot it.
   - Fails: photo + text + icon rows; a review grid; a centred object on a beige stage; two-column "visual left, list right"; a heading over a grid; a standard pricing card, a Gantt or calendar template, a template accordion.
   - Passes: the hero breaks the grid or bleeds off an edge; the date or numeral becomes the whole field (CalendarLeafEventCard's "poster night" fix).
2. **The hero carries the piece.** A big share of the composition. Zoom to 2x: form, material/light and micro-detail must still hold. Props the hero depends on must default to something real (a photo, not a grey box).
3. **Realism or stylisation, never halfway.**
   - Realistic: study the real object (stitch direction, thread twist, wax pooled edges, fold thickness, glass reflection) and cover the whole object, including how it moves and falls.
   - Stylised: commit to flat graphic shapes, no half-lit gradients pretending to be material.
   - Half-real (a real pad with a leaf that drops as a clean rectangle; a magnifier drawn like a toy) is "crude" or "kitsch".
4. **Choreographed motion.** At least 3 beats with overlap, secondary motion and physics: eased or spring, staggered, interruptible, nothing linear. Example from the owner's own list: pierce, pull, fabric dimples, thread tightens. One fade, draw or slide is a 2. Idle state should still feel alive where it fits. Reduced-motion shows a static state that is still beautiful.
5. **Composition with a point of view.** Scale contrast, depth, asymmetry, one clear focal point. If you can describe the layout as "a template", it fails.
6. **Finish.**
   - No text under 12px at 1280 or at 375. No unreadable small-caps labels.
   - A visible type scale (tight tracking on large text; body measure roughly 65-75ch where there is body text).
   - Quiet text at least 4.5:1 against its real background.
   - Aligned edges; nothing clipped at 1280, 375 or worst case (check the full height).
   - Browser surfaces themed from the palette: `::selection`, focus ring, scrollbars, `font-variant-numeric: tabular-nums` where data.
7. **Interaction and states.** One clear primary action (others ink or ghost); empty and disabled-until-meaningful states designed; effect edges soft, never clipped or hard; trigger and speed exposed as props with safe defaults; colours as real CSS properties, at most 2 plainly named root colour variables. Details: [design-standard.md](design-standard.md).
8. **Benchmark.** Capture your 1280 shot and open `FoilTiltCard`'s next to it. If yours would not also be featured on a design showcase, it is a 2.

## Scoring honestly

- Scale 1-3 only. 1 = broken or off-brief, 2 = clean and correct but plain, 3 = all eight items.
- "Clean, correct, tidy demo" is a 2. Seven components (EmbroideredWord, MatBoardFrame, PortraitCallouts, SizeAgainstObjects, ServingScaleCard, WaxSealInvite, CalendarLeafEventCard) all self-scored 3 and the owner called them "bland, too simple, lame, crude, not polished" (restyle-plan.md, "Pilot finding", 2026-11-23). Root cause: ambition plus inflated self-scores.
- Ask the second question too: "would this ship in a polished 2026 product?" Dated skeuomorphism (glossy candy controls, heavy shadows) is a 2.
- Your score is advisory. The independent QA sweep and then the owner decide. QA is a floor: TypeIndexList passed the gold-bar sweep and the owner still removed it. A QA verdict of "PASS" means "no reason to stop", not "good".

## Tiers

`tier: everyday` (about 70% of the library) vs `showpiece` (about 30%). Everyday pieces present the owner's content better; showpieces are more spectacular. Both are judged against the same eight items; an everyday piece earns its place through usefulness and finish, and still needs a point of view (a plain, correct card is a 2 whatever its tier). Source tension: CONTRACT §3 reads as if only showpieces need the full bar, while the BUILDER-BRIEF says "to score 3, ALL of these must hold". The brief is later and binding.

## What a good verdict sentence looks like

"FAIL, item 1: two-column photo-left list-right (template). Item 6: 11px chip labels at 375. Cheapest test: capture 375 and `?worst=1` again after the fix." Report only findings that change the outcome, each as "fails if ___" plus the cheapest test.
