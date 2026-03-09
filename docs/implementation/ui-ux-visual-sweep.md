# UI / UX Visual Sweep

## Role

This document records a focused UI review from a gameplay-first perspective: the interface must explain the simulation honestly, reduce misreads during combat, and keep tutorials aligned with the controls that actually exist.

## Primary issues found

### 1. Neutral capture feedback overstated progress

The neutral-node contest ring was using a fixed `EMBRYO` baseline instead of the node's real `captureThreshold`. That caused fortified neutrals, signals, and other special nodes to look "visually finished" before the capture rule was actually satisfied.

There was a second readability problem: rival contest scores were being accumulated around the same ring. In contested states, the circle could look nearly complete even though no attacker was close to winning.

### 2. Neutral dispute UI lacked authorship

The info panel showed a single generic capture percentage, but did not clearly identify:

- who is leading the capture
- whether the node is genuinely contested
- how close the current leader is to the real threshold

That made neutral battles harder to read than they should be.

### 3. Tutorial copy had drifted from the live rules

The tutorial still claimed:

- retracting did not explain the actual refund rule clearly
- cutting near the target causes a burst
- there is a fixed "250 energy overflow cascade" rule

Those statements no longer matched the current implementation. The tutorial also failed to teach the new drag-and-release connect flow.

## Changes implemented

### Neutral capture render

Updated [NodeRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/NodeRenderer.js) so that:

- the main capture ring uses `n.captureThreshold`
- only the current leader drives the primary progress arc
- rivals are shown as secondary thin arcs instead of contributing to a fake "full" circle
- contested neutrals gain an outer dashed warning ring
- the percentage label reflects leader progress, not combined noise

This keeps the visual language honest: "how close is the leading faction to actually taking this node?"

### Neutral info panel

Updated [UIRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/UIRenderer.js) so that neutral nodes now show:

- capture percentage using the real threshold
- the current leader
- the leader's numeric progress against the capture target
- a contested row when more than one attacker is present

This makes the hover panel useful for decision-making instead of just atmospheric flavor.

### Tutorial revision

Updated [i18n.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/localization/i18n.js) in both English and Portuguese:

- tentacle creation now teaches click or drag-and-release
- retract text now states clearly that retract returns invested payload to the source
- cut behavior now matches the live slice rules
- the false fixed "250 energy cascade" explanation was removed
- reserve/pressure language now matches the actual economy better

### World 3 readability pass

Updated:

- [NodeRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/NodeRenderer.js)
- [HazardRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/HazardRenderer.js)

So that special structures advertise their purpose more clearly:

- relays now communicate `FLOW +` and show directional booster markers once owned
- neutral relays pulse as capturable infrastructure instead of generic scenery
- owned signal towers now communicate `REVEAL`
- pulsars now show broadcast-cycle progress and a simple readiness state: `READY`, `CHARGING`, or `BURST`

This is important because World 3 asks the player to prioritize infrastructure quickly. The structure should explain its value on sight.

### Tentacle and node art direction pass

Updated:

- [TentRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/TentRenderer.js)
- [NodeRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/NodeRenderer.js)

The intent was to move away from flat placeholder geometry while preserving gameplay readability.

Tentacles now use:

- an outer membrane layer
- a brighter internal spine
- animated flow pulses during active transfer
- a root bulb at the source connection
- a grip ring at the target connection
- a less uniform silhouette, with wider-root / narrower-mid / tapered-tip shaping

This makes them read more like living pressurised tissue and less like simple bezier strokes.

Nodes now use:

- layered radial body fill
- a glowing inner nucleus
- a subtle specular arc
- a second inner energy arc for owned cells

This gives each node more depth and a stronger sense of stored energy without obscuring core gameplay metrics.

The later visual pass also improved structure identity:

- relays gained a more crystalline inner core
- owned signal towers gained a stronger technological frame
- pulsars gained a more convincing corona in `HIGH`
- clashes gained stronger local deformation and impact emphasis

### Tutorial ghost guidance

Updated [Tutorial.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/Tutorial.js) so the ghost helper demonstrates actions instead of only pointing at nodes:

- tentacle steps now show a drag-release guide from source to target
- relay capture guidance in World 3 uses the same drag-release language
- cut steps now draw an explicit slice path across the tentacle

The tutorial is now closer to a teaching overlay than a passive pointer.

### Critical combat readability

Updated [NodeRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/NodeRenderer.js) so player-owned nodes in collapse conditions display a distinct `CRIT` warning when:

- they are under heavy attack
- and their remaining energy is critically low

This gives the player a faster visual cue for imminent loss or forced defensive action.

### Phase context and result feedback

Updated:

- [Renderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/Renderer.js)
- [UIRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/UIRenderer.js)
- [HUD.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/HUD.js)
- [Screens.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/ScreenController.js)

The player now gets stronger context during and after the phase:

- HUD hints now teach drag-and-release instead of older interaction language
- the enemy count now correctly includes all hostile factions, including purple AI
- the result screen summarises special mechanics present in the phase

The original always-on canvas phase-status card was later removed because it added too much persistent clutter, especially on smaller screens. The result-screen and event-feedback improvements remain.

This still improves orientation and avoids under-reporting threat in World 3 without keeping a permanent overlay on the battlefield.

### Capture and outcome game feel

Updated:

- [Game.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/Game.js)
- [Renderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/Renderer.js)
- [UIRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/UIRenderer.js)

The game now uses lightweight transient canvas events for:

- neutral captures
- enemy breaches
- relay / signal captures
- pulsar broadcast moments

It also shows a short full-screen canvas outcome layer before the result screen:

- `DOMINATED` on victory
- `OVERRUN` on defeat

This gives the player a stronger emotional transition at the exact moment the match resolves instead of relying only on the later menu-style result screen.

### Menu, themes, and readability pass

Updated:

- [index.html](/home/jonis/.claude/projects/nodewars-v2-codex/index.html)
- [styles/main.css](/home/jonis/.claude/projects/nodewars-v2-codex/styles/main.css)
- [main.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/main.js)
- [HUD.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/HUD.js)
- [Screens.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/ScreenController.js)
- [i18n.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/localization/i18n.js)

This pass focused on product polish rather than world-space rendering:

- added a bespoke animated logo for the main menu
- promoted themes into full UI themes instead of a minor background toggle
- added `AURORA`, `SOLAR`, and `GLACIER`
- improved default readability with larger typography and a more legible default font
- added an FPS toggle in settings and a HUD readout
- upgraded debug mode with a copyable runtime snapshot
- removed several hard-coded inline styles that were blocking theme consistency

The practical goal was simple: the game should feel intentional before the player even enters a level.

## UX rationale

### Honest progress beats decorative progress

If a ring looks complete, the player expects the capture to finish. Any mismatch creates distrust in the interface. The neutral capture ring now communicates the one thing the player needs most: real progress toward ownership.

### Contested states need hierarchy

In a three-owner battlefield, not all signals should have equal weight. The leader should dominate the read. Rivals should remain visible, but secondary.

### Tutorials must describe live input

A tutorial that teaches obsolete controls increases friction immediately. The current onboarding now acknowledges both:

- click-to-connect
- drag-and-release connect
- direct pause / exit flow inside the tutorial

It also now explains that frenzy requires a single continuous slice gesture rather than three disconnected cuts over time.

That is important for both discoverability and player comfort.

## Remaining polish opportunities

These are good next-step improvements, but not required for the current correctness pass:

- add small owner icons or glyphs in the neutral contest panel instead of text labels
- add a distinct capture-ready pulse when leader progress exceeds 90%
- add a small visual legend for relay / pulsar / signal structures in World 3 onboarding
- add a more explicit world-space danger line for nodes about to auto-retract

## Validation

The lightweight regression suite now also protects:

- real capture-threshold usage in neutral visuals
- neutral leader visibility in the info panel
- tutorial copy alignment with current controls and rules
- presence of World 3 structure cues, critical combat warning, and tutorial ghost guidance
- presence of layered tentacle and node rendering paths
- removal of the old persistent phase-status clutter
