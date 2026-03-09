import { NodeType } from '../config/gameConfig.js';

function node(x, y, energy, owner = 0, type = NodeType.NORMAL, extra = {}) {
  return { x, y, energy, owner, type, ...extra };
}

function hazard(x, y, r, extra = {}) {
  return {
    x,
    y,
    r,
    phase: 0,
    drainRate: 6,
    warningR: r * 1.5,
    _drainCd: 0,
    _warn: 0,
    ...extra,
  };
}

function pulsar(x, y, r, extra = {}) {
  return {
    x,
    y,
    r,
    timer: 3.8,
    interval: 4.5,
    strength: 22,
    pulse: 0,
    phase: 0,
    chargeTimer: 0,
    charging: false,
    ...extra,
  };
}

function levelLayout({ nodes, hazards = [], pulsars = [] }) {
  return { nodes, hazards, pulsars };
}

function scaleNode(spec, width, height) {
  return {
    ...spec,
    x: width * spec.x,
    y: height * spec.y,
  };
}

function scaleHazard(spec, width, height) {
  const scaledRadius = spec.r < 1 ? Math.min(width, height) * spec.r : spec.r;
  return {
    ...spec,
    x: width * spec.x,
    y: height * spec.y,
    ax: width * spec.x,
    ay: height * spec.y,
    r: scaledRadius,
    warningR: spec.warningR ? (spec.warningR < 1 ? Math.min(width, height) * spec.warningR : spec.warningR) : scaledRadius * 1.5,
  };
}

function scalePulsar(spec, width, height) {
  return {
    ...spec,
    x: width * spec.x,
    y: height * spec.y,
    r: spec.r < 1 ? Math.min(width, height) * spec.r : spec.r,
  };
}

function mirrorWorld1Boss() {
  return levelLayout({
    nodes: [
      node(0.16, 0.50, 40, 1),
      node(0.28, 0.24, 44),
      node(0.28, 0.50, 54),
      node(0.28, 0.76, 40),
      node(0.43, 0.18, 52),
      node(0.43, 0.38, 36),
      node(0.43, 0.62, 36),
      node(0.50, 0.50, 58),
      node(0.57, 0.18, 52),
      node(0.57, 0.38, 36),
      node(0.57, 0.62, 36),
      node(0.57, 0.82, 52),
      node(0.72, 0.24, 44),
      node(0.72, 0.50, 54),
      node(0.84, 0.50, 40, 2),
    ],
  });
}

