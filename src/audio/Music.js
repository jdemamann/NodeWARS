/* ================================================================
   NODE WARS v3 — Procedural Music Engine

   ╔══════════════════════════════════════════════════════════╗
   ║  "DRIFT SIGNAL" — MENU / UI THEME          (SACRED)     ║
   ║  BPM: 78 | Prog: Am→F→C→G | Timbre: triangle+sine      ║
   ║  Do NOT alter chord progression, BPM, or timbre.        ║
   ╚══════════════════════════════════════════════════════════╝

   Gameplay themes share the same soul:
     playGenesis() — W1: "Genesis Pulse"    (82 BPM, Am→C→F→G)
     playVoid()    — W2: "Hollow Signal"    (72 BPM, Dm→Bb→F→C)
     playNexus()   — W3: "Current"          (88 BPM, Am→Em→F→G)
   ================================================================ */

import { STATE } from '../core/GameState.js';

let audioContext = null;
let masterGainNode = null;
let isPlayingTrack = false;
let currentTrack = null;
let scheduledTimers = [];
let beatIntervalId = null;

const C4=261.63,D4=293.66,E4=329.63,F4=349.23,G4=392.00,A4=440.00,B4=493.88;
const C3=130.81,D3=146.83,E3=164.81,F3=174.61,G3=196.00,A3=220.00,Bb3=233.08;
const C5=523.25,E5=659.26,G5=784.00,A5=880.00;
const Bb2=116.54, F2=87.31;

function getAudioContext() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      masterGainNode = audioContext.createGain();
      masterGainNode.gain.setValueAtTime(0.0, audioContext.currentTime);
      masterGainNode.connect(audioContext.destination);
    } catch (e) { return null; }
  }
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  return audioContext;
}

function getMusicVolume() {
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
  } catch (e) {}
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
  } catch (e) {}
}

function fadeIn(dur = 1.5) {
  const activeAudioContext = getAudioContext();
  if (!activeAudioContext || !masterGainNode) return;
  const target = 0.35 * getMusicVolume();
  masterGainNode.gain.cancelScheduledValues(activeAudioContext.currentTime);
  masterGainNode.gain.setValueAtTime(masterGainNode.gain.value, activeAudioContext.currentTime);
  masterGainNode.gain.linearRampToValueAtTime(target, activeAudioContext.currentTime + dur);
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

/* ╔══════════════════════════════════════════════════════════╗
   ║  "DRIFT SIGNAL" — MENU THEME   (SACRED — DO NOT MODIFY)║
   ╚══════════════════════════════════════════════════════════╝ */
function playMenu() {
  if (isPlayingTrack && currentTrack === 'menu') return;
  stopAll(); isPlayingTrack = true; currentTrack = 'menu';
  getAudioContext(); fadeIn(2.0);

  const CHORDS = [[A3,C4,E4],[F3,A3,C4],[C3,E4,G4],[G3,B4,D4]];
  const ARP_UP  = [[C4,E4,A4,C5],[F3,A3,F4,A4],[C4,E4,G4,C5],[G3,B4,G4,B4]];
  let chordIndex = 0;

  function playChordCycle() {
    if (!isPlayingTrack || currentTrack !== 'menu') return;
    const chordFrequencies = CHORDS[chordIndex];
    osc(chordFrequencies[0] / 2, 'sine', 3.8, 0.28, 0);
    chordFrequencies.forEach((frequency, index) => {
      osc(frequency, 'triangle', 3.5, 0.10, 0.05, index * 3);
      osc(frequency, 'sine', 3.5, 0.07, 0.05, -index * 2);
    });
    ARP_UP[chordIndex].forEach((frequency, index) => osc(frequency, 'triangle', 0.18, 0.12, index * 0.22 + 0.1));
    chordIndex = (chordIndex + 1) % 4;
    scheduledTimers.push(setTimeout(playChordCycle, 4000));
  }

  const BPM=78, BEAT=60000/BPM, STEP=BEAT/4;
  const HAT_PAT  = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0];
  const KICK_PAT = [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0];
  let beatStep = 0;
  beatIntervalId = setInterval(() => {
    if (!isPlayingTrack || currentTrack !== 'menu') { clearInterval(beatIntervalId); return; }
    const patternStep = beatStep % 16;
    if (KICK_PAT[patternStep]) noiseHit(0.14, 0.06, 0, 80);
    if (HAT_PAT[patternStep])  noiseHit(0.05, 0.025, 0, 5000);
    beatStep += 1;
  }, STEP);

  playChordCycle();
}
/* END "DRIFT SIGNAL" — SACRED ZONE ENDS HERE */

