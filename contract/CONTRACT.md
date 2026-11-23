# Build Contract (v0.5, 2026-11-23)

Every agent in this pipeline follows this file.

## 0. Goal and boundary
- **Output:** a curated set of snippets. Each one is a paste-ready prompt plus React code. A site owner (or Guy) pastes it into the AI assistant in Studio 2, and codegen builds the component and places it in the editor.
- **Audience:** the org's product owners. They browse the showcase on GitHub Pages and pick what to adopt. Every component has to make sense at a glance and show its provenance.
- **Independent project.** Nothing here changes, joins or plugs into any org repo, skill or pipeline.

## 1. Prompts are user-facing
- Use plain language only. Don't name internal concepts, packages, file conventions or tooling. Never write "manifest", "props schema", "ERC", `@wix/*`, theme-token names, or "controllers".
- Owner settings go in one list, worded as **"Settings the site owner can change"**. Codegen turns these into settings-panel controls on its own.
- Keep it short and concrete. Nothing complex or risky.

## 2. Code is React only
- One component: `Component.tsx` + `Component.module.css`. React 18 with TypeScript, no external dependencies, no Wix imports. No manifest.
- Owner settings are typed props with sensible defaults. The component never renders an owner-settings UI; it renders only what a visitor uses (play/pause, a slider handle).
- **Every prop becomes an owner setting** (Studio 2 puts each one in the settings panel). Expose only what an owner would change, and keep preview or test hooks (an initial open state, a forced index) out of the props. The coding agent may add more settings, which is fine.
- **Guideline (not a gate): no extra controls or explainer text inside the visual.** No replay or demo buttons, and no hint lines like "drag to tilt". The interaction itself is the affordance. Keyboard and gesture help goes in `aria-label`/`aria-description`, never on screen. The one exception is a pause control for motion that runs continuously for more than 5s, which accessibility requires. Keep it small and quiet.
- Design it to convert cleanly. The codegen skill (`wix-private/editor-react-component-creation-skills` @`517e0bb`, synced read-only into `.skill/`) is a reference for build agents only. Follow its portable rules:
  - SSR-safe: deterministic render, no browser globals during render
  - No `dangerouslySetInnerHTML`
  - Every visible text comes from a prop
  - Arrays of flat objects, not nested
  - Flat single-class CSS selectors, logical properties, no viewport `@media` (size to the container)
  - No `transition: all`
- Colors and fonts are CSS custom properties on the root with neutral defaults, so they can be re-themed.

## 3. What qualifies (curation layer)
A concept must pass the 4 checks in the scouting guidelines: one job, reusable, swappable content, doesn't own the layout. It must also score at least 9/12 with no axis at 1, and hit none of the red flags.

Two quality scores, judged at different stages:
- **Concept** (replaces Appeal at curation): is the idea striking enough to grab attention in 3 seconds? Scored from the concept card.
- **Craft** (scored on our build, from screenshots): does it meet the finesse bar (§9)? **Ship only at Craft 3.** At Craft 2 it gets one polish pass, then goes to the backlog.

Mix target: about 70% polished everyday pieces, 30% showpieces. Sources: any showcase (21st.dev showpiece tier, Awwwards, Godly, Codrops). Judge a source by its best items. Concepts only ever travel as text.

## 4. Concept card (the only input a build agent gets; never third-party code)
```yaml
name: BeforeAfterSlider        # PascalCase, ≤30 chars
category: media                # media|text|cards|data|controls|social|ambient
job: Compare two images by dragging a divider
visitor_action: drag the handle (keyboard: arrow keys)
owner_settings: [Before image, After image, Before label, After label, Start position, Divider color]
site_types: [portfolio, business, store]
mobile: touch-drag, full width
art_direction: <palette, mood, material>
motion: none | <what moves> (reduced-motion: <static state>)
tier: everyday | showpiece
scores: {concept: 3, usefulness: 3, uniqueness: 3, reach: 3}
```

## 5. Deliverables per component (`components/<Name>/`)
| File | Purpose |
|---|---|
| `Component.tsx`, `Component.module.css` | The React code |
| `PROMPT.md` | **The main deliverable:** the paste-ready prompt with the code embedded (§7) |
| `preview.tsx` | Local render with default and worst-case content, for the showcase and the checks |
| `meta.json` | Concept card + scores + check results + status + `provenance: "original, built from a concept description"` + `studio2_tested` |

## 6. Gates and caps (no open loops)
| Stage | Check | Cap |
|---|---|---|
| Build | `tsc`; a lint pass for the portable rules in §2 | **1** fix attempt, then `rejected:build` |
| Render | Screenshots at 1280 and 375 px; no console errors; no sideways scroll; reduced-motion screenshot | **1** fix attempt, then `rejected:render` |
| Craft | Craft score from the screenshots against §9 | Craft 2 → **1** polish pass; still below 3 → `backlog` |
| Studio 2 paste test | Guy pastes `PROMPT.md` into the AI assistant; 2–3 sampled per batch. Pass = it builds, looks like the preview, owner settings show in the settings panel and not on the element | If one fails, fix the template once per batch |
| Human | Guy spot-checks each batch | Batch stops if more than 30% fail |

Batch size is 20. Stop for review after every batch. The budget is set per batch, and an overrun stops the batch.

## 7. Prompt template (`PROMPT.md`)
The coding agent works from the code, so the prompt is the intent, the must-have settings and the code. Don't describe in words what the code already shows. Generated by `scripts/build-prompts.sh` from `meta.json` (`display_name`, `owner_settings`) and the code.
```
Create a custom element called "<Display Name>". Build it exactly as this React reference (same look, behavior and defaults).

The site owner must be able to change: <owner_settings>. Add other settings if they help.

<Component.tsx>
<Component.module.css>
```
Paste-tested 2026-11-23: the slim prompt and the full prompt gave the same result on ContactSheetGallery.

## 8. Quality bar
Works with touch and on mobile · has a reduced-motion fallback · keyboard and screen-reader support · re-themable colors and fonts · looks good with the default content · no external assets (shaders and 3D are generated in code) · default media from royalty-free placeholder URLs, which codegen can swap.

## 9. Finesse bar (Craft 3)
Reference level: award-winning homepages and the 21st.dev showpiece tier. A plain demo of a good idea is Craft 2.
1. **One hero moment.** A single focal effect per component, not a row of equal widgets.
2. **Real materials and depth.** Layer the effect: base, material (glass, chrome, soft 3D, paper), light (glow, highlight, shadow). Never a single flat fill.
3. **A texture layer.** Grain, blur, pixel mosaic, noise or chromatic fringe, kept subtle.
4. **Type with intent.** A deliberate scale, with tight tracking on large text. Where text is the subject, it is the image.
5. **Art direction.** A limited palette (2–3 colors plus neutrals), deliberate lighting, confident empty space. The defaults must look finished, not placeholder-grey.
6. **Motion with physics.** Eased or spring motion, staggered, and interruptible. Nothing linear. Idle state still feels alive where it fits.
7. **Budget.** 60fps on a mid laptop; pause when off-screen; canvas/WebGL hand-written (no libraries); static, still-beautiful reduced-motion state.
8. **Own art direction.** Each concept card carries an `art_direction` line (palette, mood, material). No two neighbours in a batch share a palette.
9. **Self-check.** The builder screenshots its own preview (1280 and 375 px, plus `?worst=1`), checks it against this list and fixes once. No component is handed back unseen.

Build agents also read the codegen skill's `references/VISUAL-QUALITY.md` (synced into `.skill/`).
