/* ================================================================
   TentacleWars sandbox configuration

   Builds the first randomized TentacleWars prototype phase. This is
   intentionally isolated from the authored NodeWARS campaign so the
   new mode can evolve without leaking into LEVELS metadata.
   ================================================================ */

import { T } from '../localization/i18n.js';
import { TW_BALANCE } from './TwBalance.js';
import {
  getTentacleWarsScenarioPreset,
  resolveTentacleWarsScenarioPresetId,
} from './TwScenarioPresets.js';

export const TW_SANDBOX_LEVEL_ID = 'TW-SBX';

/*
 * The first TentacleWars sandbox is a mechanic-validation slice:
 * one random map with player, red, purple, and neutrals. It reuses
 * the stable shell fields Game already expects, but it is not part
 * of campaign progression or level unlock flow.
 */
export function buildTentacleWarsSandboxConfig() {
  const presetId = resolveTentacleWarsScenarioPresetId();
  const presetLayout = presetId != null && typeof window !== 'undefined'
    ? getTentacleWarsScenarioPreset(presetId, window.innerWidth, window.innerHeight)
    : null;

  return {
    id: TW_SANDBOX_LEVEL_ID,
    name: presetLayout ? `${T('twSandboxName')} · ${presetLayout.label}` : T('twSandboxName'),
    isTentacleWarsSandbox: true,
    twPresetId: presetId,
    fixedLayout: presetLayout,
    suppressWorldBanner: true,
    worldId: 0,
    isTutorial: false,
    isBoss: false,
    nodes: 15,
    playerStartEnergy: 26,
    enemyCount: 2,
    enemyStartEnergy: 24,
    purpleEnemyCount: 1,
    purpleEnemyStartEnergy: 24,
    neutralEnergyRange: [18, 72],
    nodeEnergyCap: 200,
    distanceCostMultiplier: 0,
    aiThinkIntervalSeconds: TW_BALANCE.AI_THINK_INTERVAL_SEC,
    soundtrackTrackId: TW_BALANCE.DEFAULT_SOUNDTRACK_TRACK_ID,
    par: null,
  };
}
