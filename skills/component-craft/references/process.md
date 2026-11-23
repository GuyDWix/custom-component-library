# The process

Sources: CONTRACT §4, §6; BUILDER-BRIEF; REDESIGN-TASK; decisions 2026-11-22/23 (model rule, pipeline v3, budget stop). Paths are relative to the repo root (`FED/custom-component-library`) unless noted.

## Roles

- **Owner** (the product owner who judges the gallery): the standard. Their screenshot or words beat every score.
- **Builder** (you, or an agent): builds one component in `components/<Name>/` only.
- **QA agent**: a different agent, one sweep per wave of 8, judging captured frames against the bar. It is a floor.
- **Orchestrator**: assigns concepts and directions, launches builders, runs the fix queue, owns commits.

## Step by step

1. **Input = concept card only** (CONTRACT §4: name, category, job, visitor_action, owner_settings, site_types, mobile, art_direction, motion, tier, scores). Never look up, copy or adapt third-party code; a similar-looking public demo is reference at most for what "photoreal" means (the owner allowed one visual reference for EmbroideredWord: look only, no code).
2. **Stub `preview.tsx` first.** `site/main.tsx` eagerly globs every `components/*/preview.tsx`; one syntax error breaks the page for every concurrent builder. A stub:
   ```tsx
   export default function Preview() { return null; }
   ```
   Keep it until `Component.tsx` passes tsc. If another component's error shows up, wait about 30s and retry; never touch their folder.
3. **Build** `Component.tsx` + `Component.module.css` against the bar and law (SKILL.md). Touch only your folder (and a scratch folder for screenshots, outside the repo). Do not commit, do not switch branches, do not start or stop the shared dev server.
4. **tsc gate per folder, after every edit:**
   ```bash
   npx tsc --noEmit 2>&1 | grep "components/<Name>/"     # empty = pass
   ```
5. **Write the real `preview.tsx`** (default + `?worst=1`), fill `meta.json`.
6. **Mechanical gate:** `bash scripts/check-component.sh <Name>`: tsc, portable-rule greps, never-loaded fonts, URL 200s, meta fields, PROMPT freshness. One fix attempt, then `rejected:build`.
7. **Self-verify with your own captures** (needs `npm run dev`; port 5188):
   ```bash
   bash scripts/shot.sh <Name> /tmp/<Name>-shots      # -1280, -375, -worst, -reduced PNGs + console errors
   ```
   LOOK at all four with an image viewer, plus one mid-motion frame (common-misses.md section 9). Check: sideways overflow at 375, clipped or overlapping text in worst case, blank canvas or image, console errors, reduced-motion frame not blank. One fix attempt, then `rejected:render`.
8. **Score yourself 1-3 against the 7 items**, honestly, then benchmark beside `components/FoilTiltCard/`. A 2 gets ONE polish pass, re-shoot, re-score; still below 3 means `status: backlog`.
9. **Independent QA sweep** (below).
10. **Feedback-fix cycle with a circuit breaker** (below).
11. **`bash scripts/build-prompts.sh <Name>`** when the code is final (and again after every later code change). Never hand-edit `PROMPT.md`.
12. **Studio 2 paste test** (owner pastes `PROMPT.md` into the AI assistant; 2-3 sampled per batch): pass = it builds, looks like the preview, owner settings appear in the settings panel and not on the element. Batch stops if more than 30% fail; fix the template once per batch.

## Gates and caps (CONTRACT §6): no open loops

| Stage | Check | Cap |
|---|---|---|
| Build | tsc + portable rules | 1 fix, then `rejected:build` |
| Render | 1280, 375, `?worst=1`, reduced motion; no console errors; no sideways scroll | 1 fix, then `rejected:render` |
| Craft | 7 items | Craft 2 gets 1 polish pass, then `backlog` |
| Paste test | owner, sampled | fix template once per batch |
| Human | owner spot-check | batch stops above 30% fail |

Batches are 20 at most; stop for review after each batch; an overrun of the budget stops the batch. Status values: `built` | `rejected:build` | `rejected:render` | `backlog`.

## The independent QA sweep

