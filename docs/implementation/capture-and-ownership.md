# Capture and Ownership

## Canonical Rule

Ownership transitions must go through the shared helper in `src/systems/Ownership.js`.

That helper is responsible for:

- assigning the new owner
- resetting transient ownership-related state
- setting post-capture or post-kill energy
- emitting ownership events
- retracting invalid tentacles after the owner change

## Why

Before canonicalization, ownership changes were duplicated across:

- direct tentacle attack
- neutral capture
- middle-cut impact
- burst impact

That made it easy for one path to drift from another.

## Code Anchors

- canonical helper: `src/systems/Ownership.js`
- callers: `src/entities/Tent.js`
