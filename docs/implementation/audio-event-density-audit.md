# Audio Event Density Audit

## Goal

Reduce mix clutter during dense combat without removing important gameplay feedback.

## Problem

The project uses procedural audio and event-driven SFX hooks. In high-chaos moments, repeated events can stack faster than the player can parse them:

- clash start bursts
- repeated slice sounds
- hazard drain ticks
- pulsar charge / fire loops
- relay capture spikes
- repeated alarm-style warnings

This does not break mechanics, but it makes the mix feel muddy and can hide the sound that actually matters.

## Rule

High-density combat and world events now pass through lightweight per-event cooldown gates in [SoundEffects.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/audio/SoundEffects.js).

The cooldowns are intentionally short. They are not meant to mute the game, only to collapse redundant bursts that happen inside the same perceptual window.

## Current Cooldown Targets

- `capture`: keep repeated multi-capture chains readable
- `clash`: stop clash fronts from machine-gunning the same transient
- `cut`: prevent rapid slice spam
- `shieldHit`: reduce high-frequency impact stacking
- `autoRetract`: avoid repeated warning churn
- `enemyAlarm`: stop loss-state spam
- `hazardDrain`: keep vortex contact audible without hiss spam
- `voidPulse`: keep W2 identity readable
- `vortexHum`: avoid overlapping low-end rumble spam
- `relayBoost`
- `relayCapture`
- `pulsarFire`
- `pulsarCharge`

## Design Intent

- preserve player-facing information hierarchy
- keep unique milestone sounds untouched where possible
- reduce mud before reducing overall loudness or identity
- avoid any timing gate on simple UI affordances like select/build clicks

## Follow-Up

If later playtests still report audio mud, the next step should be event grouping by channel family, not just more cooldown time.
