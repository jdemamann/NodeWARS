# Music Theme and Notification Wave Report

## Scope

This report reviews:

- the current procedural music layer
- the viability of expanding the soundtrack count
- the current toast/notification surface
- the value of introducing richer bottom-right popup notifications for music and gameplay guidance

No code changes are included in this report.

## Executive Summary

Yes, it makes sense to expand the soundtrack count.

The current score has a strong foundation:

- a protected menu theme
- one main theme per world
- procedural generation instead of asset playback

However, the current structure is still too coarse for the campaign that now exists.

Right now the soundtrack language is:

- memorable enough to establish identity
- not yet rich enough to support a full authored campaign with bosses, tutorials, escalation phases, and a dedicated ending

The same is true for notifications:

- the project already has a toast surface
- it is underused relative to the amount of information the game could surface elegantly
- it is a good candidate for a more expressive bottom-right notification system

The best next move is not to replace the current system.
It is to evolve it into:

1. a more granular music theme model
2. a richer notification layer with content categories

## Current Music State

Primary file:

- `src/audio/Music.js`

Current structure:

- `playMenu()` for the sacred menu theme
- `playGenesis()` for World 1
- `playVoid()` for World 2
- `playNexus()` for World 3
- a few UI tones such as menu click / hover / tab switch

### Strengths

- strong authored identity in comments and intent
- procedural generation keeps the score lightweight and portable
- world themes already have distinct BPM and harmonic flavor
- the sacred menu theme creates a recognisable brand anchor

### Limitations

- one theme per world is no longer enough for the authored campaign structure
- there is no dedicated boss theme family
- there is no dedicated ending theme or ending variation
- there is no variation layer for:
  - tutorial
  - pressure peaks
  - faction escalation
  - victory/loss states beyond short SFX and transition flow
- `Music.js` is still a monolithic file, so creative growth will increase maintenance cost unless the next wave introduces structure

## Recommendation: Expand Tracks By Phase Group

Yes, grouping tracks by phase clusters is the right direction.

That gives you:

- more narrative progression
- less repetition
- better pacing
- stronger authored identity

### Recommended Music Groups

#### Menu / meta

- `Drift Signal`
  - keep sacred
  - menu / settings / level select

#### World 1

- `Genesis Pulse`
  - early World 1 / tutorial / simple expansion phases
- `Siege Bloom`
  - mid World 1 / pressure and fortress phases
- `Echo Core`
  - World 1 boss

#### World 2

- `Hollow Signal`
  - early World 2 / hazard introduction
- `Entropy Current`
  - mid World 2 / moving vortex and unstable routes
- `Oblivion Gate`
  - World 2 boss

#### World 3

- `Current`
  - early World 3 / relay introduction
- `Signal War`
  - mid World 3 / coalition pressure / signal tower maps
- `Transcendence Protocol`
  - final run / last phases

#### Ending

- `The Network Awakens`
  - dedicated ending theme or ending reprise

### Why group-based tracks make sense

- they preserve the world identity
- they allow stronger escalation inside each world
- they make bosses feel special
- they avoid having to author a unique track for every phase

This is the best cost-to-impact ratio.

## Recommended Music Architecture

The current implementation should evolve from:

- one function per world theme

to:

- one small track-definition registry
- one playback engine
- one selector by context

### Recommended future structure

- `src/audio/music/musicTrackRegistry.js`
- `src/audio/music/musicPlaybackEngine.js`
- `src/audio/music/musicContextResolver.js`

Possible track model:

- `id`
- `title`
- `worldId`
- `group`
- `bpm`
- `progression`
- `mood`
- `loopDurationSec`
- `isSacred`

This would make notifications, debug preview, and future build/export work much cleaner.

## Current Notification State

Primary surfaces:

- `src/ui/ScreenController.js`
- `index.html`
- `styles/main.css`

Current notification model:

- single `#toast`
- simple text-only popup
- fixed duration
- already positioned in the right direction for lightweight event feedback

### Current strengths

- fast
- simple
- already integrated with gameplay events
- does not require a large new UI system to start evolving

### Current limitations

- no categories
- no title/body split
- no icon slot
- no stacking
- no priority system
- no richer event metadata
- not expressive enough for music change, strategic guidance, or state snapshots

## Recommendation: Evolve Toast Into a Notification Surface

Yes, the bottom-right popup idea is strong.

It fits the game well because:

- it is readable without blocking the arena
- it works on desktop and mobile if spacing is controlled
- it can carry both flavor and tactical guidance

### Notification model I recommend

Each notification should support:

- `kind`
- `title`
- `body`
- `icon`
- `accent`
- `durationMs`
- optional `meta`

### Suggested kinds

- `music`
- `system`
- `hint`
- `objective`
- `status`
- `warning`
- `debug`

## Music Change Popups

This is a very good idea.

Every time the track changes, show a short popup in the bottom-right with:

- track name
- world/group
- approximate loop length or tempo
- optional flavor tag

### Recommended content

Example:

- `NOW PLAYING`
- `GENESIS PULSE`
- `World 1 • Expansion Theme • 82 BPM`

For bosses:

- `BOSS THEME`
- `OBLIVION GATE`
- `World 2 • Crisis Loop • 72 BPM`

For ending:

- `ENDING THEME`
- `THE NETWORK AWAKENS`
- `Campaign Complete • Epilogue`

### Why this is worth doing

- it rewards the player emotionally
- it makes the soundtrack feel authored
- it raises perceived production value immediately

## Gameplay Popups That Make Sense

Your intuition here is good.

The popup system can become a lightweight player-guidance layer without turning the game into a noisy tutorial wall.

### Best uses

#### Strategic hints

- `You are overextended`
- `Relay chain online`
- `Enemy coalition capturing neutral`
- `Signal tower active`

These should be rare and contextual, not constant.

#### Match state summaries

- `Dominance: You lead 6 / 4`
- `Neutral front: 3 contested`
- `Enemy pressure rising`

These should probably be opt-in or low-frequency.

#### Objective guidance

- `Capture the relay to stabilize this lane`
- `Signal tower can reveal the full map`
- `Pulsar ready soon`

These are especially useful in authored phases and tutorials.

#### Music / atmosphere

- track changes
- boss theme entry
- ending theme entry

#### World mechanics alerts

- `Full scan active`
- `Pulsar charging`
- `Coalition surge detected`

These already partially exist as toasts; they could be upgraded into structured notifications.

## Popup Ideas With High Value

These are the best candidates.

### Tier A

- music change popups
- boss theme popups
- signal / pulsar / scan alerts
- coalition neutral-capture alerts when pressure spikes

### Tier B

- domination state summaries
- “you are overextended” warnings
- objective reminders after repeated failure

### Tier C

- periodic strategic tips
- progression reminders
- post-phase stat insights

Tier C should be used carefully to avoid noise.

## Design Rules For Notifications

To keep this system good:

- no spam
- no permanent stacking wall
- no duplicate low-value events
- strong priority ordering
- mobile-safe size and timing

### Recommended constraints

- max 2 concurrent visible notifications
- low-priority notifications collapse if a high-priority one appears
- repeated identical notifications should debounce
- music notifications should not interrupt critical warnings

## Creative Opportunities

This new notification layer can do more than just inform.

It can help the game feel more authored.

Examples:

- boss entry:
  - `HOSTILE SIGNAL LOCK`
  - `OBLIVION GATE`
- faction identity:
  - `CUTTHROAT PRESSURE RISING`
  - `Purple strike pattern detected`
- phase mood:
  - `Bridge lane destabilized`
  - `Relay race phase entered`

This should be used sparingly, but the format is powerful.

## Recommended Implementation Order

### Wave 1

- structured notification model
- music change popup
- notification styling and stacking
- migrate the most important existing toasts

### Wave 2

- grouped soundtrack expansion:
  - early / mid / boss per world
- track selection by phase group
- debug preview for track switching

### Wave 3

- strategic contextual notifications
- opt-in or low-frequency match-state guidance

## Suggested Tasks

### TASK-MUSIC-01 Music Theme Expansion Architecture

Goal:

- split `Music.js` into track registry + playback engine + context resolver

### TASK-MUSIC-02 Grouped Campaign Soundtrack Expansion

Goal:

- add track groups for early/mid/boss by world and a dedicated ending theme

### TASK-UI-037 Structured Notification System

Goal:

- evolve the current toast into a typed popup system with title/body/icon/accent

### TASK-UI-038 Music Change Notification Flow

Goal:

- show bottom-right “now playing” notifications when the soundtrack changes

### TASK-UI-039 Contextual Gameplay Notification Layer

Goal:

- add a small set of high-value gameplay notifications for world mechanics and strategic guidance

## Final Recommendation

Yes, this direction is worth pursuing.

The strongest path is:

1. expand the soundtrack by phase group
2. add structured bottom-right notifications
3. use that same system for selected gameplay guidance and world alerts

This would improve:

- perceived production value
- campaign pacing
- soundtrack identity
- player guidance
- emotional payoff

without requiring a full cinematic layer or a heavy UI rewrite.
