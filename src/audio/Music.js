/* ================================================================
   Procedural music engine

   The soundtrack is grouped by gameplay context instead of per-level
   one-offs so the campaign can scale musical identity without needing
   a unique track for every single phase.

   Menu theme remains sacred. Gameplay themes are selected through
   Music.playLevelTheme(levelConfig), which maps phase groups to a
   reusable procedural motif and exposes metadata for UI notifications.
   ================================================================ */

import { STATE } from '../core/GameState.js';

let audioContext = null;
let masterGainNode = null;
let isPlayingTrack = false;
let currentTrack = null;
let scheduledTimers = [];
let beatIntervalId = null;
let trackChangeListener = null;
let pausedTrackId = null;
let previewTrackId = null;
let isPreviewPlayback = false;
let preservePreviewOnPlay = false;

const C3 = 130.81;
const D3 = 146.83;
const E3 = 164.81;
const F3 = 174.61;
const G3 = 196.00;
const A3 = 220.00;
const Bb3 = 233.08;
const B3 = 246.94;
const C4 = 261.63;
const D4 = 293.66;
const E4 = 329.63;
const F4 = 349.23;
const G4 = 392.00;
const A4 = 440.00;
const Bb4 = 466.16;
const B4 = 493.88;
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.26;
const F5 = 698.46;
const G5 = 784.00;
const A5 = 880.00;
const B5 = 987.77;

const TRACKS = Object.freeze({
  menu: {
    id: 'menu',
    titleKey: 'trackDriftSignal',
    roleKey: 'trackRoleMenu',
    icon: '◈',
    bpm: 78,
    loopSeconds: 16,
    kind: 'menu',
    phaseRangeLabel: 'Menu',
  },
  genesisPulse: {
    id: 'genesisPulse',
    titleKey: 'trackGenesisPulse',
    roleKey: 'trackRoleWorld1Opening',
    icon: '◈',
    bpm: 82,
    loopSeconds: 15,
    kind: 'world1',
    phaseRangeLabel: 'World 1 tutorial · phases 1-4',
  },
  siegeBloom: {
    id: 'siegeBloom',
    titleKey: 'trackSiegeBloom',
    roleKey: 'trackRoleWorld1Pressure',
    icon: '◈',
    bpm: 86,
    loopSeconds: 14,
    kind: 'world1',
    phaseRangeLabel: 'World 1 phases 5-9',
  },
  echoCore: {
    id: 'echoCore',
    titleKey: 'trackEchoCore',
    roleKey: 'trackRoleBoss',
    icon: '✦',
    bpm: 92,
    loopSeconds: 14,
    kind: 'boss',
    phaseRangeLabel: 'World 1 phase 10',
  },
  hollowSignal: {
    id: 'hollowSignal',
    titleKey: 'trackHollowSignal',
    roleKey: 'trackRoleWorld2Opening',
    icon: '⊗',
    bpm: 72,
    loopSeconds: 18,
    kind: 'world2',
    phaseRangeLabel: 'World 2 tutorial · phases 12-14',
  },
  entropyCurrent: {
    id: 'entropyCurrent',
    titleKey: 'trackEntropyCurrent',
    roleKey: 'trackRoleWorld2Pressure',
    icon: '⊗',
    bpm: 76,
    loopSeconds: 17,
    kind: 'world2',
    phaseRangeLabel: 'World 2 phases 15-20',
  },
  oblivionGate: {
    id: 'oblivionGate',
    titleKey: 'trackOblivionGate',
    roleKey: 'trackRoleBoss',
    icon: '✦',
    bpm: 80,
    loopSeconds: 17,
    kind: 'boss',
    phaseRangeLabel: 'World 2 phase 21',
  },
  current: {
    id: 'current',
    titleKey: 'trackCurrent',
    roleKey: 'trackRoleWorld3Opening',
    icon: '⚡',
    bpm: 88,
    loopSeconds: 14,
    kind: 'world3',
    phaseRangeLabel: 'World 3 tutorial · phases 23-24',
  },
  signalWar: {
    id: 'signalWar',
    titleKey: 'trackSignalWar',
    roleKey: 'trackRoleWorld3Pressure',
    icon: '⚡',
    bpm: 94,
    loopSeconds: 13,
    kind: 'world3',
    phaseRangeLabel: 'World 3 phases 25-28',
  },
  transcendenceProtocol: {
    id: 'transcendenceProtocol',
    titleKey: 'trackTranscendenceProtocol',
    roleKey: 'trackRoleWorld3Finale',
    icon: '⚡',
    bpm: 98,
    loopSeconds: 13,
    kind: 'world3',
    phaseRangeLabel: 'World 3 phases 29-32',
  },
  networkAwakens: {
    id: 'networkAwakens',
    titleKey: 'trackNetworkAwakens',
    roleKey: 'trackRoleEnding',
    icon: '✦',
    bpm: 84,
    loopSeconds: 16,
    kind: 'ending',
    phaseRangeLabel: 'Campaign ending',
  },
  stella: {
    id: 'stella',
    titleKey: 'trackStella',
    roleKey: 'trackRoleBonusStella',
    icon: '✧',
    bpm: 129,
    loopSeconds: 15,
    kind: 'bonus',
    phaseRangeLabel: 'Soundtrack player bonus track',
  },
  aqueous: {
    id: 'aqueous',
    titleKey: 'trackAqueous',
    roleKey: 'trackRoleBonusAqueous',
    icon: '✧',
    bpm: 152,
    loopSeconds: 13,
    kind: 'bonus',
    phaseRangeLabel: 'Soundtrack player bonus track',
  },
});

const TRACK_ORDER = Object.freeze([
  'menu',
  'genesisPulse',
  'siegeBloom',
  'echoCore',
  'hollowSignal',
  'entropyCurrent',
  'oblivionGate',
  'current',
  'signalWar',
  'transcendenceProtocol',
  'networkAwakens',
  'stella',
  'aqueous',
]);

