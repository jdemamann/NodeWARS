# Content Alignment Review

## Scope

Review of three product-facing surfaces that drift easily during gameplay iteration:

- settings
- story
- tutorial

## Settings

The settings screen is now treated as a contract with localization.

The smoke suite verifies that the main settings labels and descriptions used in [index.html](/home/jonis/.claude/projects/nodewars-v2-codex/index.html) are backed by keys in [i18n.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/localization/i18n.js).

This protects:

- graphics mode
- FPS toggle
- theme
- font
- zoom
- language
- debug
- debug snapshot
- progress reset

## Tutorial

Tutorial copy was reviewed against the current mechanics:

- retract refunds the invested tentacle payload
- click and drag-and-release are both taught
- cut rules remain source burst / middle split / target refund
- pulsars only energize owned non-relay cells

## Story

The story now matches current world rules more closely.

Most importantly, World 3 no longer implies that pulsars energize every nearby cell. The copy now reflects the implemented rule: owned non-relay cells inside the pulse zone receive energy.

## Visual Direction

Full illustrations were not added to the story screen.

Reason:

- they would add production cost and visual maintenance without helping core play
- the current project benefits more from readable, lightweight world sigils and chapter cards

So the story screen now uses:

- a world strip
- chapter cards with accent colors
- low-cost symbolic graphics

This improves atmosphere and scanability without becoming an asset pipeline problem.

## Credits

Credits were reduced to relevant information only:

- creation
- production stack
- contact

Architecture and world-lore summaries were removed from credits because they belong in implementation docs or the story screen, not in the end-user credit roll.
