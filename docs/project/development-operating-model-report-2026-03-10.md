# Development Operating Model Report

## Overview

The project is on the right path.

It has already moved beyond an experimental state and into a real engineering state with:

- clearer architecture
- living documentation
- automated guardrails
- backlog and technical reviews
- explicit separation between gameplay, UI, campaign, and checks

There is still meaningful room to professionalize the process without adding heavy bureaucracy.

The next gain does not come only from more code. It comes from improving:

- work management
- continuity between sessions
- ownership clarity
- process predictability
- traceability of decisions

## Current Diagnosis

### Existing strengths

- Operational documentation already exists:
  - `AGENTS.md`
  - `README.md`
  - subsystem implementation docs
- The project already has a multi-layered check suite:
  - `smoke`
  - `ui-sanity`
  - `ui-dom-sanity`
  - `campaign-sanity`
  - `soak`
- The repo already works with:
  - canonical entry points
  - a gameplay baseline
  - a backlog
  - severity-based prioritization
- Development is already happening in small waves, which is the correct model.

### Current weaknesses

- The process still depends too much on session memory.
- The backlog exists, but it is not yet a fully continuous execution system.
- The check layer is strong, but still maintained in a somewhat artisanal way.
- There is still no fully explicit chain between:
  - discovery
  - task creation
  - implementation
  - validation
  - documentation
  - closure

## Recommended Direction

The next improvement should not be a heavyweight process.

It should be a lightweight, disciplined, modular operating model with:

- a living roadmap
- an executable backlog
- short task specs
- checks by surface
- clear session handoff

## Recommended Management Model

### 1. Product roadmap

A higher-level document with a longer horizon.

It should answer:

- where the project is
- what the current phase is
- what the 3 to 5 real priorities are
- what is explicitly out of focus

Suggested macro-phases:

- Phase 1: stabilization and robustness
- Phase 2: balance and campaign polish
- Phase 3: Tentacle Wars fidelity
- Phase 4: desktop/mobile ports

### 2. Executable backlog

A list of small tasks with real status.

Each task should contain:

- ID
- title
- objective
- severity
- owner/workstream
- dependencies
- done criteria
- required check
- docs to update

### 3. Short task spec

Every medium or risky task should have a small spec before implementation.

Minimum template:

- problem
- desired rule
- likely files
- risk
- checks to pass
- expected impact

### 4. Mandatory closure

When any relevant task is completed:

- run checks
- update the relevant docs
- update backlog/status
- record likely follow-ups

## Recommended Workstreams

- `WS-01 Gameplay Core`
- `WS-02 AI and Factions`
- `WS-03 Campaign and Level Design`
- `WS-04 UI/UX and Render`
- `WS-05 Performance and Robustness`
- `WS-06 Ports and Build Pipeline`

## Recommended Tools

### Lightweight kanban

Good options:

- GitHub Projects
- Linear
- Trello
- Notion database

Recommendation:

- GitHub Projects for direct repository integration
- Trello for maximum simplicity

Suggested columns:

- Inbox
- Planned
- In Progress
- Needs Validation
- Done

### Real issue tracker

It is worth turning bugs and improvements into short issues.

Suggested categories:

- bug
- design
- tech-debt
- balance
- UI
- port

### Consolidated check runner

`npm run check` is already a strong entry point.

It also makes sense to keep domain commands visible and consistent:

- `npm run check:gameplay`
- `npm run check:ui`
- `npm run check:campaign`
- `npm run check:content`
- `npm run check:full`

### Lightweight release notes

This does not need to be heavy.

But it is worth having:

- a small release-notes doc
- or future GitHub Releases

## Should We Create Domain Agents?

Yes, but in a small number around critical domains.

The right model is a small mesh of agents, each with:

- scope
- critical files
- required checks
- docs to update
- anti-patterns
- done criteria

## How To Continue From Here

### Step 1. Read the right files

Start with:

1. `AGENTS.md`
2. `docs/project/stabilization-status.md`
3. `docs/project/task-backlog.md`
4. `docs/implementation/current-gameplay-baseline.md`
5. `docs/project/check-matrix.md`

### Step 2. Run validation

```bash
npm run check
```

### Step 3. Choose the next wave

Use a small-wave model:

- one problem
- one clear objective
- one bounded surface
- expected checks

### Step 4. Implement

- touch only what is necessary
- preserve canonical owners
- update checks if the rule changed

### Step 5. Close

- run checks
- update docs
- update backlog/status
- record follow-ups

## What Still Needs To Happen

### Short term

- keep the domain-agent set current
- keep the backlog operational
- keep the check matrix explicit
- continue playtest/balance waves through this model

### Medium term

- external board or issue tracker
- release notes
- deeper input/gameplay harnesses

### Longer term

- Linux/Android build pipeline
- richer playtest and telemetry support

## Conclusion

The project is already in a strong technical state.

What is missing now is not another large restructuring.
What is missing is a lightweight, consistent, repeatable operating model.

The right next move is to keep organizing what already exists into:

- roadmap
- backlog
- task specs
- domain agents
- check matrix
- standard handoff flow