function getAudioContext() {
  // Keep a single shared Web Audio graph for menu, gameplay, and preview
  // playback so transitions do not fight over multiple contexts.
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      masterGainNode = audioContext.createGain();
      masterGainNode.gain.setValueAtTime(0.0, audioContext.currentTime);
      masterGainNode.connect(audioContext.destination);
    } catch {
      return null;
    }
  }
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  return audioContext;
}

function getMusicVolume() {
  if (isPreviewPlayback) return 1;
  return (STATE.settings.sound && STATE.settings.music) ? 1 : 0;
}

function osc(freq, type, dur, gain, delay = 0, detune = 0) {
  const activeAudioContext = getAudioContext();
  if (!activeAudioContext || !masterGainNode) return;

  try {
    const oscillator = activeAudioContext.createOscillator();
    const gainNode = activeAudioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = freq;
    oscillator.detune.value = detune;
    gainNode.gain.setValueAtTime(0, activeAudioContext.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(gain * getMusicVolume(), activeAudioContext.currentTime + delay + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, activeAudioContext.currentTime + delay + dur);
    oscillator.connect(gainNode);
    gainNode.connect(masterGainNode);
    oscillator.start(activeAudioContext.currentTime + delay);
    oscillator.stop(activeAudioContext.currentTime + delay + dur + 0.05);
  } catch {
    /* Audio scheduling should fail silently in unsupported contexts. */
  }
}

function noiseHit(dur, gain, delay = 0, freq = 800) {
  const activeAudioContext = getAudioContext();
  if (!activeAudioContext || !masterGainNode) return;

  try {
    const noiseBuffer = activeAudioContext.createBuffer(1, Math.ceil(activeAudioContext.sampleRate * dur), activeAudioContext.sampleRate);
    const channelData = noiseBuffer.getChannelData(0);
    for (let index = 0; index < channelData.length; index += 1) channelData[index] = Math.random() * 2 - 1;

    const bufferSource = activeAudioContext.createBufferSource();
    const gainNode = activeAudioContext.createGain();
    const bandPassFilter = activeAudioContext.createBiquadFilter();
    bandPassFilter.type = 'bandpass';
    bandPassFilter.frequency.value = freq;
    bandPassFilter.Q.value = 2;
    gainNode.gain.setValueAtTime(gain * getMusicVolume(), activeAudioContext.currentTime + delay);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, activeAudioContext.currentTime + delay + dur);
    bufferSource.buffer = noiseBuffer;
    bufferSource.connect(bandPassFilter);
    bandPassFilter.connect(gainNode);
    gainNode.connect(masterGainNode);
    bufferSource.start(activeAudioContext.currentTime + delay);
  } catch {
    /* Audio scheduling should fail silently in unsupported contexts. */
  }
}

function fadeIn(dur = 1.5) {
  const activeAudioContext = getAudioContext();
  if (!activeAudioContext || !masterGainNode) return;

  const targetGain = 0.35 * getMusicVolume();
  masterGainNode.gain.cancelScheduledValues(activeAudioContext.currentTime);
  masterGainNode.gain.setValueAtTime(masterGainNode.gain.value, activeAudioContext.currentTime);
  masterGainNode.gain.linearRampToValueAtTime(targetGain, activeAudioContext.currentTime + dur);
}

function fadeOut(dur = 1.0) {
  const activeAudioContext = getAudioContext();
  if (!activeAudioContext || !masterGainNode) return;

  masterGainNode.gain.cancelScheduledValues(activeAudioContext.currentTime);
  masterGainNode.gain.setValueAtTime(masterGainNode.gain.value, activeAudioContext.currentTime);
  masterGainNode.gain.linearRampToValueAtTime(0.0, activeAudioContext.currentTime + dur);
}

function stopAll() {
  scheduledTimers.forEach(timerId => clearTimeout(timerId));
  scheduledTimers = [];
  if (beatIntervalId) {
    clearInterval(beatIntervalId);
    beatIntervalId = null;
  }
  isPlayingTrack = false;
  currentTrack = null;
}

function scheduleTimer(callback, delayMs) {
  const timerId = setTimeout(callback, delayMs);
  scheduledTimers.push(timerId);
  return timerId;
}

