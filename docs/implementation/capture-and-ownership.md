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

## TentacleWars Notes

- neutral capture uses a separate acquisition threshold from displayed neutral energy
- TentacleWars neutral capture bookkeeping is mode-owned and no longer reuses the shared NodeWARS neutral-contest helpers
- TentacleWars overflow currently follows the later follow-up answer, not the earlier conservative prototype note:
  - a full cell broadcasts the whole overflow value to each outgoing lane
- hostile capture resets to `10` and then applies carryover
- hostile carryover includes:
  - surviving offensive payload from the capture event
  - released outgoing lane payload from the captured node cleanup
- TentacleWars slice/cut payload reaches ownership resolution immediately through the shared ownership helper; it does not wait for the NodeWARS `BURSTING` travel path
