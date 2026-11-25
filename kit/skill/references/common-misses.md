# Common misses (the hard-won list)

Every item cost a rebuild or a review round. Provenance is in a clause so you know it is real. Most are checked by `bash scripts/check-component.sh <Name>` (marked **[script]**); the rest need your eyes on captures.

## 1. Fonts: Wix catalog families only, named, never loaded **[script]**

- Name a family from [wix-fonts.md](wix-fonts.md), exactly as written: `--xx-font-display: 'Bricolage Grotesque', sans-serif;`. A look-alike is a fail (Inter Tight, Hanken Grotesk, Barlow Condensed are not in the catalog).
- No `@font-face`, no `fonts/` folder, no base64 faces in the component. Paid lesson: 39 components self-hosted via `./fonts/`, which never travelled with the paste. Paste test 2026-11-25 (BentoShuffleGallery): codegen added `@fontsource/bricolage-grotesque` imports itself, and the font picker showed the family.
- The showcase needs the face too: in `preview.tsx`, `import '@fontsource/<family>/<weight>.css'` for each weight you use (the same package codegen adds; `npm i -D @fontsource/<family>` if missing). Otherwise your captures show a system font.
- Pick the face from the art direction. A system display face (Impact, Arial Black) as the display voice is a failure, not a fallback.
- Every weight you use must exist for that family; a missing weight gets faux-bolded.

## 2. Images: curl every URL, always paint a fallback **[script]**

- Every remote default URL returns HTTP 200 (`check-component.sh` curls them). Paid lesson: a QA sweep on 2026-11-23 found dead Unsplash defaults in StoryReel and RecordCrateBrowser, and LoupeZoomImage shipped a blank photo from a 404. Subjects picked from memory had to be re-verified, then eyeballed for fit.
- Behind every image slot, paint a CSS fallback (a gradient or a tonal field in the palette) so a failed or slow load still looks designed; an empty grey box fails item 2 and item 6 of the bar.
- Use `images.unsplash.com/photo-<id>?w=<n>&h=<n>&fit=crop` (the pattern in `components/FoilTiltCard/Component.tsx`) or Wix-hosted `https://static.wixstatic.com/media/<fileName>` from `.skill/references/DEFAULT-IMAGES.md`. Source tension: BUILDER-BRIEF says Unsplash "per DEFAULT-IMAGES.md", but that file actually lists the Wix pool; CONTRACT §8 only asks for royalty-free placeholder URLs codegen can swap. Either is acceptable if verified 200.
- Give every image a meaningful `alt` (a prop, since owners translate it) or `alt=""` if decorative.
- A cut-out or keyed hero (a product on a transparent background) must be checked on the dark and the light variant of your stage; "dark-backdrop photos vanish" was a QA flag on SizeAgainstObjects.

## 3. No truncation, no clipping, no mid-word breaks

At 1280, at 375 and at `?worst=1`, check the full height of the component, not the first 900px.
- No ellipsis truncation of content, no clipped chips or tabs, no overlapping labels. The owner's QA verdicts: ClassWeekGrid "mid-word breaks", FlipFilterGrid "chips cut at 375", CubeFacesCard "truncated stat + tab ellipsis", IndexTabTeamCard "tab clipping", SunArcOpeningHours "375 chip truncation".
- Ordinary words never break mid-word. Scale type with `clamp()` and container units, let containers grow (`min-height`, never fixed `height` on text containers), wrap chip rows. Allow `overflow-wrap: break-word` only as a last resort for an absurd unbroken token in `?worst=1`.
- The worst case must not cover the hero (WaxSealInvite: "the worst-case heading covers 90%"; CustomerDotsWaffle: "worst-case legend covers dots").
- No sideways page scroll at 375. At 375 images must load and animations must advance (the capture tool emulates a real 375 viewport; a blank image there is a real bug).
- Nothing smaller than 12px at 1280 or 375 (a bar item). Seat dots or ticks that are inherently small are decoration, text is not.

## 4. Contrast: quiet text at least 4.5:1

