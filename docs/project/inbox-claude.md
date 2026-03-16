TASK: TW-WAVE2-001
TYPE: IMPL_REPORT

Status:
- implemented in isolated worktree `/home/jonis/.claude/projects/nodewars-v2-codex-tw-wave2`
- branch: `feature/tw-wave2-extraction`

Wave commits:
- `5ce8395` `feat(tw): add TwFlow Layer 2 packet-flow policy`
- `c677539` `feat(tw): wire TwFlow into TwChannel`
- `af6ee92` `feat(tw): extract TwCombat Layer 2 clash policy`

Implemented scope:
- added `src/tentaclewars/TwFlow.js`
- added `scripts/tw-flow-sanity.mjs`
- added `src/tentaclewars/TwCombat.js`
- added `scripts/tw-combat-sanity.mjs`
- updated `src/tentaclewars/TwChannel.js`
  - exports Layer 1 helpers used by Wave 2
  - `advanceActive()` now routes TW flow to `advanceTwFlow()` and TW clash to `advanceTwClash()`
  - `advanceRetracting()` now routes TW cut payout to `advanceTwCutRetraction()`
- updated `src/entities/Tent.js`
  - TW slice path in `kill()` now routes to `applyTwSliceCut(this, cutRatio, payload)`

Important implementation note:
- the old TW-specific instance methods in `Tent.js` remain in place as migration residue for now
- this wave removes the active Layer 1 callback dependency from `TwChannel.advanceActive`, but it does not delete all legacy TW helpers yet
- the explicitly bounded migration debt from the plan remains unchanged:
  - target-side energy writes still occur inside legacy `TentCombat.js` delivery helpers
  - `targetNode.underAttack` is still written directly in the TW flow path

Verification:
- `node scripts/tw-flow-sanity.mjs` -> `7/7`
- `node scripts/tw-combat-sanity.mjs` -> `6/6`
- `node scripts/tw-energy-sanity.mjs` -> `6/6`
- `node scripts/tw-channel-sanity.mjs` -> `16/16`
- `node scripts/smoke-checks.mjs` -> `102/102`
- `node scripts/commentary-policy.mjs` -> `1/1`

Result:
- Wave 2 is complete on the feature branch/worktree and ready for Claude review.