function formatLoopDuration(loopSeconds) {
  const minutes = Math.floor(loopSeconds / 60);
  const seconds = Math.round(loopSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function getTrackInfo(trackId = currentTrack) {
  if (!trackId || !TRACKS[trackId]) return null;
  const trackDef = TRACKS[trackId];
  return {
    ...trackDef,
    durationLabel: formatLoopDuration(trackDef.loopSeconds),
  };
}

function announceTrackChange(trackDef) {
  if (typeof trackChangeListener !== 'function') return;
  trackChangeListener(getTrackInfo(trackDef.id));
}

function beginTrack(trackId, fadeInDuration) {
  if (isPlayingTrack && currentTrack === trackId) return false;
  stopAll();
  const activeAudioContext = getAudioContext();
  currentTrack = trackId;
  pausedTrackId = null;
  if (getMusicVolume() > 0) announceTrackChange(TRACKS[trackId]);
  if (!activeAudioContext) {
    isPlayingTrack = false;
    return false;
  }
  isPlayingTrack = true;
  fadeIn(fadeInDuration);
  return true;
}

/*
 * Marks the soundtrack runtime as being in manual preview mode.
 * This lets Settings playback browse tracks without relying on campaign context.
 */
function beginPreviewPlayback() {
  isPreviewPlayback = true;
  previewTrackId ||= TRACK_ORDER[0];
}

/*
 * Returns the soundtrack runtime to normal contextual playback mode.
 */
function endPreviewPlayback() {
  isPreviewPlayback = false;
}

/*
 * Clears preview state when gameplay-driven playback takes ownership again.
 */
function syncPreviewStateForNormalPlayback() {
  if (!preservePreviewOnPlay) endPreviewPlayback();
}

function playLayeredTheme(trackId, config) {
  if (!beginTrack(trackId, config.fadeInDuration ?? 1.8)) return;

  let chordIndex = 0;
  let beatStep = 0;
  const beatMs = 60000 / config.bpm;
  const beatStepMs = beatMs / 4;

  function playCycle() {
    if (!isPlayingTrack || currentTrack !== trackId) return;

    const chordFrequencies = config.chords[chordIndex];
    const bassFrequency = config.bassLine?.[chordIndex] || chordFrequencies[0] / 2;
    osc(bassFrequency, 'sine', config.cycleDurationSec ?? 3.6, config.bassGain ?? 0.22, 0);

    chordFrequencies.forEach((frequency, index) => {
      osc(frequency, config.chordWaveA ?? 'triangle', config.chordDurationSec ?? 3.2, config.chordGainA ?? 0.08, config.chordDelaySec ?? 0.04, index * (config.chordDetuneStep ?? 4));
      osc(frequency, config.chordWaveB ?? 'sine', config.chordDurationSec ?? 3.2, config.chordGainB ?? 0.05, config.chordDelaySec ?? 0.04, -index * (config.chordDetuneStep ?? 4));
    });

    (config.arpPrimary?.[chordIndex] || []).forEach((frequency, index) => {
      osc(
        frequency,
        config.arpPrimaryWave ?? 'triangle',
        config.arpPrimaryDurSec ?? 0.18,
        config.arpPrimaryGain ?? 0.09,
        (config.arpPrimaryDelaySec ?? 0.1) + index * (config.arpPrimaryStepSec ?? 0.24),
      );
    });

    (config.arpSecondary?.[chordIndex] || []).forEach((frequency, index) => {
      osc(
        frequency,
        config.arpSecondaryWave ?? 'sine',
        config.arpSecondaryDurSec ?? 0.15,
        config.arpSecondaryGain ?? 0.06,
        (config.arpSecondaryDelaySec ?? 0.2) + index * (config.arpSecondaryStepSec ?? 0.21),
      );
    });

    if (config.accentNoteProbability && Math.random() <= config.accentNoteProbability) {
      const accentSequence = config.arpSecondary?.[chordIndex] || config.arpPrimary?.[chordIndex] || [];
      const accentNote = accentSequence[Math.max(0, accentSequence.length - 1)];
      if (accentNote) {
        osc(
          accentNote * (config.accentNoteOctaveMultiplier ?? 2),
          'sine',
          config.accentNoteDurSec ?? 0.14,
          config.accentNoteGain ?? 0.04,
          config.accentNoteDelaySec ?? 0.9,
        );
      }
    }

    chordIndex = (chordIndex + 1) % config.chords.length;
    scheduleTimer(playCycle, config.cycleMs);
  }

  beatIntervalId = setInterval(() => {
    if (!isPlayingTrack || currentTrack !== trackId) {
      clearInterval(beatIntervalId);
      return;
    }

    const patternStep = beatStep % 16;
    if (config.kick?.[patternStep]) noiseHit(config.kickDurSec ?? 0.16, config.kickGain ?? 0.05, 0, config.kickFreq ?? 75);
    if (config.snare?.[patternStep]) noiseHit(config.snareDurSec ?? 0.10, config.snareGain ?? 0.032, 0, config.snareFreq ?? 240);
    if (config.hat?.[patternStep]) noiseHit(config.hatDurSec ?? 0.05, config.hatGain ?? 0.02, 0, config.hatFreq ?? 4800);
    beatStep += 1;
  }, beatStepMs);

  playCycle();
}

/* ╔══════════════════════════════════════════════════════════╗
   ║  "DRIFT SIGNAL" — MENU THEME   (SACRED — DO NOT MODIFY)║
   ╚══════════════════════════════════════════════════════════╝ */
function playMenu() {
  syncPreviewStateForNormalPlayback();
  if (!beginTrack('menu', 2.0)) return;

  const chords = [
    [A3, C4, E4],
    [F3, A3, C4],
    [C3, E4, G4],
    [G3, B4, D4],
  ];
  const arpUp = [
    [C4, E4, A4, C5],
    [F3, A3, F4, A4],
    [C4, E4, G4, C5],
    [G3, B4, G4, B4],
  ];
  const bpm = 78;
  const beatMs = 60000 / bpm;
  const stepMs = beatMs / 4;
  const hatPattern = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
  const kickPattern = [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
  let chordIndex = 0;
  let beatStep = 0;

  function playChordCycle() {
    if (!isPlayingTrack || currentTrack !== 'menu') return;
    const chordFrequencies = chords[chordIndex];
    osc(chordFrequencies[0] / 2, 'sine', 3.8, 0.28, 0);
    chordFrequencies.forEach((frequency, index) => {
      osc(frequency, 'triangle', 3.5, 0.10, 0.05, index * 3);
      osc(frequency, 'sine', 3.5, 0.07, 0.05, -index * 2);
    });
    arpUp[chordIndex].forEach((frequency, index) => osc(frequency, 'triangle', 0.18, 0.12, index * 0.22 + 0.1));
    chordIndex = (chordIndex + 1) % 4;
    scheduleTimer(playChordCycle, 4000);
  }

  beatIntervalId = setInterval(() => {
    if (!isPlayingTrack || currentTrack !== 'menu') {
      clearInterval(beatIntervalId);
      return;
    }
    const patternStep = beatStep % 16;
    if (kickPattern[patternStep]) noiseHit(0.14, 0.06, 0, 80);
    if (hatPattern[patternStep]) noiseHit(0.05, 0.025, 0, 5000);
    beatStep += 1;
  }, stepMs);

  playChordCycle();
}
/* END "DRIFT SIGNAL" — SACRED ZONE ENDS HERE */

function playGenesis() {
  syncPreviewStateForNormalPlayback();
  playLayeredTheme('genesisPulse', {
    fadeInDuration: 1.8,
    bpm: 82,
    cycleMs: 3700,
    chords: [
      [A3, E4, A4],
      [C3, G4, C5],
      [F3, A3, F4],
      [G3, D4, G4],
    ],
    arpPrimary: [
      [A3, E4, A4, C5],
      [C4, E4, G4, C5],
      [F3, C4, F4, A4],
      [G3, D4, B4, G4],
    ],
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    accentNoteProbability: 0.55,
    accentNoteDelaySec: 0.6,
    bassGain: 0.24,
  });
}

function playSiegeBloom() {
  syncPreviewStateForNormalPlayback();
  playLayeredTheme('siegeBloom', {
    fadeInDuration: 1.6,
    bpm: 102,
    cycleMs: 3000,
    chords: [
      [A3, C4, E4],
      [C4, E4, G4],
      [F3, A3, C4],
      [G3, B3, D4],
    ],
    arpPrimary: [
      [A3, E4, A4, C5],
      [C4, G4, C5, E5],
      [F3, C4, F4, A4],
      [G3, D4, G4, B4],
    ],
    arpSecondary: [
      [E4, A4, C5, E5],
      [G4, C5, E5, G5],
      [C4, F4, A4, C5],
      [D4, G4, B4, D5],
    ],
    kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1],
    accentNoteProbability: 0.7,
    accentNoteDelaySec: 0.56,
    bassGain: 0.22,
    arpPrimaryGain: 0.1,
    arpSecondaryGain: 0.085,
    hatGain: 0.022,
    kickGain: 0.056,
    snareGain: 0.04,
  });
}

function playEchoCore() {
  syncPreviewStateForNormalPlayback();
  playLayeredTheme('echoCore', {
    fadeInDuration: 1.5,
    bpm: 108,
    cycleMs: 2800,
    chords: [
      [A3, E4, A4],
      [F3, A3, C4],
      [C4, E4, G4],
      [G3, B3, D4],
    ],
    arpPrimary: [
      [A3, E4, A4, C5],
      [F3, A3, C4, F4],
      [C4, E4, G4, C5],
      [G3, B3, D4, G4],
    ],
    arpSecondary: [
      [C5, E5, A5],
      [F4, A4, C5],
      [G4, C5, E5],
      [B4, D5, G5],
    ],
    kick: [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1],
    bassGain: 0.24,
    chordGainA: 0.095,
    chordGainB: 0.065,
    arpPrimaryGain: 0.11,
    arpSecondaryGain: 0.09,
    accentNoteProbability: 0.85,
    accentNoteDelaySec: 0.48,
    kickGain: 0.058,
    snareGain: 0.042,
    hatGain: 0.022,
  });
}

function playVoid() {
  syncPreviewStateForNormalPlayback();
  playLayeredTheme('hollowSignal', {
    fadeInDuration: 2.2,
    bpm: 72,
    cycleMs: 4400,
    chords: [
      [D3, F3, A3],
      [Bb3, D4, F4],
      [F3, A3, C4],
      [C4, E4, G4],
    ],
    bassLine: [D3 / 2, Bb3 / 2, F3 / 2, C3 / 2],
    arpPrimary: [
      [D3, F3, A3, D4],
      [Bb3, D4, F4, Bb4],
      [F3, A3, C4, F4],
      [C4, E4, G4, C5],
    ],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    hat: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    kickGain: 0.05,
    hatGain: 0.018,
    hatFreq: 3500,
    bassGain: 0.22,
    chordGainA: 0.08,
    chordGainB: 0.05,
    accentNoteProbability: 0.5,
    accentNoteDelaySec: 1.25,
  });
}

function playEntropyCurrent() {
  syncPreviewStateForNormalPlayback();
  playLayeredTheme('entropyCurrent', {
    fadeInDuration: 1.9,
    bpm: 90,
    cycleMs: 3500,
    chords: [
      [D3, A3, D4],
      [Bb3, F4, Bb4],
      [F3, C4, F4],
      [C4, G4, C5],
    ],
    bassLine: [D3 / 2, Bb3 / 2, F3 / 2, C3 / 2],
    arpPrimary: [
      [D3, F3, A3, D4],
      [Bb3, D4, F4, Bb4],
      [F3, A3, C4, F4],
      [C4, E4, G4, C5],
    ],
    arpSecondary: [
      [A4, D5, F5],
      [F4, Bb4, D5],
      [C5, F5, A5],
      [G4, C5, E5],
    ],
    kick: [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    snare: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    hat: [1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0],
    kickFreq: 70,
    hatFreq: 4400,
    bassGain: 0.2,
    arpPrimaryGain: 0.095,
    arpSecondaryGain: 0.08,
    accentNoteProbability: 0.7,
    accentNoteDelaySec: 0.68,
    kickGain: 0.05,
    snareGain: 0.03,
    hatGain: 0.019,
  });
}

function playOblivionGate() {
  syncPreviewStateForNormalPlayback();
  playLayeredTheme('oblivionGate', {
    fadeInDuration: 1.6,
    bpm: 84,
    cycleMs: 3900,
    chords: [
      [D3, F3, A3],
      [Bb3, D4, F4],
      [F3, A3, C4],
      [C4, E4, G4],
    ],
    bassLine: [D3 / 2, Bb3 / 2, F3 / 2, C3 / 2],
    arpPrimary: [
      [D3, A3, D4, F4],
      [Bb3, F4, Bb4, D5],
      [F3, C4, F4, A4],
      [C4, G4, C5, E5],
    ],
    arpSecondary: [
      [A4, D5, F5],
      [D5, F5, Bb4],
      [C5, F5, A4],
      [E5, G5, C5],
    ],
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
    hat: [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    kickGain: 0.054,
    snareGain: 0.038,
    hatGain: 0.017,
    bassGain: 0.23,
    arpPrimaryGain: 0.1,
    arpSecondaryGain: 0.08,
    accentNoteProbability: 0.85,
    accentNoteDelaySec: 0.94,
  });
}

function playNexus() {
  syncPreviewStateForNormalPlayback();
  playLayeredTheme('current', {
    fadeInDuration: 1.4,
    bpm: 88,
    cycleMs: 3400,
    chords: [
      [A3, E4, A4],
      [E3, B3, E4],
      [F3, A3, C4],
      [G3, D4, G4],
    ],
    arpPrimary: [
      [A3, C4, E4, A4],
      [E3, G3, B3, E4],
      [F3, A3, C4, F4],
      [G3, B3, D4, G4],
    ],
    arpSecondary: [
      [C4, E4, A4, C5],
      [B3, E4, G4, B4],
      [A3, C4, F4, A4],
      [D4, G4, B4, D5],
    ],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
    kickGain: 0.05,
    snareGain: 0.035,
    hatGain: 0.018,
    hatFreq: 6000,
    bassGain: 0.20,
    accentNoteProbability: 0.55,
    accentNoteDelaySec: 0.75,
  });
}

function playSignalWar() {
  syncPreviewStateForNormalPlayback();
  playLayeredTheme('signalWar', {
    fadeInDuration: 1.35,
    bpm: 112,
    cycleMs: 2600,
    chords: [
      [A3, C4, E4],
      [E3, G3, B3],
      [F3, A3, C4],
      [G3, B3, D4],
    ],
    arpPrimary: [
      [A3, C4, E4, A4],
      [E3, G3, B3, E4],
      [F3, A3, C4, F4],
      [G3, B3, D4, G4],
    ],
    arpSecondary: [
      [E4, A4, C5, E5],
      [B4, E5, G5, B5],
      [C5, F4, A4, C5],
      [D5, G4, B4, D5],
    ],
    kick: [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1],
    kickGain: 0.053,
    snareGain: 0.038,
    hatGain: 0.025,
    bassGain: 0.2,
    arpPrimaryGain: 0.1,
    arpSecondaryGain: 0.088,
    accentNoteProbability: 0.72,
    accentNoteDelaySec: 0.44,
  });
}

function playTranscendenceProtocol() {
  syncPreviewStateForNormalPlayback();
  playLayeredTheme('transcendenceProtocol', {
    fadeInDuration: 1.2,
    bpm: 118,
    cycleMs: 2450,
    chords: [
      [A3, E4, A4],
      [E3, B3, E4],
      [F3, A3, C4],
      [G3, B3, D4],
    ],
    arpPrimary: [
      [A3, C4, E4, A4],
      [E3, G3, B3, E4],
      [F3, A3, C4, F4],
      [G3, B3, D4, G4],
    ],
    arpSecondary: [
      [C5, E5, A5],
      [B4, E5, G5],
      [A4, C5, F5],
      [B4, D5, G5],
    ],
    kick: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
    kickGain: 0.056,
    snareGain: 0.04,
    hatGain: 0.026,
    bassGain: 0.22,
    chordGainA: 0.085,
    chordGainB: 0.06,
    arpPrimaryGain: 0.105,
    arpSecondaryGain: 0.09,
    accentNoteProbability: 0.92,
    accentNoteDelaySec: 0.38,
  });
}

function playEnding() {
  syncPreviewStateForNormalPlayback();
  playLayeredTheme('networkAwakens', {
    fadeInDuration: 2.0,
    bpm: 84,
    cycleMs: 4000,
    chords: [
      [A3, C4, E4],
      [F3, A3, C4],
      [C4, E4, G4],
      [G3, B3, D4],
    ],
    arpPrimary: [
      [A3, C4, E4, A4],
      [F3, A3, C4, F4],
      [C4, E4, G4, C5],
      [G3, B3, D4, G4],
    ],
    arpSecondary: [
      [A4, C5, E5],
      [A4, C5, F5],
      [G4, C5, E5],
      [B4, D5, G5],
    ],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    hat: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    kickGain: 0.04,
    snareGain: 0.02,
    hatGain: 0.012,
    bassGain: 0.18,
    chordGainA: 0.10,
    chordGainB: 0.07,
    arpPrimaryGain: 0.10,
    arpSecondaryGain: 0.075,
    accentNoteProbability: 0.95,
    accentNoteDelaySec: 1.2,
  });
}

/*
 * Bonus soundtrack track for manual listening in Settings.
 * It aims for a brighter, guitar-song-like lift while staying inside the
 * project's procedural synth vocabulary.
 */
function playStella() {
  syncPreviewStateForNormalPlayback();
  if (!beginTrack('stella', 1.4)) return;

  const Cs4 = 277.18;
  const D4 = 293.66;
  const E4 = 329.63;
  const Fs4 = 369.99;
  const Gs4 = 415.30;
  const A4 = 440.00;
  const B4 = 493.88;
  const Cs5 = 554.37;
  const D5 = 587.33;
  const E5 = 659.26;
  const Fs5 = 739.99;
  const Gs5 = 830.61;
  const A5 = 880.00;
  const B5 = 987.77;

  const bpm = 129;
  const beatMs = 60000 / bpm;
  const stepMs = beatMs / 4;
  const cycleMs = 3720;

  const chordBeds = [
    [A3, Cs4, E4],
    [E3, Gs4, B4],
    [Fs4, A4, Cs5],
    [D4, Fs4, A4],
  ];
  const bassLine = [A3 / 2, E3 / 2, Fs4 / 2, D4 / 2];
  const leadMotifs = [
    [E4, A4, B4, Cs5, B4, A4, E4, Cs5],
    [B4, Gs4, E4, Gs4, B4, E5, B4, Gs4],
    [Cs5, A4, Fs4, A4, Cs5, E5, Fs5, E5],
    [A4, Fs4, D4, Fs4, A4, D5, E5, Fs5],
  ];
  const sparkleMotifs = [
    [A5, E5, Cs5],
    [B5, Gs5, E5],
    [A5, Fs5, Cs5],
    [Fs5, E5, D5],
  ];
  const sectionPatterns = [
    {
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      kickGain: 0.042,
      snareGain: 0.024,
      hatGain: 0.017,
      bassGain: 0.16,
      bedGainA: 0.075,
      bedGainB: 0.052,
      leadGain: 0.082,
      sparkleGain: 0.0,
    },
    {
      kick: [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1],
      kickGain: 0.05,
      snareGain: 0.03,
      hatGain: 0.022,
      bassGain: 0.19,
      bedGainA: 0.085,
      bedGainB: 0.057,
      leadGain: 0.095,
      sparkleGain: 0.03,
    },
    {
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      hat: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
      kickGain: 0.03,
      snareGain: 0.018,
      hatGain: 0.012,
      bassGain: 0.12,
      bedGainA: 0.06,
      bedGainB: 0.04,
      leadGain: 0.07,
      sparkleGain: 0.018,
    },
    {
      kick: [1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1],
      kickGain: 0.052,
      snareGain: 0.033,
      hatGain: 0.024,
      bassGain: 0.2,
      bedGainA: 0.09,
      bedGainB: 0.06,
      leadGain: 0.105,
      sparkleGain: 0.04,
    },
  ];

  let cycleIndex = 0;
  let beatStep = 0;

  /*
   * Schedule the harmonic and melodic layer for the next Stella section.
   * Input: none; it advances through internal section state.
   * Output: queues oscillators for the active cycle and schedules the next pass.
   */
  function playCycle() {
    if (!isPlayingTrack || currentTrack !== 'stella') return;

    const section = sectionPatterns[cycleIndex % sectionPatterns.length];
    const chord = chordBeds[cycleIndex % chordBeds.length];
    const bass = bassLine[cycleIndex % bassLine.length];
    const lead = leadMotifs[cycleIndex % leadMotifs.length];
    const sparkle = sparkleMotifs[cycleIndex % sparkleMotifs.length];

    osc(bass, 'sine', 3.5, section.bassGain, 0);
    chord.forEach((frequency, index) => {
      osc(frequency, 'triangle', 3.35, section.bedGainA, 0.04, index * 4);
      osc(frequency, 'sine', 3.2, section.bedGainB, 0.04, -index * 3);
    });

    lead.forEach((frequency, index) => {
      osc(frequency, index % 2 === 0 ? 'triangle' : 'sine', 0.22, section.leadGain, 0.12 + index * 0.18);
    });

    sparkle.forEach((frequency, index) => {
      if (section.sparkleGain <= 0) return;
      osc(frequency, 'sine', 0.12, section.sparkleGain, 0.72 + index * 0.28);
    });

    if (cycleIndex % 4 === 3) {
      osc(lead[3], 'triangle', 0.32, section.leadGain * 0.8, 1.7);
      osc(lead[5], 'sine', 0.25, section.sparkleGain + 0.02, 1.95);
    }

    cycleIndex = (cycleIndex + 1) % chordBeds.length;
    scheduleTimer(playCycle, cycleMs);
  }

  /*
   * Drive the per-step drum accents independently from the slower harmonic
   * cycle so Stella can keep a song-like pulse without duplicating note logic.
   */
  beatIntervalId = setInterval(() => {
    if (!isPlayingTrack || currentTrack !== 'stella') {
      clearInterval(beatIntervalId);
      return;
    }

    const section = sectionPatterns[cycleIndex % sectionPatterns.length];
    const patternStep = beatStep % 16;
    if (section.kick[patternStep]) noiseHit(0.14, section.kickGain, 0, 78);
    if (section.snare[patternStep]) noiseHit(0.08, section.snareGain, 0, 250);
    if (section.hat[patternStep]) noiseHit(0.045, section.hatGain, 0, 5600);
    beatStep += 1;
  }, stepMs);

  playCycle();
}

/*
 * Bonus soundtrack track rebuilt from an authored reference package.
 * It keeps a fast aqueous pulse, an open A-centered harmonic field, and
 * stronger section contrasts than the standard campaign themes.
 */
function playAqueous() {
  syncPreviewStateForNormalPlayback();
  if (!beginTrack('aqueous', 1.3)) return;

  const Cs4 = 277.18;
  const Fs4 = 369.99;
  const Gs4 = 415.30;
  const Cs5 = 554.37;
  const D5 = 587.33;
  const E5 = 659.26;
  const Fs5 = 739.99;
  const Gs5 = 830.61;
  const A5 = 880.00;
  const B5 = 987.77;

  const bpm = 152;
  const beatMs = 60000 / bpm;
  const stepMs = beatMs / 4;
  const cycleMs = beatMs * 8;

  const chordBeds = [
    [A3, Cs4, E4],
    [G3, B3, D4],
    [D3, Fs4, A4],
    [E3, Gs4, B4],
  ];
  const bassLine = [A3 / 2, G3 / 2, D3 / 2, E3 / 2];
  const leadMotifs = [
    [E4, Fs4, A4, B4, A4, Fs4, E4, D4],
    [D4, E4, G4, A4, G4, E4, D4, B3],
    [A4, B4, D5, E5, D5, B4, A4, Fs4],
    [B4, A4, Gs4, E4, Fs4, Gs4, B4, Cs5],
  ];
  const waterMotifs = [
    [A5, E5, B4],
    [Gs5, D5, B4],
    [Fs5, D5, A4],
    [B5, Gs5, E5],
  ];
  const sectionPatterns = [
    {
      kick: [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1],
      kickGain: 0.046,
      snareGain: 0.025,
      hatGain: 0.02,
      bassGain: 0.16,
      bedGainA: 0.064,
      bedGainB: 0.044,
      leadGain: 0.078,
      waterGain: 0.02,
    },
    {
      kick: [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1],
      kickGain: 0.052,
      snareGain: 0.03,
      hatGain: 0.024,
      bassGain: 0.185,
      bedGainA: 0.078,
      bedGainB: 0.052,
      leadGain: 0.093,
      waterGain: 0.03,
    },
    {
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      hat: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      kickGain: 0.026,
      snareGain: 0.014,
      hatGain: 0.011,
      bassGain: 0.11,
      bedGainA: 0.05,
      bedGainB: 0.032,
      leadGain: 0.058,
      waterGain: 0.042,
    },
    {
      kick: [1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
      kickGain: 0.056,
      snareGain: 0.034,
      hatGain: 0.028,
      bassGain: 0.2,
      bedGainA: 0.082,
      bedGainB: 0.058,
      leadGain: 0.1,
      waterGain: 0.034,
    },
  ];

  let cycleIndex = 0;
  let beatStep = 0;

  /*
   * Schedule the harmonic wash and lead hooks for the current Aqueous cycle.
   * Input: none; it advances its own section cursor.
   * Output: queues bass, chord, lead, and shimmer layers before scheduling the next cycle.
   */
  function playCycle() {
    if (!isPlayingTrack || currentTrack !== 'aqueous') return;

    const section = sectionPatterns[cycleIndex % sectionPatterns.length];
    const chord = chordBeds[cycleIndex % chordBeds.length];
    const bass = bassLine[cycleIndex % bassLine.length];
    const lead = leadMotifs[cycleIndex % leadMotifs.length];
    const water = waterMotifs[cycleIndex % waterMotifs.length];

    osc(bass, 'sine', 2.8, section.bassGain, 0);
    chord.forEach((frequency, index) => {
      osc(frequency, 'triangle', 2.6, section.bedGainA, 0.03, index * 5);
      osc(frequency, 'sine', 2.4, section.bedGainB, 0.03, -index * 4);
    });

    lead.forEach((frequency, index) => {
      osc(frequency, index % 3 === 0 ? 'triangle' : 'sine', 0.15, section.leadGain, 0.09 + index * 0.11);
    });

    water.forEach((frequency, index) => {
      osc(frequency, 'sine', 0.11, section.waterGain, 0.46 + index * 0.21);
    });

    if (cycleIndex % 4 === 3) {
      osc(lead[2], 'triangle', 0.24, section.leadGain * 0.72, 1.18);
      osc(water[0], 'sine', 0.18, section.waterGain + 0.02, 1.42);
      osc(Cs5, 'triangle', 0.16, section.waterGain + 0.01, 1.68);
    }

    cycleIndex = (cycleIndex + 1) % chordBeds.length;
    scheduleTimer(playCycle, cycleMs);
  }

  /*
   * Run the faster drum engine separately so Aqueous keeps a tight, driving
   * pulse even while the harmonic bed moves on slower eight-beat cycles.
   */
  beatIntervalId = setInterval(() => {
    if (!isPlayingTrack || currentTrack !== 'aqueous') {
      clearInterval(beatIntervalId);
      return;
    }

    const section = sectionPatterns[cycleIndex % sectionPatterns.length];
    const patternStep = beatStep % 16;
    if (section.kick[patternStep]) noiseHit(0.12, section.kickGain, 0, 82);
    if (section.snare[patternStep]) noiseHit(0.08, section.snareGain, 0, 270);
    if (section.hat[patternStep]) noiseHit(0.038, section.hatGain, 0, 6200);
    beatStep += 1;
  }, stepMs);

  playCycle();
}

function playLevelTheme(levelConfig) {
  // Track selection stays phase-band based so campaign pacing can change
  // without rewriting the runtime music routing.
  if (!levelConfig) {
    playMenu();
    return;
  }

  const levelId = levelConfig.id;
  const worldId = levelConfig.worldId || 1;

  if (worldId === 1) {
    if (levelConfig.isTutorial || levelId <= 4) playGenesis();
    else if (levelId === 10) playEchoCore();
    else playSiegeBloom();
    return;
  }

  if (worldId === 2) {
    if (levelConfig.isTutorial || levelId <= 14) playVoid();
    else if (levelId === 21) playOblivionGate();
    else playEntropyCurrent();
    return;
  }

  if (worldId === 3) {
    if (levelConfig.isTutorial || levelId <= 24) playNexus();
    else if (levelId >= 29) playTranscendenceProtocol();
    else playSignalWar();
    return;
  }

  playMenu();
}

/*
 * Plays a specific track by id for manual preview in Settings.
 * Input: a track id from TRACK_ORDER. Output: the requested track becomes current if available.
 */
function playTrackById(trackId) {
  // Preview mode intentionally bypasses campaign context so the Settings
  // soundtrack player can audition every available track on demand.
  beginPreviewPlayback();
  previewTrackId = TRACKS[trackId] ? trackId : TRACK_ORDER[0];
  preservePreviewOnPlay = true;
  try {
    switch (previewTrackId) {
      case 'menu': playMenu(); break;
      case 'genesisPulse': playGenesis(); break;
      case 'siegeBloom': playSiegeBloom(); break;
      case 'echoCore': playEchoCore(); break;
      case 'hollowSignal': playVoid(); break;
      case 'entropyCurrent': playEntropyCurrent(); break;
      case 'oblivionGate': playOblivionGate(); break;
      case 'current': playNexus(); break;
      case 'signalWar': playSignalWar(); break;
      case 'transcendenceProtocol': playTranscendenceProtocol(); break;
      case 'networkAwakens': playEnding(); break;
      case 'stella': playStella(); break;
      case 'aqueous': playAqueous(); break;
      default: playMenu(); break;
    }
  } finally {
    preservePreviewOnPlay = false;
  }
}

/*
 * Moves soundtrack preview playback backward or forward through the available track list.
 */
function stepTrack(offset) {
  const activeTrackId = previewTrackId || pausedTrackId || currentTrack || TRACK_ORDER[0];
  const activeTrackIndex = Math.max(0, TRACK_ORDER.indexOf(activeTrackId));
  const nextTrackIndex = (activeTrackIndex + offset + TRACK_ORDER.length) % TRACK_ORDER.length;
  playTrackById(TRACK_ORDER[nextTrackIndex]);
}

/*
 * Pauses or resumes manual soundtrack preview playback without changing the selected track.
 */
function togglePlayback() {
  if (isPlayingTrack && currentTrack) {
    pausedTrackId = currentTrack;
    fadeOut(0.25);
    scheduleTimer(() => {
      if (pausedTrackId) stopAll();
    }, 260);
    return;
  }

  beginPreviewPlayback();
  playTrackById(previewTrackId || pausedTrackId || currentTrack || TRACK_ORDER[0]);
}

/* ── UI SOUND EFFECTS ── */
function menuClick() {
  const activeAudioContext = getAudioContext();
  if (!activeAudioContext) return;

  try {
    const oscillator = activeAudioContext.createOscillator();
    const gainNode = activeAudioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 660;
    gainNode.gain.setValueAtTime(0.12 * getMusicVolume(), activeAudioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, activeAudioContext.currentTime + 0.09);
    oscillator.connect(gainNode);
    gainNode.connect(activeAudioContext.destination);
    oscillator.start();
    oscillator.stop(activeAudioContext.currentTime + 0.1);
  } catch {
    /* Audio scheduling should fail silently in unsupported contexts. */
  }

  setTimeout(() => {
    const delayedAudioContext = getAudioContext();
    if (!delayedAudioContext) return;

    try {
      const oscillator = delayedAudioContext.createOscillator();
      const gainNode = delayedAudioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gainNode.gain.setValueAtTime(0.09 * getMusicVolume(), delayedAudioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, delayedAudioContext.currentTime + 0.07);
      oscillator.connect(gainNode);
      gainNode.connect(delayedAudioContext.destination);
      oscillator.start();
      oscillator.stop(delayedAudioContext.currentTime + 0.08);
    } catch {
      /* Audio scheduling should fail silently in unsupported contexts. */
    }
  }, 50);
}

function menuHover() {
  const activeAudioContext = getAudioContext();
  if (!activeAudioContext) return;

  try {
    const oscillator = activeAudioContext.createOscillator();
    const gainNode = activeAudioContext.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 520;
    gainNode.gain.setValueAtTime(0.04 * getMusicVolume(), activeAudioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, activeAudioContext.currentTime + 0.06);
    oscillator.connect(gainNode);
    gainNode.connect(activeAudioContext.destination);
    oscillator.start();
    oscillator.stop(activeAudioContext.currentTime + 0.07);
  } catch {
    /* Audio scheduling should fail silently in unsupported contexts. */
  }
}

function tabSwitch() {
  const activeAudioContext = getAudioContext();
  if (!activeAudioContext) return;

  try {
    const oscillator = activeAudioContext.createOscillator();
    const gainNode = activeAudioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 440;
    gainNode.gain.setValueAtTime(0.08 * getMusicVolume(), activeAudioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.12 * getMusicVolume(), activeAudioContext.currentTime + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, activeAudioContext.currentTime + 0.12);
    oscillator.connect(gainNode);
    gainNode.connect(activeAudioContext.destination);
    oscillator.start();
    oscillator.stop(activeAudioContext.currentTime + 0.13);
  } catch {
    /* Audio scheduling should fail silently in unsupported contexts. */
  }
}

export const Music = {
  playMenu,
  playGenesis,
  playSiegeBloom,
  playEchoCore,
  playVoid,
  playEntropyCurrent,
  playOblivionGate,
  playNexus,
  playSignalWar,
  playTranscendenceProtocol,
  playEnding,
  playStella,
  playAqueous,
  playLevelTheme,
  playTrackById,
  /*
   * Steps to the previous previewable track and clears any paused-track latch.
   */
  previousTrack() {
    pausedTrackId = null;
    stepTrack(-1);
  },
  /*
   * Steps to the next previewable track and clears any paused-track latch.
   */
  nextTrack() {
    pausedTrackId = null;
    stepTrack(1);
  },
  togglePlayback,
  menuClick,
  menuHover,
  tabSwitch,
  fadeOut,
  fadeIn,
  stopAll,
  initOnGesture() {
    const activeAudioContext = getAudioContext();
    if (activeAudioContext && activeAudioContext.state === 'suspended') activeAudioContext.resume().catch(() => {});
  },
  isPlaying: () => isPlayingTrack,
  currentTrack: () => currentTrack,
  currentTrackInfo: () => getTrackInfo(currentTrack),
  pausedTrackInfo: () => getTrackInfo(pausedTrackId),
  currentPreviewTrackInfo: () => getTrackInfo(previewTrackId || currentTrack),
  trackCount: () => TRACK_ORDER.length,
  currentPreviewTrackPosition: () => {
    const activeTrackId = previewTrackId || currentTrack || TRACK_ORDER[0];
    return Math.max(0, TRACK_ORDER.indexOf(activeTrackId)) + 1;
  },
  getTrackInfo,
  setTrackChangeListener(listener) {
    trackChangeListener = listener;
  },
  setVolume: volume => {
    const activeAudioContext = getAudioContext();
    if (masterGainNode && activeAudioContext) {
      masterGainNode.gain.setValueAtTime(volume * 0.35, activeAudioContext.currentTime);
    }
  },
};