/* ── "GENESIS PULSE" — World 1 Theme (82 BPM, Am→C→F→G) ── */
function playGenesis() {
  if (isPlayingTrack && currentTrack === 'genesis') return;
  stopAll(); isPlayingTrack = true; currentTrack = 'genesis';
  getAudioContext(); fadeIn(1.8);

  const CHORDS = [[A3,E4,A4],[C3,G4,C5],[F3,A3,F4],[G3,D4,G4]];
  const ARP    = [[A3,E4,A4,C5],[C4,E4,G4,C5],[F3,C4,F4,A4],[G3,D4,B4,G4]];
  let chordIndex = 0;

  function genesisCycle() {
    if (!isPlayingTrack || currentTrack !== 'genesis') return;
    const chordFrequencies = CHORDS[chordIndex];
    osc(chordFrequencies[0] / 2, 'sine', 3.6, 0.24, 0);
    chordFrequencies.forEach((frequency, index) => {
      osc(frequency, 'triangle', 3.4, 0.09, 0.04, index * 4);
      osc(frequency, 'sine', 3.4, 0.06, 0.04, -index * 3);
    });
    ARP[chordIndex].forEach((frequency, index) => osc(frequency, 'triangle', 0.20, 0.10, index * 0.28 + 0.15));
    if (chordIndex % 2 === 0) osc(ARP[chordIndex][3] * 2, 'sine', 0.14, 0.05, 0.6);
    chordIndex = (chordIndex + 1) % 4;
    scheduledTimers.push(setTimeout(genesisCycle, 3700));
  }

  const BPM=82, BEAT=60000/BPM, STEP=BEAT/4;
  const KICK = [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0];
  const HAT  = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1];
  let beatStep = 0;
  beatIntervalId = setInterval(() => {
    if (!isPlayingTrack || currentTrack !== 'genesis') { clearInterval(beatIntervalId); return; }
    const patternStep = beatStep % 16;
    if (KICK[patternStep]) noiseHit(0.16, 0.055, 0, 75);
    if (HAT[patternStep])  noiseHit(0.05, 0.022, 0, 4800);
    beatStep += 1;
  }, STEP);

  genesisCycle();
}

/* ── "HOLLOW SIGNAL" — World 2 Theme (72 BPM, Dm→Bb→F→C) ── */
function playVoid() {
  if (isPlayingTrack && currentTrack === 'void') return;
  stopAll(); isPlayingTrack = true; currentTrack = 'void';
  getAudioContext(); fadeIn(2.2);

  const Dm=[D3,F3,A3], Bb=[Bb2*2,D3,F3], Fmaj=[F2*2,C3,F3], Cmaj=[C3,E3,G3];
  const CHORDS = [Dm, Bb, Fmaj, Cmaj];
  const ARP = [[D3,F3,A3,D4+D4],[Bb2*2,D3,F3,Bb3],[F3,A3,C4,F4],[C3,E3,G3,C4]];
  let chordIndex = 0;

  function voidCycle() {
    if (!isPlayingTrack || currentTrack !== 'void') return;
    const chordFrequencies = CHORDS[chordIndex];
    osc(chordFrequencies[0] / 2, 'sine', 4.2, 0.22, 0);
    chordFrequencies.forEach((frequency, index) => {
      osc(frequency, 'triangle', 4.0, 0.08, 0.06 + index * 0.15, index * 5);
      osc(frequency, 'sine', 4.0, 0.05, 0.06 + index * 0.15, -index * 4);
    });
    ARP[chordIndex].forEach((frequency, index) => osc(frequency, 'triangle', 0.22, 0.08, index * 0.45 + 0.2));
    if (Math.random() > 0.45) osc(ARP[chordIndex][3] * 2, 'sine', 0.16, 0.04, 1.2 + Math.random() * 0.8);
    chordIndex = (chordIndex + 1) % 4;
    scheduledTimers.push(setTimeout(voidCycle, 4400));
  }

  const BPM=72, BEAT=60000/BPM, STEP=BEAT/4;
  const KICK = [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0];
  const HAT  = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0];
  let beatStep = 0;
  beatIntervalId = setInterval(() => {
    if (!isPlayingTrack || currentTrack !== 'void') { clearInterval(beatIntervalId); return; }
    const patternStep = beatStep % 16;
    if (KICK[patternStep]) noiseHit(0.18, 0.05, 0, 65);
    if (HAT[patternStep])  noiseHit(0.06, 0.018, 0, 3500);
    beatStep += 1;
  }, STEP);

  voidCycle();
}

