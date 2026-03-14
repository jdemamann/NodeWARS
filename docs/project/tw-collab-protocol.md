# TW Collaboration Protocol

## Protocol Version

- `PROTOCOL: v2`

## Agent Boundaries

- **Codex**
  - implements code, authored levels, validation scripts, and implementation-facing docs
  - stages, commits, and pushes under the git rules below
- **Claude**
  - analyzes, reviews, validates, confirms, or rejects waves
  - does not perform git operations

## Inbox Files

- `docs/project/inbox-codex.md`
  - Claude writes here
  - Codex reads here
- `docs/project/inbox-claude.md`
  - Codex writes here
  - Claude reads here
- `docs/project/tw-collab-status.md`
  - single-line current state
  - format:
    - `WAITING_FOR: Codex — ...`
    - `WAITING_FOR: Claude — ...`
    - `WAITING_FOR: none — ...`

## Language

- All file-based collaboration content must be in English.

## Message Structure

```md
---
FROM: [Claude|Codex]
PROTOCOL: v2
TASK: [task-id] — [short description]
TYPE: [see taxonomy]

---
 [body]

EXPECTS: [none | what the reader should do next]
---
```

## Type Taxonomy

- `SPEC`
  - Claude → Codex: full implementation instruction
- `SPEC_AMENDMENT`
  - Claude → Codex: correction or addition to a spec not yet started
- `IMPL_REPORT`
  - Codex → Claude: implementation done, ready for review
- `BUG_REPORT`
  - Codex → Claude: real out-of-scope bug found; direction needed before proceeding
- `CONFIRM`
  - Claude → Codex: wave approved and closed
- `REJECT`
  - Claude → Codex: wave rejected, with reason and next step
- `DESIGN_NOTE`
  - either direction: non-blocking observation or recommendation
- `PROTOCOL_PROPOSAL`
  - either direction: proposal to change collaboration rules
- `PROTOCOL_ACK`
  - either direction: accepts a protocol proposal

## Inbox Receipt Rule

- After reading a message, keep the inbox intact while working.
- Once the corresponding reply has been written, or once no reply is needed, overwrite the consumed inbox with:
  - `_READ by Codex — [date]_`
  - `_READ by Claude — [date]_`

This prevents stale re-reads without discarding the live instruction too early.

## Decision Blocks In Specs

When Claude includes a design choice with a clear default, specs may include:

```md
DECISION: [topic]
  [A] description  ← DEFAULT
  [B] description
  Override: reply DECISION:[topic]=[B] before starting.
```

- Codex proceeds with the default unless an override is sent before implementation starts.

## Implementation Report Requirements

Every `IMPL_REPORT` must include:

1. `Checks: [start] → [end] ([+N new / -N removed])`
2. `Beyond spec`
   - if nothing: `Beyond spec: none.`
   - if something: list it and explain why it was kept
3. `Review checklist`
   - only the 3-6 highest-risk review points
   - not a restatement of the whole spec

## Bug Escalation Rule

- If Codex discovers a real bug outside the current spec scope, stop and send `BUG_REPORT`.
- Exception:
  - a trivial, local, low-risk consistency fix
  - covered by the same validation gate
  - may be included under `Beyond spec` instead of escalating

## Objection / Rejection Standard

Claude should reject or block only for issues that actually threaten execution quality, such as:

- sequencing problems
- missing validation contract
- contradiction with a user-closed decision
- unnecessary task split causing churn

Everything else should be treated as non-blocking improvement guidance.

## Git Ownership (Model D)

- Codex
  - stages changes
  - creates commits
  - pushes to remote
- Claude
  - review and confirm only
  - no git operations

### Commit Timing

- commit after Claude sends `CONFIRM`
- or at an explicit user-requested checkpoint

### Commit Scope

- one commit per confirmed task or tightly coupled wave
- avoid retroactive micro-commit reconstruction
- avoid leaving large confirmed piles uncommitted

### Commit Message Format

- `<task-id>: <imperative summary>`
- examples:
  - `TWL-OBS-001: implement capsule obstacle support`
  - `TWL-GUARD-001: add clash and preview guardrails`

### Push Timing

- push on milestone groups
- or when the user explicitly asks
- not necessarily after every micro-wave

### Remote Invariant

- remote should reflect reviewed and confirmed work only

## Protocol Changes

- Either agent may propose changes via `PROTOCOL_PROPOSAL`.
- The other accepts via `PROTOCOL_ACK`.
- Changes take effect on the next message after the ACK.
- User approval is not required for protocol-only changes.

## Version Mismatch

- If a message arrives with `PROTOCOL: v1` or without a version:
  - treat it as legacy protocol
  - flag the mismatch in the reply
  - state explicitly that the current side is operating on `v2`

## User-Closed Decisions

Do not reopen:

- TentacleWars is a separate campaign from NodeWARS
- NodeWARS stays intact
- rollout is world-by-world
- the target is structural reconstruction
- TentacleWars has its own score/result flow
- amoeba obstacles are in World 1 scope
- JS objects are the canonical authoring format

## Documentation Boundaries

- `docs/project/`
  - active operational docs, collaboration files, plans, in-flight reports
- `docs/tentaclewars/`
  - stable TentacleWars specs and implementation-facing references
- `progress.md`
  - permanent repo-level implementation log

## Archive Rule

- archive only superseded dated reports and retired collaboration records
- do not archive active protocol, current inbox files, status files, or live task references

## This File

Use this file only for:

- protocol rules
- queue handling
- taxonomy
- git ownership
- versioning

Do not mix in task artifacts, implementation notes, or wave-specific decisions.
