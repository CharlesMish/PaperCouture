# Paper Couture: choices at the fold, then new garment families

Planning brief for Charlie's next Ultra implementation session. Prepared 2026-09-29.

**Status: proposal only. No feature code was changed for this brief.** The source was inspected; the new constructions and suggested parameter ranges have not been built, rendered or physically folded. Feasibility judgments below are hypotheses, not test results. The next implementation session should exercise judgment and ship only the candidates that pass the gates below.

## 1. The direction

Charlie's favorite addition is choosing the side folds. Extend that feeling: a small, understandable decision changes how the paper becomes the garment. Put the decision beside the relevant fold, show its consequence, and let the player revisit it honestly.

Keep the existing four garment families. Give them a few meaningful choices, then add two new families with different construction and outlines. A third new family is a bounded experiment. Accessory work is secondary to garments in this batch.

Success means the player notices a different sleeve, wrap, edge, or outline at ordinary viewing size and understands which fold caused it. A large option count is not a goal.

### Recommended batch

| Work | Candidate choices or result | Priority | Main risk |
| --- | --- | --- | --- |
| Dress | Existing three side folds, plus Classic / Lifted / Dropped sleeves | Core | Sleeve creases must remain sound across every supported silhouette |
| Box jacket | Current cropped body / a longer body | Core | Longer version must still read as a jacket |
| Wrap skirt | Current wrap / opposite wrap; one-turn / two-turn waistband | Core | Real geometric mirroring and changes in attachment height |
| Lapel vest | Current short body / longline body | Core | Preserve the recently improved lapels and shoulders |
| Cross-front robe | New sleeved, straight-bodied garment with a diagonal overlapping front | First new family | Clear overlap without a bulky chest or fake opening |
| Pleated skirt | New skirt with a broad central panel and two readable pleats | Second new family | Selected layers, fold order and pleat legibility |
| Wide-leg trousers | One distinct pair of folded legs from one square | Experimental third family | May need operations the engine cannot express cleanly |
| Bow with folded centre | Optional third paper component for the existing two-piece bow | Stretch, after core work | The centre must look folded, not like a pasted disc |

A good outcome can be the existing-garment choices plus one or two successful new garments. Do not force the third garment or accessory through to hit a quota.

## 2. Verified starting point

- Source repository: `CharlesMish/PaperCouture`.
- Current working source branch: `polish/plum-petals`, verified at `305f8efa176cf4e9b2b49e585e78100496f0f9ff`. Do not assume the older `main` branch is the played version.
- Owner-feedback fixes are merged through source PR #8. Website PR #26 was also merged in the preceding review.
- Recheck remote refs at implementation time and preserve any newer work. Branch from the current played source, recording the exact SHA.
- Read `AGENTS.md`, `README.md`, `HANDOFF.md`, `docs/feedback-pass/NOTES.md`, `docs/astra-review/STYLING_CHOICES.md`, and `docs/garment-studies/NOTES.md`.
- The old instruction to keep one garment described the original prototype. Charlie has since authorized multiple garments and choices. Its material, interaction and rendering constraints still apply.

Important existing behavior: three dress silhouettes; four garment families; a separate pin and Two-piece bow; optional garment-specific attachment positions; independent garment/accessory paper and turn; two-sided pattern rotation; reversible steps; Workshop and Display; 44 CSS-pixel handles for small flaps.

## 3. Existing garments: curated variations

### A. Dress: sleeve attitude

Keep Straight, Classic A-line and Wide flare. Add a second decision immediately before the sleeve fold:

- **Classic:** current sleeve geometry, unchanged.
- **Lifted:** sleeves sit nearer horizontal and make a wider upper outline.
- **Dropped:** sleeves angle farther downward for a quieter outline.

These are working names; label them from the actual rendered result. Existing `DressParams.sleeveDroop` offers a useful construction parameter. Explore a few values around the current 45-degree default rather than adding a free slider. Values around 20 and 65 degrees are candidate starting probes only, not approved geometry.

