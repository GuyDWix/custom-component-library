# Design standard (distilled from the owner's feedback, 2026-11-22 to 2026-11-24)

Read with [quality-bar.md](quality-bar.md). The bar says how good; this says what good means. Every point cost a rebuild.

## What good is

1. **One hierarchy, one primary action.** One accent for the primary; secondary actions are ink or ghost. Equal-weight buttons fail. (ShortlistSwipeDeck: Enquire cobalt, Keep ink, Skip ghost.)
2. **Every state is designed:** empty, disabled until meaningful, loading, worst case. (Shortlist: Enquire disabled until one item is kept; the empty state was called bad.)
3. **A unique mechanism with real value to the visitor.** A generic table, bar list or card grid is a fail even when tidy. (DiffCompareCard became "Balance": tilting beam, priority chips, verdict.)
4. **The preview shows only the component.** No owner or sample content, hints, replay buttons or scaffolding. (BlackHoleIntro preview: stars only; `children` come from the owner.)
5. **Triggers and speeds are props with good defaults**; the default is the safe one (click over hover). (SunArcOpeningHours `selectTrigger`, FoldedPaperHeadline `foldTrigger`, SignOffSignature `speed`.) **Colours are never props**: they sit on real CSS properties, so Studio 2 gives the owner its own Background/Text panels ([art-direction.md](art-direction.md) §8).
6. **Motion follows physical logic.** The sun sinks fully below the horizon when closed; ground shadows stay planted while photos swing; a stalled autoplay is a bug.
7. **Effects feel premium, and add to the content.** Soft falloff, no hard or visible edges, no clipped glow, no overlay that covers the content. (WatercolourWashField: the cursor adds faint colour; ScanStrip beam: full-height plateau, steep tip fade, particles on the incoming photo side; MosaicDissolveSlides: hard block edges.)
8. **Inspired by a reference? Read its real source first** and keep the powerful technique; never simplify it away, never copy its code. (ScanStrip, BlackHoleIntro, ElectricFrame; see process.md.)
9. **Not cheap or dated.** Depth, 3D and sheen are fine when intentional (SundialShadowHeadline, FoilTiltCard, CubeFacesCard). Bad: CSS-imitated wood, fabric or weave, bevels, plastic gloss, cartoon proportions, ring or bubble particles, an object drawn halfway.
10. **Type and composition are designed with the effect**, not arranged afterward. One named direction, at most 3 colours plus neutrals.
11. **DIY owner first.** Good defaults from content props alone; finished with 3 items and with 20; a missing image still looks designed. Designers get speed and size props, and colours through Studio 2's own panels.
12. **Accessible by default:** keyboard, focus-visible, reduced motion with a designed static state, 375px, 4.5:1 on the real background.
13. **Report only what you verified.** Builders over-claimed (components reported done, then listed "unverified" for 375, reduced motion, real drag). Label each claim VERIFIED (how) or UNVERIFIED.

## What is bad (quick scan)

- Generic table or bar look; equal-weight CTAs; no empty or disabled state.
- Hard edges, visible seams, clipped glow, an effect that overlays instead of adds.
- Bubble or ring particles; particles on the wrong side of the motion.
- Sample or owner content baked into the preview; hover-only triggers with no setting.
- CSS-imitated materials; cartoon or kitsch objects; "AI-slop" template styling.
- A simplified imitation of a reference technique.
- A "done" report with no evidence from this turn.