Quiet text, captions, tags, axis labels, placeholder text and secondary lines all count. Large text (24px, or 19px bold) needs 3:1. Check text on its real background, including photos and gradients. Both states of a toggle (DayNightMenuSwitch's night state shipped "cream text on cream panel; low-contrast tag"). On coloured surfaces tint the secondary text from the surface hue, never plain grey.

## 5. Layout traps (bar item 1, 5)

- **No two-column "visual left, text right"**; no heading over a grid. The hero must break the grid or bleed off an edge.
- **No centred object on a beige stage** (SandTimeCountdown, CubeFacesCard were failed for "centred stage"). Use scale contrast and asymmetry.
- **No nested cards**: no rounded, bordered panel inside the card. Use a flush panel (ServingScaleCard's fix).
- **The card fills the frame with a point of view.** A component that fills 40% of its frame and leaves the right half empty fails (MatBoardFrame, "right half fairly empty"; ConcertinaFAQ, "empty right strip"; WaxSealInvite, "tall, mostly empty closed block"). Do not leave blank wood or blank rails (SizeFinderRuler: "ticks stop at 29 leaving blank wood").
- No template layouts: a standard pricing card, a Gantt, a calendar grid, an accordion are all failures (SeasonRibbon, RollingPriceToggle, ClassWeekGrid, ConcertinaFAQ).
- Controls must be visible and discoverable without the owner's hint text: a fan hidden until opened with a half-empty rest fails (RadialContactFan).

## 6. Realism covers the WHOLE object

If the hero is a real object, every part of it, including how it moves and falls, needs the same fidelity. A real pad with a leaf that falls as a clean rectangle is half-real and fails bar item 3. Study the object before drawing: stitch direction, thread twist, wax pooled edges, fold thickness, glass reflection. Or commit to graphic stylisation. Never halfway.

## 7. SSR safety and the portable rules **[script, partially]**

These make the code convert cleanly (CONTRACT §2; details in `.skill/references/SSR.md`).
- No `window` / `document` / `navigator` / observers at module scope or during render; use them inside `useEffect` or event handlers, with a guard. Derive the first render from props so server and client markup match (no random or time-based output in render; seed any randomness).
- No `dangerouslySetInnerHTML`.
- No `transition: all`; list the properties.
- No viewport `@media (min-width/max-width)`: size to the container (`container-type: inline-size` on the root + `@container`) or a `ResizeObserver`. (`@media (prefers-reduced-motion)` and `(hover: hover)` are fine, they are not viewport queries.)
- Every visible text comes from a prop; arrays are arrays of flat objects (no arrays inside items); flat single-class selectors; logical properties (`margin-inline`, `inset-block-start`).
- `will-change` only on the thing currently animating.

## 8. Motion and performance

- Pause animation when off-screen (`IntersectionObserver`) and honour `prefers-reduced-motion` with a static state that is still beautiful (not a blank or half-drawn frame).
- Keep the main loop cheap: animate transform/opacity/clip-path, avoid per-frame layout reads, cap canvas size to the container with `devicePixelRatio` clamped at 2. Paid lesson: MosaicDissolveSlides was "not performant (FPS)" and needed a perf fix; BentoShuffleGallery shipped "4px captions at thumbnail scale" and an indexing bug.
- Math you animate must stay finite: InkSwatchProduct shipped a NaN spring; LazySusanMenu double-rotated. Clamp springs, guard divisions, test one interrupted interaction (click twice fast).

## 9. Capture mid-motion frames yourself

Reviewers judge from what renders; a still at 6 seconds hides the choreography. Use the capture tool's click hook:
```bash
SHOT_CLICK='button' SHOT_SETTLE=4000 SHOT_AFTER_CLICK=500 \
  node scripts/shotcdp.mjs "http://localhost:5188/?c=<Name>" /tmp/<Name>-mid.png 1280
```
(SHOT_SETTLE under about 3000 can catch a cold dev server before images load.) Take at least one frame during the hero motion and one after a state change (open, flipped, night mode, an item selected).

## 10. Props that betray the contract

- Preview/test hooks as props (initial open state, forced index, demo flags) are not allowed; every prop becomes a settings-panel control (CONTRACT §2, paid lesson: ContactSheetGallery's `initialOpenIndex` and "Is Open" showed up in the panel).
- Screen-reader strings only become props if an owner would plausibly translate them; otherwise hard-code sensible aria text.
- No eyebrow prop, no hint-text prop, no replay or demo button. (Exception already granted: CardStack's hint line.)