There are at most nine silhouette/sleeve combinations. Validate all supported combinations. Prefer reducing the sleeve menu to two genuinely distinct, sound options over shipping nearly identical choices or fragile combinations. Preserve the current three silhouettes with Classic sleeves exactly.

The choice belongs at `sleeves`, after the `sides` choice. Changing sleeves must retain the earlier side-fold choice. Revisiting the side folds must rewind to that earlier decision and invalidate later folded progress.

Visual acceptance: the sleeve tips differ visibly at normal display size; the shoulders stay connected and generous; no little spikes or apparent tears; the hem finish remains reachable with the existing handles.

### B. Box jacket: body length

Add **Cropped** (current) and **Longer** at `jacket-hem`. The fold moves actual retained material; it must not scale the finished mesh.

Keep the collar, sleeve character and broad body. This is a small construction change with a substantial proportional effect. Use two lengths first. The longer one should look like a relaxed jacket, not a second dress or a barely changed crop.

Recompute useful attachment positions if the waist/body location changes. Preserve the default jacket. Do not add simultaneous jacket flare, collar and sleeve menus in this pass.

### C. Wrap skirt: which panel leads, and how the band finishes

This is a strong existing design. Keep the current option as the default.

First decision, before the first wrap-panel fold: **Current wrap / Opposite wrap**. Author the mirrored crease positions and fold order. Resolve left/right labels from the player's final front view, accounting for turn-over steps. Keep the paper's material coordinates fixed: do not mirror the pattern image or swap the paper faces to fake a mirrored garment.

Second decision at the waistband: **Turn once / Turn twice**. The current two-turn band stays the default. Investigate stopping after the first band fold to leave a broader reverse-facing accent. Confirm the actual front/back exposure with a diagnostic paper before naming the finish. If it does not create a neat, readable alternate band, omit that option.

These choices give at most four combinations. They affect both the asymmetric composition and the relation between print and reverse without replacing the skirt Charlie likes. The one-turn finish has a different top boundary and may have one fewer operation; update anchors, metadata, instruction text and dynamic step counts accordingly.

Keep the explicit turn-over steps that make the hem folds happen visibly upward. Do not reintroduce folding into the table or tiny inaccessible points.

### D. Lapel vest: short and longline

Offer **Short** (current) and **Longline** at `vest-shorten`. Keep the small lapels, continuous backing, shoulder tucks and real boundary highlights.

The longer body should make this read like a waistcoat layer. It must not turn the front into two thin hanging strips. Inspect it with similar-toned front/reverse paper as well as high contrast; the lapel structure must remain legible without relying on a particular pattern.

Do not bring back broad lapels that seem to cut through the shoulders. A lapel-size menu is not part of this batch.

## 4. New garment families

### E. Cross-front robe — best next new garment

**Visual target:** a relatively straight, longer body, short broad sleeves, and a visible diagonal wrap across the chest. A narrow reverse-facing collar/edge can frame the overlap. It should look different from both the A-line dress and the square jacket even on plain paper.

**Why it belongs:** asymmetric overlapping panels create a different folding experience and give the existing papers a new composition. It also sets up a natural future choice of wrap direction without needing another texture collection.

**Construction hypothesis:** establish a restrained neck/edge band, reserve material for the sleeves, bring two asymmetric front panels across in separate steps, open only the appropriate sleeve flaps, and finish the body length from the accessible side. Test the panel order and selected-layer behavior before committing to this sequence. The visible centre can have continuous paper backing; it does not need a hollow opening.

Start with one well-proportioned construction. Do not simultaneously add robe length, sleeve, wrap and belt choices. An existing bow or pin at a sensible overlap point is sufficient styling for this first version.

**Acceptance:** obvious diagonal overlap; connected sleeves; slim enough stack to read as paper; useful front and back; no reliance on a painted diagonal line to imply a fold. Show it beside the current jacket and dress at the same display scale. If it is only the jacket with a changed band, keep it as a study instead of adding a garment entry.

