# The file contract

Sources: CONTRACT §2, §5, §7, §8; BUILDER-BRIEF "Build". The gold exemplars for file shape are `components/FoilTiltCard/` (meta.json shape, preview) and `components/CardStack/` (preview with `?worst=1`, rich a11y). Their style is not the template; their shape is.

## Files per component

```
components/<Name>/
  Component.tsx          React 18 + TypeScript, default export, no dependencies, no Wix imports
  Component.module.css   scoped styles + @font-face + @container + reduced-motion block
  preview.tsx            default + ?worst=1 worst case (showcase and checks render this)
  meta.json              concept card + scores + checks + status (shape below)
  PROMPT.md              GENERATED: bash scripts/build-prompts.sh <Name>. Never hand-written.
  fonts/                 woff2 for your @font-face rules (when the component names a face)
```

`PROMPT.md` is `Create a custom element called "<display_name>"...` + the settings list from `owner_settings` + the `.tsx` and `.css` in fenced blocks (CONTRACT §7; paste-tested 2026-11-23: the slim form behaves like the full prompt). It must stay in plain language: no "manifest", "props schema", "ERC", `@wix/*` or theme-token names anywhere in code comments either, since the code is embedded verbatim. After any code change, rerun `build-prompts.sh`; `check-component.sh` flags a stale or hand-edited prompt.

## Component.tsx conventions (read FoilTiltCard for a worked example)

- Export the component as `default` and its prop types by name (`export interface FoilTiltCardProps`).
- Every prop optional with a default that looks finished. Arrays are arrays of flat objects (`details: {label, value}[]`), never nested arrays or object props. Every visible string comes from a prop.
- Accept `className?: string` and join it onto the root: `className={[styles.root, className].filter(Boolean).join(' ')}`.
- Root sets `container-type: inline-size` (see `components/FoilTiltCard/Component.module.css`) and everything responds to the container with `@container (min-width: ...)`.
- Colours and fonts are CSS custom properties on the root with a component prefix (`--ft-foil`, `--cs-font-ui`), driven by props via the `style` attribute where an owner setting maps to a colour.
- Browser APIs only inside effects or handlers: the reduced-motion and in-view state pattern is at `components/FoilTiltCard/Component.tsx` lines ~85-100 (`matchMedia` and `IntersectionObserver` inside `useEffect`).
- Use `useId()` for label ids (SSR-stable), never `Math.random()` in render.

## Props = owner settings only

Studio 2 turns every prop into a settings-panel control. So:
- Expose only what an owner would plausibly change: content, colours, a speed/strength, a variant. Plain words, one concept per prop.
- No preview or test hooks: no initial open state, forced index, demo flag, debug flag. (ContactSheetGallery's `initialOpenIndex` was removed for this.) If you need a state for the preview, drive it from the URL inside `preview.tsx`, never through a prop.
- Screen-reader strings become props only when an owner would translate them; otherwise hard-code sensible aria text.
- A per-letter or per-item behaviour that some owners want is an explicit setting with a safe default (EmbroideredWord's `resewOnHover`, default off).
- No eyebrow/kicker prop (banned), no "small heading" setting, no replay/demo button, no on-screen hint line (guideline; the pause control for continuous motion over 5s is the one allowed exception, and CardStack's hint line is a granted exception). Keyboard and gesture help goes in `aria-label` or `aria-description` (see `aria-description={CARD_HELP}` on the card in FoilTiltCard).

## Required behaviour (CONTRACT §8)

- **Touch and mobile:** works with touch and at 375; gestures have a pointer equivalent.
- **Keyboard:** every interaction reachable and operable by keyboard with a visible `:focus-visible` ring that belongs to the palette.
- **Screen reader:** semantic elements first (button, dl, h3), labelled regions, `aria-hidden="true"` on decorative layers, an accessible name for every control, sensible live-region use for changing values, meaningful `alt`.
- **Reduced motion:** a `@media (prefers-reduced-motion: reduce)` block (this one is allowed; it is not a viewport query) plus a `matchMedia` check for JS-driven motion. The reduced state is static and still beautiful, and the information is unchanged.
- **Animation pauses off-screen** with `IntersectionObserver`; continuous motion over 5s gets a small, quiet pause control.
- **Re-themable colours and fonts**; looks good with default content; no external assets other than royalty-free placeholder media URLs that codegen can swap (shaders and 3D are generated in code, canvas/WebGL hand-written with no libraries).
- **60fps on a mid laptop.**

## preview.tsx pattern (`?worst=1`)

Copy this shape from `components/FoilTiltCard/preview.tsx` (or `components/CardStack/preview.tsx`):

```tsx
import { useMemo } from 'react';
import MyThing from './Component';
import type { MyThingProps } from './Component';

const worst: MyThingProps = {
  // long names, long text, many items, missing optional fields (an empty image: '')
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: '#eef0f3',                 // choose a stage that suits YOUR art direction (dark for dark pieces)
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';
  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <MyThing {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
```
The worst case must include a very long hyphenated name (40+ characters, like FoilTiltCard's), a paragraph where one sentence is expected, 3x the default item count, a missing photo (`''`) and a missing optional field. The stage background belongs to the preview only; do not paint a beige stage that the component then relies on. The showcase gallery adds the width and "Optimal / Extreme case" toggles (`site/gallery/Detail.tsx`, which appends `&worst=1`).

## meta.json (fields from `components/FoilTiltCard/meta.json`)

```json
{
  "id": "c049",
  "name": "FoilTiltCard",
  "display_name": "Foil Tilt Card",
  "category": "cards",
  "tier": "showpiece",
  "job": "one sentence: what the visitor gets",
  "visitor_action": "what the visitor does; keyboard and touch equivalents",
  "owner_settings": ["Image", "Title", "Foil color", "Tilt strength"],
  "site_types": ["store", "portfolio"],
  "mobile": "how it behaves on touch / at 375",
  "motion": "what moves, with physics, plus the reduced-motion state",
  "scores": { "concept": 3, "usefulness": 2, "uniqueness": 3, "reach": 3 },
  "checks": { "tsc": "pass", "render": "pass", "craft": "pass (3, after 1 polish pass)" },
  "craft_score": 3,
  "status": "built",
  "provenance": "original, built from a concept description",
  "studio2_tested": false,
  "art_direction": "palette, mood, material (hero only)",
  "notes": "one line: the honest known weakness, plus dated change notes"
}
```
- `category`: media | text | cards | data | controls | social | ambient. `tier`: everyday | showpiece. `id` is the concept id from the card (`research/concepts.yaml` in the PM project; not in this repo).
- `display_name`: plain words ("Foil Tilt Card"), used by `build-prompts.sh`. `owner_settings`: plain-word names that match your props; the script lowercases the first letter of each entry.
- `scores` = the card's judge scores (copy, do not invent); `craft_score` is YOUR advisory 1-3, never 4.
- `status`: `built` | `rejected:build` | `rejected:render` | `backlog`. `studio2_tested` stays `false` until the owner pastes it.
- A redesign adds a dated note ("2026-11-23: redesigned to <direction>") and rewrites `motion` and `art_direction`.
- Run `bash scripts/check-component.sh <Name>`: it fails if a required field is missing.

## Portable-rule one-liner (CONTRACT §2)

```bash
cd components/<Name> && grep -nE "dangerouslySetInnerHTML|transition:[[:space:]]*all|@media[^{]*(min|max)-width" Component.tsx Component.module.css
```
Empty means clean. (`check-component.sh` does this and more.)