/* ── "CURRENT" — World 3 Theme (88 BPM, Am→Em→F→G) ── */
function playNexus() {
  if (isPlayingTrack && currentTrack === 'nexus') return;
  stopAll(); isPlayingTrack = true; currentTrack = 'nexus';
  getAudioContext(); fadeIn(1.4);

  const CHORDS  = [[A3,E4,A4],[E3,B4,E4],[F3,A3,C4],[G3,D4,G4]];
  const ARP_A   = [[A3,C4,E4,A4],[E3,G3,B4,E4],[F3,A3,C4,F4],[G3,B4,D4,G4]];
  const ARP_B   = [[C4,E4,A4,C5],[B4,E4,G3,B4],[A3,C4,F4,A4],[D4,G4,B4,D4]];
  let chordIndex = 0;

  function nexusCycle() {
    if (!isPlayingTrack || currentTrack !== 'nexus') return;
    const chordFrequencies = CHORDS[chordIndex];
    osc(chordFrequencies[0] / 2, 'sine', 3.3, 0.20, 0);
    chordFrequencies.forEach((frequency, index) => {
      osc(frequency, 'triangle', 3.1, 0.08, 0.03, index * 3);
      osc(frequency, 'sine', 3.1, 0.06, 0.03, -index * 3);
    });
    ARP_A[chordIndex].forEach((frequency, index) => osc(frequency, 'triangle', 0.18, 0.09, index * 0.20 + 0.05));
    ARP_B[chordIndex].forEach((frequency, index) => osc(frequency, 'sine', 0.16, 0.07, index * 0.20 + 0.15));
    chordIndex = (chordIndex + 1) % 4;
    scheduledTimers.push(setTimeout(nexusCycle, 3400));
  }

  const BPM=88, BEAT=60000/BPM, STEP=BEAT/4;
  const KICK  = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0];
  const SNARE = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
  const HAT   = [1,0,1,0, 1,0,1,1, 1,0,1,0, 1,0,1,1];
  let beatStep = 0;
  beatIntervalId = setInterval(() => {
    if (!isPlayingTrack || currentTrack !== 'nexus') { clearInterval(beatIntervalId); return; }
    const patternStep = beatStep % 16;
    if (KICK[patternStep])  noiseHit(0.14, 0.050, 0, 75);
    if (SNARE[patternStep]) noiseHit(0.10, 0.035, 0, 250);
    if (HAT[patternStep])   noiseHit(0.04, 0.018, 0, 6000);
    beatStep += 1;
  }, STEP);

  nexusCycle();
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
  } catch (e) {}
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
    } catch (e) {}
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
  } catch (e) {}
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
  } catch (e) {}
}

export const Music = {
  playMenu, playGenesis, playVoid, playNexus,
  menuClick, menuHover, tabSwitch,
  fadeOut, fadeIn, stopAll,
  initOnGesture() {
    const activeAudioContext = getAudioContext();
    if (activeAudioContext && activeAudioContext.state === 'suspended') activeAudioContext.resume().catch(() => {});
  },
  isPlaying:    () => isPlayingTrack,
  currentTrack: () => currentTrack,
  setVolume:    volume => {
    const activeAudioContext = getAudioContext();
    if (masterGainNode && activeAudioContext) {
      masterGainNode.gain.setValueAtTime(volume * 0.35, activeAudioContext.currentTime);
    }
  },
};
