# TentacleWars World 1 Prototype Gate

Date: `2026-03-13`
Task: `TASK-TWL-008a TentacleWars World 1 Prototype`

## Scope

Pipeline-validation pass for authored `W1-01` through `W1-05`.

This note does **not** claim World 1 balance is finished.
It only confirms that the first authored slice now moves through the full
phase-C pipeline without reopening schema/runtime boundaries.

## Authored subset

- `W1-01` connect
- `W1-02` neutral-capture
- `W1-03` slice
- `W1-04` support-loop
- `W1-05` obstacle-routing

Canonical source:

- [TwWorld1.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/tentaclewars/levels/TwWorld1.js)

## Validation

- `node scripts/tw-level-schema-sanity.mjs`
- `node scripts/tw-campaign-sanity.mjs`
- `node scripts/tw-campaign-loader-sanity.mjs`
- `node scripts/tw-preview-jump-sanity.mjs`
- `node scripts/tw-balance-matrix-sanity.mjs`
- `node scripts/smoke-checks.mjs`
- `node scripts/commentary-policy.mjs`

All passed.

## Visual gate

Browser validation used the existing TW preview query flow:

- `?tw-debug=1&tw-mode=tentaclewars&tw-autostart=1&tw-level=W1-03`
- `?tw-debug=1&tw-mode=tentaclewars&tw-autostart=1&tw-level=W1-05`

Artifacts:

- [tw-w1-03-prototype.png](/home/jonis/.claude/projects/nodewars-v2-codex/output/playwright/tw-w1-03-prototype.png)
- [tw-w1-05-prototype.png](/home/jonis/.claude/projects/nodewars-v2-codex/output/playwright/tw-w1-05-prototype.png)

Observed:

- `W1-03` loads into a clean two-vs-two slice teaching layout
- `W1-05` loads with the authored obstacle shell in the intended blocking lane
- no page errors surfaced during capture
- console warnings were limited to expected `AudioContext` autoplay warnings

## Counterpoints / limits

- `W1-05` is intentionally the earliest route blocker in the authored slice.
  This follows the reconstruction report more than the looser skeleton wording.
- `W1-04` uses a simple three-owned-node support reading, not a fully verified
  original layout. That is acceptable for `TWL-008a` because the gate is
  pipeline validation first, reconstruction polish second.
- `TwCampaignFixtures.js` still contains a future-world anchor (`W2-01`) so
  cross-world ordering and purple-intro sanity can continue to run before
  Worlds 2-4 are authored.

## Gate conclusion

`TWL-008a` pipeline criterion is satisfied:

- authored levels exist for `W1-01..W1-05`
- no schema rewrite was required after authoring started
- balance matrix rows exist for each authored phase
- campaign sanity now covers the authored `W1-01..W1-05` subset
- browser visual validation confirms the loader/runtime path is working on real authored phases

Do not open `TWL-008b` until this gate is validated in the collaboration loop.
