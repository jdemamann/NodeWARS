# Relay Mechanics

## Rule

Relay nodes do not generate their own outgoing feed.

A relay may only forward energy that was received from upstream friendly tentacles. That incoming flow is buffered for one frame, split across the relay's outgoing tentacles on the next frame, and every forwarded unit also drains stored relay energy.

## Practical effect

- Capturing a relay still matters.
- Sending from a relay still applies the relay amplifier.
- A relay with no upstream input cannot act as a free source.
- If a relay runs out of stored energy, its outgoing links stall until more friendly flow arrives.

## Code anchors

- Feed budget assignment: `src/systems/Physics.js`
- Relay source drain and flow cap: `src/entities/Tent.js`
- Relay node state: `src/entities/GameNode.js`