Why: builders judge their own work too kindly, and a blind reviewer without a renderer judged motion from code and got it wrong ("independent reviewers had no browser, so motion was partly judged from code", restyle-plan 2026-11-23). So:
- Use a general-purpose agent that can run `scripts/shot.sh` and read PNGs. (The `impeccable-finish-reviewer` agent cannot render; do not use it for this.)
- One agent per wave, looking at the frames of up to 8 components. Capture is cheap; the looking is the cost.
- It also runs `bash scripts/check-component.sh <Name>` per component (this is how the 3 dead Unsplash defaults were caught before the owner saw them).
- It judges against: the 7 bar items, the common-misses list, and the question "would this sit next to the gold list in craft AND usefulness?". It must also flag over-skeuomorphism and cartoonish execution (art-direction law).
- Verdict per component: PASS / FAIL, each failure as "Fails if ___" plus the cheapest test and the frame it saw. An adequate component needs no changes; do not pad.
- **Remember what QA is:** several QA PASSes were owner fails (TypeIndexList; the owner asked to remove it). PASS means "no reason to stop", not "shipped". The owner's gallery review is the final gate.

QA prompt skeleton:
```
You are the QA sweep. Components: <A, B, C...>. Repo: <path>. For each: run scripts/check-component.sh,
then scripts/shot.sh into <scratch>, and view all four PNGs. Judge against skills/component-craft/references/quality-bar.md
and common-misses.md. Pass question: would it sit next to CardStack, EmbroideredWord, FoilTiltCard,
InlineImagePillText, SizeAgainstObjects, ShortlistSwipeDeck, WorldConnectionsMap in craft AND usefulness?
Also flag over-skeuomorphic or cartoonish execution and any warm-craft default without a reason.
Return PASS/FAIL per component; for each FAIL: "Fails if ___", the frame, the cheapest test. No praise, no padding.
```

## Fix cycles and the circuit breaker

- A failing component goes back to a builder (same model tier) with the evidence attached: the captured frame or the owner's screenshot plus the owner's words, taken literally. Evidence beats re-description (the 10 screenshot-driven redos on 2026-11-23 found real root causes: dead URLs, a NaN spring, a double rotation, clipped hems).
- **Maximum 2 rounds per component.** Round 1: fix the evidence. Round 2 ("final round"): composition. Still below the bar means `status: backlog`. Never loop forever, never re-run a sweep to fish for a pass.
- Redesigns (the owner says "bland", "samey") replace the look; they do not nudge it. A palette swap alone gives a tidy demo (VERIFIED, pilot 2026-11-23). Keep the job, the props (unless the spec says otherwise; never add an eyebrow) and accessibility; visuals, composition and motion may change completely.
- When an owner queue exists (the feedback file groups: remove candidates, broken/fix first, polish), work in that order: removals, broken, polish. Remove a component the owner calls useless if there is no easy upgrade.

## Model and token rules (project decisions; re-check they still hold)

- **Implementation builders run on `claude-sonnet-5-5-high`** (owner decision 2026-11-23 14:33): the default model produced bland output, and the old-model wave went 0-for-8 at QA. Waves on Sonnet moved the failure mode from "template layout" to "finish defects". Use the cheapest tier for mechanical scans, the top tier for synthesis. If those model names change, keep the principle: do not build showpiece work on a weak default.
- Pipeline v3 (owner-approved 2026-11-23 14:39): blind builders, one QA sweep per wave, QA failures redone with frames attached. Superseded for fixes on 2026-11-23 17:10: fix agents self-verify with their own captures and no orchestrator sweeps that round. The owner's gallery review is the final gate.
- Token discipline: capture is cheap, reading images is not. Batch your checks (fix everything one look shows, then look again), screenshot only what you need, do not read whole `PROMPT.md` files (they run 25-77KB). The owner stopped all new components at a $200 spend; a budget stop means "finish WIP only", then report. Do not start new builds past a stop.
- Source tension: BUILDER-BRIEF gates require shot.sh self-checks; REDESIGN-TASK (2026-11-23, token saving) said NO browser verification, no self-scoring, no polish rounds; pipeline v3 had builders blind. These were successive cost trade-offs, not contradictions of the bar. The current default (owner brief, 2026-11-23 17:10) is: self-verify with your own captures, QA sweep is independent, the owner decides. If you are explicitly told "no browser", still run the mechanical gate and say verification was skipped.

## Reporting (12 lines max)

Name, status, craft score (advisory), gate results (tsc / render / craft and which fixes were used), the screenshot paths, PROMPT.md bytes, one honest weakness.