Use the descriptive name Cross-front robe. Do not claim an authentic traditional garment or a historical origami pattern without evidence.

### F. Pleated skirt — strongest new folding behavior

**Visual target:** a broad central panel with a pair of clear returned folds. Think a few substantial paper pleats, with calm areas for the print, rather than a dense fan of narrow ridges.

**Why it belongs:** it introduces repeated folding and layered edge rhythm. The wrap skirt changes which panel covers another; this one compresses and returns the paper. That is a meaningful second skirt family.

**Construction hypothesis:** establish two broad opposing pleats with sequential folds and explicit turns as necessary, then finish a tapered outline and waistband. Reserve sufficient material for the pleat returns and hem. Begin with a small number of large folds. There is no requirement to make radial fan pleats or add a new solver.

One fixed, clean pleat arrangement is enough initially. A future shallow/deep-pleat choice is attractive, but do not double the first implementation's geometry work before the basic construction is convincing.

**Acceptance:** the returned edges are visibly folded at the normal front and angle views on plain two-sided paper; no trapped flap magically passes through another layer; the waist and hem are clean; the garment looks distinct from both existing skirts/dresses. Do not paint alternating stripes or inflate it into cloth to make the pleats appear.

If a valid construction looks like a plain skirt with invisible pleats, it has not passed the visual gate. One deliberate revision is useful; an engine rewrite is not.

### G. Wide-leg trousers — bounded geometry experiment

**Visual target:** two broad, separated legs and a compact waistband. This offers the largest outline difference in the shortlist.

**Why it is experimental:** making the centre separation from retained material can demand a tuck, pocket or squash operation beyond the current rigid crease system. The current engine has not been shown to support this construction.

Investigate a single-square construction with a real folded separation. First produce only a geometric timeline and plain-paper views. Do not build UI or decorations until the centre, layer connectivity and animation are sound.

Use a strict checkpoint: after one candidate construction and one materially different repair attempt, either show a credible complete fold sequence or park it with a short diagnosis. Do not cut a slot, hide polygons, separate the legs by stretching material, introduce a hollow trouser model, or silently change it into a two-sheet garment.

If it fails, the batch still succeeds. Reuse that agent for the accessory study or independent review, rather than manufacturing a substitute garment solely to keep the count at three.

## 5. Optional accessory follow-up

Keep **Two-piece bow** exactly as named. A separate **Folded centre** can become an optional third square, producing a clearly labeled three-piece assembly. A small wrapped-looking rectangular or diamond fold is a better target than a circle pasted over the join.

Choose its paper independently if that fits the existing accessory state cleanly. Otherwise use the existing accessory paper for the prototype and state that limit. Adding/removing the centre must not lose the two completed wings. Keep assembly language honest: a styled arrangement is not proof of a self-locking paper joint.

This is lower priority than garment choices and accepted new garments. A one-piece bow, ribbon tails and a folded flower remain good later studies.

## 6. Other promising directions, deliberately deferred

| Idea | Why keep it | Why not bundle it into this implementation |
| --- | --- | --- |
| Narrow/wide dress collar reveal | Strong use of reverse colour near the face of the garment | It changes the early construction and could multiply the new sleeve combinations |
| Jacket cuffs | Small reverse accents with a clear folding action | Additional tiny flap interaction and material-budget work |
| Short/long wrap skirt | Another meaningful proportion change | Wrap and waistband already provide two decisions; avoid three axes immediately |
| Waistband width or shallow/deep pleats | Natural choice for the new pleated skirt | Establish a convincing fixed construction first |
| Sailor-collar top | A broad folded collar could create a new upper silhouette | Needs a real collar construction, not a jacket texture change |
| Long coat | Familiar, readable combination of sleeves and lapels | Risks duplicating the longer jacket and vest before those are played |
| Neckerchief or folded collar accessory | Small, legible folds; strong two-sided-paper payoff | Attachment behavior differs from the current small pin/bow |
| One-piece bow | A satisfying complete accessory craft | Likely involves more complicated layer manipulation than the current two wings |