const FIXED_LAYOUT_BUILDERS = {
  0: () => levelLayout({
    nodes: [
      node(0.18, 0.50, 55, 1),
      node(0.38, 0.33, 30),
      node(0.38, 0.67, 25),
      node(0.60, 0.50, 35),
      node(0.80, 0.50, 20),
    ],
  }),
  1: () => levelLayout({
    nodes: [
      node(0.16, 0.50, 32, 1),
      node(0.34, 0.30, 24),
      node(0.36, 0.70, 22),
      node(0.54, 0.50, 28),
      node(0.74, 0.34, 24),
      node(0.84, 0.56, 18, 2),
    ],
  }),
  2: () => levelLayout({
    nodes: [
      node(0.15, 0.50, 28, 1),
      node(0.32, 0.28, 24),
      node(0.32, 0.72, 24),
      node(0.50, 0.50, 26),
      node(0.68, 0.25, 24),
      node(0.68, 0.75, 24),
      node(0.84, 0.50, 25, 2),
    ],
  }),
  3: () => levelLayout({
    nodes: [
      node(0.14, 0.50, 28, 1),
      node(0.31, 0.24, 22),
      node(0.31, 0.76, 22),
      node(0.48, 0.50, 20),
      node(0.65, 0.24, 26),
      node(0.65, 0.76, 26),
      node(0.82, 0.50, 28, 2),
      node(0.50, 0.18, 18),
    ],
  }),
  4: () => levelLayout({
    nodes: [
      node(0.14, 0.52, 30, 1),
      node(0.32, 0.26, 24),
      node(0.32, 0.78, 24),
      node(0.50, 0.18, 24),
      node(0.50, 0.52, 24),
      node(0.50, 0.84, 24),
      node(0.74, 0.28, 26, 2),
      node(0.74, 0.76, 26, 2),
      node(0.88, 0.52, 22),
    ],
  }),
  5: () => levelLayout({
    nodes: [
      node(0.16, 0.50, 30, 1),
      node(0.34, 0.24, 22),
      node(0.34, 0.50, 24),
      node(0.34, 0.76, 22),
      node(0.54, 0.18, 26),
      node(0.54, 0.50, 34),
      node(0.54, 0.82, 26),
      node(0.76, 0.24, 24, 2),
      node(0.76, 0.76, 24, 2),
      node(0.88, 0.50, 20),
    ],
  }),
  6: () => levelLayout({
    nodes: [
      node(0.14, 0.50, 32, 1),
      node(0.30, 0.32, 22),
      node(0.30, 0.68, 22),
      node(0.46, 0.50, 24),
      node(0.62, 0.24, 24),
      node(0.62, 0.50, 30),
      node(0.62, 0.76, 24),
      node(0.78, 0.18, 22, 2),
      node(0.78, 0.50, 26, 2),
      node(0.78, 0.82, 22),
      node(0.90, 0.50, 18),
    ],
  }),
  7: () => levelLayout({
    nodes: [
      node(0.14, 0.50, 34, 1),
      node(0.28, 0.22, 24),
      node(0.28, 0.50, 26),
      node(0.28, 0.78, 24),
      node(0.44, 0.34, 30),
      node(0.44, 0.66, 30),
      node(0.58, 0.20, 28),
      node(0.58, 0.50, 34),
      node(0.58, 0.80, 28),
      node(0.76, 0.32, 30, 2),
      node(0.76, 0.68, 30, 2),
      node(0.88, 0.50, 40, 2),
    ],
  }),
  8: () => levelLayout({
    nodes: [
      node(0.14, 0.50, 35, 1),
      node(0.26, 0.26, 26),
      node(0.26, 0.74, 26),
      node(0.42, 0.18, 34, 0, NodeType.NORMAL, { isBunker: true }),
      node(0.42, 0.50, 28),
      node(0.42, 0.82, 34, 0, NodeType.NORMAL, { isBunker: true }),
      node(0.60, 0.30, 26),
      node(0.60, 0.70, 26),
      node(0.76, 0.18, 30, 0, NodeType.NORMAL, { isBunker: true }),
      node(0.76, 0.50, 30, 2),
      node(0.76, 0.82, 24, 2),
      node(0.90, 0.34, 24, 2),
      node(0.90, 0.66, 24),
    ],
  }),
  9: () => levelLayout({
    nodes: [
      node(0.12, 0.50, 36, 1),
      node(0.24, 0.22, 24),
      node(0.24, 0.50, 26),
      node(0.24, 0.78, 24),
      node(0.40, 0.18, 30, 0, NodeType.NORMAL, { isBunker: true }),
      node(0.40, 0.38, 26),
      node(0.40, 0.62, 26),
      node(0.40, 0.82, 30, 0, NodeType.NORMAL, { isBunker: true }),
      node(0.58, 0.24, 28),
      node(0.58, 0.50, 30, 0, NodeType.NORMAL, { isBunker: true }),
      node(0.58, 0.76, 28),
      node(0.76, 0.20, 30, 2),
      node(0.76, 0.50, 34, 2),
      node(0.76, 0.80, 30, 2),
    ],
  }),
  10: () => mirrorWorld1Boss(),
  11: () => levelLayout({
    nodes: [
      node(0.16, 0.50, 55, 1),
      node(0.38, 0.34, 28),
      node(0.38, 0.66, 28),
      node(0.66, 0.50, 25),
      node(0.84, 0.50, 20, 2),
    ],
    hazards: [
      hazard(0.54, 0.50, 58, { drainRate: 7, warningR: 82 }),
    ],
  }),
  12: () => levelLayout({
    nodes: [
      node(0.14, 0.50, 30, 1),
      node(0.30, 0.28, 24),
      node(0.30, 0.72, 24),
      node(0.48, 0.20, 26),
      node(0.48, 0.80, 26),
      node(0.64, 0.50, 28),
      node(0.80, 0.32, 24, 2),
      node(0.84, 0.68, 24),
    ],
    hazards: [
      hazard(0.54, 0.50, 64, { drainRate: 7 }),
    ],
  }),
  13: () => levelLayout({
    nodes: [
      node(0.14, 0.50, 28, 1),
      node(0.28, 0.24, 22),
      node(0.28, 0.76, 22),
      node(0.44, 0.34, 26),
      node(0.44, 0.66, 26),
      node(0.60, 0.20, 24),
      node(0.60, 0.80, 24),
      node(0.76, 0.50, 28, 2),
      node(0.88, 0.50, 20),
    ],
    hazards: [
      hazard(0.50, 0.30, 54, { drainRate: 6 }),
      hazard(0.50, 0.70, 54, { drainRate: 6 }),
    ],
  }),
  14: () => levelLayout({
    nodes: [
      node(0.14, 0.50, 30, 1),
      node(0.28, 0.22, 24),
      node(0.28, 0.78, 24),
      node(0.42, 0.18, 26),
      node(0.42, 0.82, 26),
      node(0.56, 0.50, 30),
      node(0.72, 0.22, 28, 2),
      node(0.72, 0.50, 24),
      node(0.72, 0.78, 28, 2),
      node(0.88, 0.50, 22),
    ],
    hazards: [
      hazard(0.48, 0.32, 58, { drainRate: 6.5 }),
      hazard(0.48, 0.68, 58, { drainRate: 6.5 }),
    ],
  }),
  15: () => levelLayout({
    nodes: [
      node(0.12, 0.50, 32, 1),
      node(0.26, 0.24, 24),
      node(0.26, 0.76, 24),
      node(0.42, 0.18, 26),
      node(0.42, 0.50, 22),
      node(0.42, 0.82, 26),
      node(0.60, 0.24, 24),
      node(0.60, 0.76, 24),
      node(0.78, 0.34, 28, 2),
      node(0.78, 0.66, 28, 2),
    ],
    hazards: [
      hazard(0.50, 0.18, 52, { drainRate: 6 }),
      hazard(0.50, 0.50, 58, { drainRate: 7 }),
      hazard(0.50, 0.82, 52, { drainRate: 6 }),
    ],
  }),
  16: () => levelLayout({
    nodes: [
      node(0.12, 0.50, 32, 1),
      node(0.24, 0.24, 24),
      node(0.24, 0.76, 24),
      node(0.38, 0.18, 24),
      node(0.38, 0.82, 24),
      node(0.52, 0.50, 28),
      node(0.66, 0.18, 24),
      node(0.66, 0.82, 24),
      node(0.80, 0.24, 28, 2),
      node(0.80, 0.76, 28, 2),
      node(0.92, 0.50, 20),
    ],
    hazards: [
      hazard(0.44, 0.32, 54),
      hazard(0.44, 0.68, 54),
      hazard(0.64, 0.32, 54),
      hazard(0.64, 0.68, 54),
    ],
  }),
  17: () => levelLayout({
    nodes: [
      node(0.12, 0.50, 34, 1),
      node(0.24, 0.24, 24),
      node(0.24, 0.76, 24),
      node(0.40, 0.18, 26),
      node(0.40, 0.50, 24),
      node(0.40, 0.82, 26),
      node(0.58, 0.24, 26),
      node(0.58, 0.76, 26),
      node(0.76, 0.20, 28, 2),
      node(0.76, 0.80, 28, 2),
      node(0.90, 0.50, 42, 2),
    ],
    hazards: [
      hazard(0.50, 0.22, 52, { pulsing: true, pulseActive: true, pulseTimer: 0, pulsePeriod: 6 }),
      hazard(0.50, 0.40, 50, { pulsing: true, pulseActive: false, pulseTimer: 1.5, pulsePeriod: 6 }),
      hazard(0.50, 0.60, 50, { pulsing: true, pulseActive: true, pulseTimer: 3, pulsePeriod: 6 }),
      hazard(0.50, 0.78, 52, { pulsing: true, pulseActive: false, pulseTimer: 4.5, pulsePeriod: 6 }),
    ],
  }),
  18: () => levelLayout({
    nodes: [
      node(0.12, 0.50, 34, 1),
      node(0.22, 0.24, 20, 1),
      node(0.22, 0.76, 25),
      node(0.36, 0.16, 25),
      node(0.36, 0.50, 24),
      node(0.36, 0.84, 25),
      node(0.54, 0.24, 26),
      node(0.54, 0.76, 26),
      node(0.70, 0.18, 28, 2),
      node(0.70, 0.50, 30, 2),
      node(0.70, 0.82, 28, 2),
      node(0.88, 0.50, 22),
    ],
    hazards: [
      hazard(0.30, 0.32, 48, { moving: true, moveR: 42, movePhase: 0.2, movePhaseY: 1.0, pulsing: true, pulseActive: true, pulseTimer: 0, pulsePeriod: 6 }),
      hazard(0.30, 0.68, 48, { moving: true, moveR: 42, movePhase: 1.1, movePhaseY: 2.1, pulsing: true, pulseActive: false, pulseTimer: 1.5, pulsePeriod: 6 }),
      hazard(0.50, 0.18, 46, { pulsing: true, pulseActive: true, pulseTimer: 3, pulsePeriod: 6 }),
      hazard(0.50, 0.82, 46, { pulsing: true, pulseActive: false, pulseTimer: 4.5, pulsePeriod: 6 }),
      hazard(0.64, 0.50, 54, { moving: true, moveR: 36, movePhase: 2.2, movePhaseY: 0.7, pulsing: true, pulseActive: true, pulseTimer: 2, pulsePeriod: 6 }),
    ],
  }),
  19: () => levelLayout({
    nodes: [
      node(0.10, 0.50, 36, 1),
      node(0.20, 0.20, 26),
      node(0.20, 0.50, 24),
      node(0.20, 0.80, 26),
      node(0.40, 0.14, 26),
      node(0.40, 0.86, 26),
      node(0.56, 0.30, 26),
      node(0.56, 0.70, 26),
      node(0.72, 0.16, 28, 2),
      node(0.72, 0.50, 32, 2),
      node(0.72, 0.84, 28, 2),
      node(0.88, 0.32, 24),
      node(0.88, 0.68, 24),
    ],
    hazards: [
      hazard(0.32, 0.20, 46, { moving: true, moveR: 26, movePhase: 0.2, movePhaseY: 1.1 }),
      hazard(0.32, 0.50, 50, { moving: true, moveR: 24, movePhase: 1.8, movePhaseY: 0.9 }),
      hazard(0.32, 0.80, 46, { moving: true, moveR: 26, movePhase: 2.4, movePhaseY: 1.8 }),
      hazard(0.58, 0.20, 46, { moving: true, moveR: 26, movePhase: 0.8, movePhaseY: 2.2 }),
      hazard(0.58, 0.80, 46, { moving: true, moveR: 26, movePhase: 1.4, movePhaseY: 2.7 }),
    ],
  }),
  20: () => levelLayout({
    nodes: [
      node(0.10, 0.50, 38, 1),
      node(0.18, 0.24, 28),
      node(0.18, 0.76, 28),
      node(0.34, 0.18, 26),
      node(0.34, 0.50, 24),
      node(0.34, 0.82, 26),
      node(0.52, 0.16, 28),
      node(0.52, 0.50, 30),
      node(0.52, 0.84, 28),
      node(0.70, 0.18, 30, 2),
      node(0.70, 0.50, 34, 2),
      node(0.70, 0.82, 30, 2),
      node(0.88, 0.28, 24, 2),
      node(0.88, 0.72, 24),
    ],
    hazards: [
      hazard(0.28, 0.24, 44, { moving: true, moveR: 28, movePhase: 0.4, movePhaseY: 1.2 }),
      hazard(0.28, 0.76, 44, { moving: true, moveR: 28, movePhase: 1.4, movePhaseY: 2.2 }),
      hazard(0.46, 0.24, 46, { moving: true, moveR: 28, movePhase: 2.1, movePhaseY: 0.7 }),
      hazard(0.46, 0.76, 46, { moving: true, moveR: 28, movePhase: 2.8, movePhaseY: 1.7 }),
      hazard(0.62, 0.24, 48, { moving: true, moveR: 30, movePhase: 0.9, movePhaseY: 2.9 }),
      hazard(0.62, 0.76, 48, { moving: true, moveR: 30, movePhase: 1.9, movePhaseY: 0.3 }),
    ],
  }),
  21: () => levelLayout({
    nodes: [
      node(0.10, 0.50, 40, 1),
      node(0.18, 0.22, 22, 1),
      node(0.18, 0.78, 28),
      node(0.32, 0.16, 28),
      node(0.32, 0.50, 26),
      node(0.32, 0.84, 28),
      node(0.48, 0.24, 30),
      node(0.48, 0.76, 30),
      node(0.64, 0.18, 30, 2),
      node(0.64, 0.50, 34, 2),
      node(0.64, 0.82, 30, 2),
      node(0.80, 0.24, 32, 2),
      node(0.80, 0.76, 32),
      node(0.90, 0.38, 26, 3),
      node(0.90, 0.62, 24),
    ],
    hazards: [
      hazard(0.28, 0.20, 46, { moving: true, moveR: 30, movePhase: 0.2, movePhaseY: 1.1, pulsing: true, pulseActive: true, pulseTimer: 0, pulsePeriod: 5 }),
      hazard(0.28, 0.80, 46, { moving: true, moveR: 30, movePhase: 1.2, movePhaseY: 2.1, pulsing: true, pulseActive: false, pulseTimer: 1, pulsePeriod: 5 }),
      hazard(0.48, 0.22, 46, { pulsing: true, pulseActive: true, pulseTimer: 2, pulsePeriod: 5 }),
      hazard(0.48, 0.78, 46, { pulsing: true, pulseActive: false, pulseTimer: 3, pulsePeriod: 5 }),
      hazard(0.68, 0.28, 48, { moving: true, moveR: 24, movePhase: 2.1, movePhaseY: 0.9 }),
      hazard(0.68, 0.72, 48, { moving: true, moveR: 24, movePhase: 1.6, movePhaseY: 2.8 }),
      hazard(0.54, 0.50, 84, { drainRate: 18, warningR: 122, isSuper: true, pulsing: true, pulseActive: true, pulseTimer: 0.5, pulsePeriod: 5 }),
    ],
  }),
  22: () => levelLayout({
    nodes: [
      node(0.16, 0.50, 55, 1),
      node(0.44, 0.50, 0, 0, NodeType.RELAY),
      node(0.66, 0.32, 28),
      node(0.66, 0.68, 25),
      node(0.86, 0.50, 20, 2),
    ],
    pulsars: [
      pulsar(0.44, 0.18, 0.22),
    ],
  }),
  23: () => levelLayout({
    nodes: [
      node(0.12, 0.50, 28, 1),
      node(0.28, 0.28, 22),
      node(0.28, 0.72, 22),
      node(0.46, 0.22, 0, 0, NodeType.RELAY),
      node(0.46, 0.78, 0, 0, NodeType.RELAY),
      node(0.58, 0.50, 24),
      node(0.72, 0.22, 0, 0, NodeType.RELAY),
      node(0.82, 0.34, 24, 2),
      node(0.82, 0.66, 24, 2),
    ],
  }),
  24: () => levelLayout({
    nodes: [
      node(0.12, 0.50, 30, 1),
      node(0.24, 0.24, 24),
      node(0.24, 0.76, 24),
      node(0.42, 0.20, 0, 0, NodeType.RELAY),
      node(0.42, 0.80, 0, 0, NodeType.RELAY),
      node(0.56, 0.50, 26),
      node(0.70, 0.20, 0, 0, NodeType.RELAY),
      node(0.70, 0.80, 0, 0, NodeType.RELAY),
      node(0.84, 0.34, 26, 2),
      node(0.84, 0.66, 26, 2),
    ],
  }),
  25: () => levelLayout({
    nodes: [
      node(0.12, 0.50, 30, 1),
      node(0.28, 0.26, 22),
      node(0.28, 0.74, 22),
      node(0.44, 0.50, 0, 0, NodeType.RELAY),
      node(0.58, 0.26, 24),
      node(0.58, 0.74, 24),
      node(0.72, 0.50, 0, 0, NodeType.RELAY),
      node(0.84, 0.32, 28, 2),
      node(0.84, 0.68, 28, 2),
      node(0.94, 0.50, 20),
    ],
    pulsars: [
      pulsar(0.58, 0.18, 0.22),
    ],
  }),
  26: () => levelLayout({
    nodes: [
      node(0.10, 0.50, 32, 1),
      node(0.22, 0.24, 24),
      node(0.22, 0.76, 24),
      node(0.40, 0.22, 0, 0, NodeType.RELAY),
      node(0.40, 0.78, 0, 0, NodeType.RELAY),
      node(0.56, 0.50, 28),
      node(0.68, 0.22, 0, 0, NodeType.RELAY),
      node(0.68, 0.78, 0, 0, NodeType.RELAY),
      node(0.82, 0.24, 28, 2),
      node(0.82, 0.76, 28, 2),
      node(0.92, 0.50, 22, 2),
    ],
    pulsars: [
      pulsar(0.50, 0.18, 0.18),
      pulsar(0.50, 0.82, 0.18),
    ],
  }),
  27: () => levelLayout({
    nodes: [
      node(0.10, 0.50, 32, 1),
      node(0.18, 0.22, 25),
      node(0.18, 0.78, 25),
      node(0.34, 0.18, 0, 0, NodeType.RELAY),
      node(0.34, 0.50, 26),
      node(0.34, 0.82, 0, 0, NodeType.RELAY),
      node(0.52, 0.24, 28),
      node(0.68, 0.18, 0, 0, NodeType.RELAY),
      node(0.68, 0.82, 0, 0, NodeType.RELAY),
      node(0.84, 0.20, 28, 2),
      node(0.84, 0.50, 32, 2),
      node(0.84, 0.80, 28, 2),
    ],
    pulsars: [
      pulsar(0.50, 0.18, 0.18),
      pulsar(0.50, 0.82, 0.18),
    ],
  }),
  28: () => levelLayout({
    nodes: [
      node(0.10, 0.50, 34, 1),
      node(0.22, 0.24, 24),
      node(0.22, 0.76, 24),
      node(0.40, 0.22, 0, 0, NodeType.RELAY, { isBunker: true }),
      node(0.40, 0.78, 0, 0, NodeType.RELAY, { isBunker: true }),
      node(0.54, 0.50, 0, 0, NodeType.SIGNAL, { captureThreshold: 30 }),
      node(0.68, 0.22, 0, 0, NodeType.RELAY),
      node(0.68, 0.78, 0, 0, NodeType.RELAY),
      node(0.82, 0.20, 32, 2),
      node(0.82, 0.50, 30, 2),
      node(0.82, 0.80, 32, 2),
      node(0.94, 0.50, 20),
    ],
    pulsars: [
      pulsar(0.50, 0.18, 0.17),
      pulsar(0.50, 0.50, 0.15),
      pulsar(0.50, 0.82, 0.17),
    ],
  }),
  29: () => levelLayout({
    nodes: [
      node(0.10, 0.50, 36, 1),
      node(0.20, 0.22, 25),
      node(0.20, 0.78, 25),
      node(0.34, 0.18, 0, 0, NodeType.RELAY),
      node(0.34, 0.50, 26),
      node(0.34, 0.82, 0, 0, NodeType.RELAY),
      node(0.52, 0.20, 0, 0, NodeType.RELAY),
      node(0.52, 0.80, 0, 0, NodeType.RELAY),
      node(0.68, 0.50, 28),
      node(0.82, 0.20, 32, 2),
      node(0.82, 0.50, 34, 2),
      node(0.82, 0.80, 32, 2),
      node(0.94, 0.36, 24, 3),
    ],
    pulsars: [
      pulsar(0.44, 0.18, 0.16),
      pulsar(0.60, 0.50, 0.18),
      pulsar(0.44, 0.82, 0.16),
    ],
  }),
  30: () => levelLayout({
    nodes: [
      node(0.10, 0.50, 38, 1),
      node(0.20, 0.22, 20, 1),
      node(0.20, 0.78, 26),
      node(0.34, 0.18, 0, 0, NodeType.RELAY),
      node(0.34, 0.50, 26),
      node(0.34, 0.82, 0, 0, NodeType.RELAY),
      node(0.52, 0.50, 0, 0, NodeType.SIGNAL, { captureThreshold: 30 }),
      node(0.62, 0.18, 0, 0, NodeType.RELAY),
      node(0.62, 0.82, 0, 0, NodeType.RELAY),
      node(0.76, 0.20, 32, 2),
      node(0.76, 0.50, 34, 2),
      node(0.76, 0.80, 32, 2),
      node(0.90, 0.34, 28, 3),
      node(0.90, 0.66, 24),
    ],
    pulsars: [
      pulsar(0.44, 0.18, 0.16),
      pulsar(0.44, 0.82, 0.16),
      pulsar(0.62, 0.50, 0.18),
    ],
  }),
  31: () => levelLayout({
    nodes: [
      node(0.08, 0.50, 38, 1),
      node(0.16, 0.20, 26),
      node(0.16, 0.80, 26),
      node(0.30, 0.18, 0, 0, NodeType.RELAY),
      node(0.30, 0.82, 0, 0, NodeType.RELAY),
      node(0.48, 0.20, 0, 0, NodeType.RELAY),
      node(0.48, 0.50, 0, 0, NodeType.SIGNAL, { captureThreshold: 30 }),
      node(0.48, 0.80, 0, 0, NodeType.RELAY),
      node(0.66, 0.18, 26, 3),
      node(0.66, 0.82, 26, 2),
      node(0.80, 0.18, 30, 2),
      node(0.80, 0.38, 34, 2),
      node(0.80, 0.62, 34, 2),
      node(0.80, 0.82, 30, 2),
    ],
    pulsars: [
      pulsar(0.38, 0.18, 0.15),
      pulsar(0.38, 0.82, 0.15),
      pulsar(0.58, 0.18, 0.15),
      pulsar(0.58, 0.82, 0.15),
    ],
  }),
  32: () => levelLayout({
    nodes: [
      node(0.08, 0.50, 42, 1),
      node(0.16, 0.22, 22, 1),
      node(0.16, 0.78, 22, 1),
      node(0.30, 0.18, 0, 0, NodeType.RELAY, { isBunker: true }),
      node(0.30, 0.50, 26),
      node(0.30, 0.82, 0, 0, NodeType.RELAY, { isBunker: true }),
      node(0.46, 0.20, 0, 0, NodeType.RELAY),
      node(0.46, 0.50, 0, 0, NodeType.SIGNAL, { captureThreshold: 30 }),
      node(0.46, 0.80, 0, 0, NodeType.RELAY),
      node(0.64, 0.18, 0, 0, NodeType.RELAY, { isBunker: true }),
      node(0.64, 0.50, 28, 3),
      node(0.64, 0.82, 28, 3),
      node(0.80, 0.18, 30, 2),
      node(0.80, 0.50, 38, 2),
      node(0.80, 0.82, 30, 2),
    ],
    pulsars: [
      pulsar(0.38, 0.18, 0.14),
      pulsar(0.38, 0.82, 0.14),
      pulsar(0.58, 0.18, 0.14),
      pulsar(0.58, 0.82, 0.14),
      pulsar(0.52, 0.50, 0.74, { interval: 9, strength: 45, isSuper: true }),
    ],
  }),
};

export function getFixedCampaignLayout(levelId, width, height) {
  const builder = FIXED_LAYOUT_BUILDERS[levelId];
  if (!builder) return null;

  const layout = builder();
  return {
    nodes: layout.nodes.map(spec => scaleNode(spec, width, height)),
    hazards: (layout.hazards || []).map(spec => scaleHazard(spec, width, height)),
    pulsars: (layout.pulsars || []).map(spec => scalePulsar(spec, width, height)),
  };
}
