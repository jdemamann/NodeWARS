/* ================================================================
   TentacleWars controlled scenario presets

   Provides deterministic sandbox layouts for visual validation and
   focused playtests so TentacleWars waves can be reviewed without
   depending on random map generation.
   ================================================================ */

import { NodeType } from '../config/gameConfig.js';

/* Keep preset authoring terse while still matching the fixed-layout node shape. */
function node(x, y, energy, owner = 0, type = NodeType.NORMAL, extra = {}) {
  return { x, y, energy, owner, type, ...extra };
}

/* Scale normalized preset node coordinates into the live canvas size. */
function scaleNode(spec, width, height) {
  return {
    ...spec,
    x: width * spec.x,
    y: height * spec.y,
  };
}

/* Tentacle seeds already reference node ids directly, so only a shallow clone is needed. */
function scaleTent(tentSpec) {
  return { ...tentSpec };
}

const PRESET_BUILDERS = {
  'grade-showcase': () => ({
    label: 'GRADE SHOWCASE',
    nodes: [
      node(0.12, 0.28, 15, 1),
      node(0.28, 0.28, 40, 1),
      node(0.44, 0.28, 80, 1),
      node(0.60, 0.28, 120, 1),
      node(0.76, 0.28, 160, 1),
      node(0.90, 0.28, 180, 1),
      node(0.20, 0.68, 42, 0),
      node(0.52, 0.68, 68, 2),
      node(0.82, 0.68, 92, 3),
    ],
    tents: [],
  }),
  'capture-lab': () => ({
    label: 'CAPTURE LAB',
    nodes: [
      node(0.14, 0.52, 120, 1),
      node(0.34, 0.30, 72, 1),
      node(0.34, 0.74, 72, 1),
      node(0.52, 0.52, 44, 0),
      node(0.72, 0.30, 84, 2),
      node(0.72, 0.74, 84, 3),
      node(0.88, 0.52, 130, 2),
    ],
    tents: [],
  }),
  'slice-lab': () => ({
    label: 'SLICE LAB',
    nodes: [
      node(0.16, 0.52, 130, 1),
      node(0.40, 0.30, 88, 1),
      node(0.64, 0.52, 92, 2),
      node(0.84, 0.52, 72, 2),
    ],
    tents: [
      { source: 0, target: 2, state: 'active', reachT: 1, paidCost: 24, energyInPipe: 18 },
      { source: 1, target: 2, state: 'active', reachT: 1, paidCost: 18, energyInPipe: 10 },
    ],
  }),
  'clash-lab': () => ({
    label: 'CLASH LAB',
    nodes: [
      node(0.18, 0.52, 132, 1),
      node(0.38, 0.30, 82, 1),
      node(0.38, 0.74, 82, 1),
      node(0.82, 0.52, 132, 2),
      node(0.62, 0.30, 82, 2),
      node(0.62, 0.74, 82, 2),
    ],
    tents: [
      { source: 0, target: 3, state: 'active', reachT: 1, paidCost: 26, energyInPipe: 16, clashKey: 'mid' },
      { source: 3, target: 0, state: 'active', reachT: 1, paidCost: 26, energyInPipe: 16, clashKey: 'mid' },
    ],
  }),
  'density-lab': () => ({
    label: 'DENSITY LAB',
    nodes: [
      node(0.16, 0.26, 122, 1),
      node(0.16, 0.52, 118, 1),
      node(0.16, 0.78, 122, 1),
      node(0.84, 0.26, 122, 2),
      node(0.84, 0.52, 118, 3),
      node(0.84, 0.78, 122, 2),
      node(0.50, 0.22, 58, 0),
      node(0.50, 0.52, 68, 0),
      node(0.50, 0.82, 58, 0),
    ],
    tents: [
      { source: 0, target: 7, state: 'active', reachT: 1, paidCost: 20, energyInPipe: 12 },
      { source: 1, target: 4, state: 'active', reachT: 1, paidCost: 22, energyInPipe: 15 },
      { source: 2, target: 7, state: 'active', reachT: 1, paidCost: 20, energyInPipe: 12 },
      { source: 3, target: 7, state: 'active', reachT: 1, paidCost: 20, energyInPipe: 12 },
      { source: 4, target: 1, state: 'active', reachT: 1, paidCost: 22, energyInPipe: 15 },
      { source: 5, target: 7, state: 'active', reachT: 1, paidCost: 20, energyInPipe: 12 },
    ],
  }),
};

export const TW_SCENARIO_PRESET_IDS = Object.freeze(Object.keys(PRESET_BUILDERS));

/* Resolve the requested preset id from the URL when TentacleWars visual tests ask for one. */
export function resolveTentacleWarsScenarioPresetId() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const presetId = params.get('tw-preset');
  return PRESET_BUILDERS[presetId] ? presetId : null;
}

/* Build a scaled layout object that can be fed through the normal fixed-layout loader. */
export function getTentacleWarsScenarioPreset(presetId, width, height) {
  const builder = PRESET_BUILDERS[presetId];
  if (!builder) return null;

  const preset = builder();
  return {
    id: presetId,
    label: preset.label,
    nodes: preset.nodes.map(nodeSpec => scaleNode(nodeSpec, width, height)),
    hazards: [],
    pulsars: [],
    tents: (preset.tents || []).map(scaleTent),
  };
}