Do not revisit the rejected cape, add a mannequin, create more papers, add progression/currency, or touch LabyrinthCraft in this batch.

## 7. Instructions for the Ultra implementation lead

### Start and preserve

1. Confirm the live source branch and current remote SHA. Create an isolated feature branch; preserve concurrent work. This planning branch is documentation, not a requirement to replace newer source.
2. Read the current project instructions and run the documented baseline checks. Play representative current flows before changing them.
3. Record the baseline construction outputs for the default dress silhouettes, jacket, skirt and vest. The default options should preserve those results; changes for new options do not justify changing a liked default.
4. Keep paper art, the two-sided rotation mapping and the fold engine stable unless a concrete defect requires a narrowly justified fix. Do not turn a geometry feature into an engine refactor.

### Shared decision behavior

The existing application ties the dress decision to numeric step 2. Multiple choices require a small generalization, not many new hard-coded step numbers.

- Identify decisions by stable semantic operation IDs such as `sides`, `sleeves`, `jacket-hem`, `skirt-wrap-left` and `vest-shorten`, or explicit decision IDs mapped to operations.
- Each garment has a small typed set of valid option IDs, a default, and a pure construction builder. Reuse or extend `shapeChoices.ts` only as much as needed.
- Offer choices at the relevant settled fold. While an animation is active, follow the existing interaction lock/queue policy consistently.
- A changed option can only retain completed progress if the construction prefix and geometry up to that point really are identical. Otherwise return to the earliest affected decision and make that return clear.
- Revisit sleeve choice retains the chosen dress sides. Revisit sides rewinds before that fold and preserves compatible later option preferences, but does not pretend those later folds remain completed.
- Preserve garment paper, rotation and independent accessory paper. Store an existing accessory while the garment is being refolded. Reattach it only on a valid completed garment and anchor; fall back to a valid placement or a clear unattached state if its old anchor no longer exists. Do not silently discard completed accessory work.
- Dynamic step counts and progress indicators must match the selected construction. Extra explicit turn-over steps are acceptable. Six is not a requirement.
- Use an actual folded-outline preview where practical, or accurate simple icons based on accepted geometry. Do not show an aspirational silhouette the construction cannot produce.
- Keep decisions contextual. Do not present a large parameter dashboard or duplicate every variant in the garment picker.

### Parallel work and ownership

Use up to seven concurrent agents including the lead. Start workers only when the relevant interface and file ownership are clear. A practical split is:

| Agent | Scope | Boundaries |
| --- | --- | --- |
| Lead | Shared decision state/UI, garment registry, attachments, integration and delivery | Sole owner of `src/main.ts`, shared UI/controller wiring, registry and global styles |
| A | Dress sleeve choices and jacket length | Dedicated construction/variant files and focused geometry checks; no shared UI edits |
| B | Skirt wrap/band choices and vest length | Dedicated construction/variant files; preserve baseline lapels and upward-fold sequence |
| C | Cross-front robe | Candidate construction, its evidence and garment-specific metadata |
| D | Pleated skirt | Candidate construction, its evidence and garment-specific metadata |
| E | Trousers feasibility; optional folded bow centre if trousers are parked or completed | Geometry gate before integration; no hidden engine expansion |
| F, once candidates exist | Independent review and interaction audit | Read/review first; route fixes to the owning worker or lead |

Workers share a filesystem. Use separate files or isolated worktrees where needed, unique capture directories and stable test fixtures. Agree on a minimal return contract before they start: construction builder, option IDs/defaults, decision point, proposed anchor data and a short evidence report. Avoid concurrent edits to central test files; workers can provide focused test modules for the lead to wire in.

Workers should not merge, publish, touch the website repository, or post messages to other people. The lead integrates accepted changes and owns all delivery. Do not spawn subagents solely to fill available slots.

### Geometry and visual gates

