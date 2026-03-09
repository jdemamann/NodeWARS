# Stabilization Roadmap

## Goal

Get the current game into a clean, low-risk, modular state before pursuing maximum Tentacle Wars fidelity.

Current execution status:

- see `docs/project/stabilization-status.md` for the live implementation status
- this roadmap remains the phase structure, not the authoritative completion log
- current remaining stabilization work is concentrated in:
  - world-mechanics boundary isolation
  - final `Tent.js` decomposition decisions
  - optional expansion of lightweight behavior checks

## Technical Strategy

The repository should evolve in this order:

1. baseline
2. critical fixes
3. canonical rule extraction
4. parameterization
5. modularization
6. naming cleanup
7. expanded lightweight tests
8. fidelity work

## Work Packages

### WP-01 Baseline

Status: `completed`

Deliverables:

- current gameplay baseline doc
- updated audit references
- stable smoke-check command

### WP-02 Gameplay Hardening

Status: `largely completed`

Deliverables:

- fixed gameplay-critical inconsistencies
- aligned docs/comments
- no duplicated critical rule path

### WP-03 Canonical Rule Ownership

Status: `largely completed`

Deliverables:

- single slice entry point
- single ownership-change helper
- single owner-color resolver
- single energy-budget resolver

### WP-04 Parameterization

Status: `well underway`

Deliverables:

- grouped config modules or sections
- unit-aware constant names
- minimal magic numbers in simulation

### WP-05 Modularization

Status: `well underway`

Deliverables:

- `Game.js` reduced to orchestration
- large subsystems split by rule responsibility
- explicit boundaries between core gameplay and world-specific mechanics

### WP-06 Naming

Status: `well underway`

Deliverables:

- naming convention doc applied incrementally
- glossary of domain vocabulary
- renamed high-impact abbreviations in critical paths

### WP-07 Lightweight Regression Layer

Status: `completed for smoke-check scope`

Deliverables:

- smoke checks for all major invariants
- optional behavior-check script for subsystem-level verification

## Exit Criteria for Stabilization Phase

- current game rules are internally consistent
- comments/docs match code
- critical systems have canonical entry points
- tunables are centralized
- module boundaries are understandable
- naming is predictable
- smoke checks cover the main invariants

## Handoff to Fidelity Phase

Only after stabilization is complete:

- revisit `docs/implementation/tentaclewars-fidelity-spec.md`
- separate fidelity-compatible systems from optional/world-specific systems
- begin targeted gameplay simplification toward original pillars

## Remaining Focus

Highest-value remaining stabilization items:

1. isolate world mechanics from the core gameplay loop
2. decide the final decomposition boundary for `Tent.js`
3. optionally add one more lightweight check layer if it adds signal without heavy framework cost