Run these in order so a failed idea does not consume a long UI/polish pass:

1. **Construction:** retained material area, rigid transforms, valid connectivity, selected layers and stable fold endpoints. Check actual intermediate animation, not only the final flat pose. A passing test is not proof of real-world physical foldability.
2. **Readable plain-paper result:** front, angle and back at ordinary display size; inspect layer exposure and outline without decorative pattern camouflage. The garment must earn its name and be distinct from current families.
3. **Paper composition:** quiet print, a strong two-sided contrast, Cut-paper mosaic and a reverse-decorated paper. Use the diagnostic paper for mirroring/rotation. Test all quarter-turns where directional construction or two-sided exposure is new.
4. **Interaction:** decisions, revisit, Back, reset/cancel during motion, paper/turn changes, small-flap handles, accessory restoration and Display.

All garments remain paper constructions with authored folds. No cuts, deleted/hidden material, mesh stretching, fake texture seams, physical-cloth simulation or hollow clothing bodies. If a local layer-selection fix is necessary, explain the failing construction and protect existing ones. If success requires a new folding primitive or broad engine changes, keep the candidate out of this batch.

### Verification appropriate to the risks

- Node 24; `npm ci`, `npm run typecheck`, `npm test`, and `npm run build -- --base /play/paper-couture/`.
- Use current scripts as the starting point, including `scripts/check.ts`, `scripts/check-feedback.cjs`, `scripts/check-garments.cjs` and the styling checks. Update intentionally changed step counts; do not weaken geometric or interaction assertions to accommodate a bad candidate.
- Exercise every supported combination within each garment: at most nine dress, two jacket, four wrap skirt, two vest. Do not test a meaningless Cartesian product across unrelated garments.
- Assert default construction parity and valid anchors for changed outlines. Check full visible accessory placement, not only whether the anchor centre is inside a polygon.
- Preserve 44px small-flap targets and the minimum stable drag distance, pointer cancellation, tap and keyboard behavior. Specifically revisit the tiny dress hem points across the existing silhouettes.
- Exercise the shared-prefix/revisit cases above, including retaining side choice when changing sleeves and safely returning an attached accessory after refolding.
- Use a real production build under `/play/paper-couture/`, with desktop and 390×844 / 844×390 emulated browser layouts. Reuse the project's established browser tooling; do not add a library merely for these checks.
- Check console/network failures and controls hidden by an expanded choice panel. Browser touch emulation does not establish real-phone or Safari support.
- Review images from the final commit. Separate agent-reported checks from checks independently repeated. Do not claim a physical paper fold was tested unless somebody actually did it.

### Curation and delivery

Keep a concise decision record at `docs/geometry-collection/NOTES.md`: accepted choices, parameter rationale, rejected candidates with reasons, checks, final source SHA and remaining limitations. Include useful comparison sheets at normal garment size; avoid hundreds of redundant images.

Integrate only accepted designs into the normal picker. Preserve a rejected experiment's explanation and, where useful, an isolated study artifact; do not leave broken selectable entries or unused production code.

Open a reviewable source PR against the current working source branch. If the established cmish.dev workflow is available, prepare its corresponding website update PR and preview using the verified source build. Keep merges and production publication for Charlie's review, consistent with this project's recent workflow. If preview access is blocked, deliver the complete source and reproducible build/handoff and state the precise remaining integration step.

Report what is actually playable, what was parked, and one or two useful playtest questions. Good questions here are whether the new choices feel distinct, whether a player understands where to revisit them, and whether the new garment still reads clearly on their favorite paper.

## 8. Expected shape of the first playtest

Try the same paper on all three sleeve attitudes, then change the dress silhouette. Try reversing the skirt wrap without rotating the print, followed by the two waistband finishes. Compare short and long jacket/vest proportions. Finally, fold the accepted new garments from the square rather than inspecting only their finished models.

This tests the central hypothesis: a few visible folding decisions can create substantially more ownership and replayability while keeping Paper Couture a small, calm paper workshop.
