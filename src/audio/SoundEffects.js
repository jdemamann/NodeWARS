/* ================================================================
   NODE WARS v3 — Sound Effects Engine (Web Audio API)
   No audio assets needed — all sounds are procedurally generated.
   ================================================================ */

import { STATE } from '../core/GameState.js';

let _ctx = null;
const soundCooldownUntilMs = new Map();

const SOUND_EVENT_COOLDOWNS_MS = {
  capture: 120,
  clash: 90,
  cut: 70,
  shieldHit: 80,
  autoRetract: 250,
  enemyAlarm: 300,
  hazardDrain: 180,
  voidPulse: 300,
  vortexHum: 600,
  relayBoost: 140,
  relayCapture: 220,
  pulsarFire: 320,
  pulsarCharge: 450,
};

function getCtx() {
  if (!STATE.settings.sound) return null;
  if (!_ctx) {
    try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  return _ctx;
}

function play(freq, type, dur, vol = 0.18, detune = 0) {
  const audioContext = getCtx();
  if (!audioContext) return;
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = freq;
    oscillator.detune.value = detune;
    gainNode.gain.setValueAtTime(vol, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + dur);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + dur);
  } catch (e) {}
}

function noise(dur, vol = 0.1, filterFreq = 300) {
  const audioContext = getCtx();
  if (!audioContext) return;
  try {
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * dur, audioContext.sampleRate);
    const channelData = noiseBuffer.getChannelData(0);
    for (let index = 0; index < channelData.length; index += 1) channelData[index] = Math.random() * 2 - 1;

    const bufferSource = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    const bandPassFilter = audioContext.createBiquadFilter();
    bandPassFilter.type = 'bandpass';
    bandPassFilter.frequency.value = filterFreq;
    bandPassFilter.Q.value = 1.5;

    bufferSource.buffer = noiseBuffer;
    gainNode.gain.setValueAtTime(vol, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + dur);
    bufferSource.connect(bandPassFilter);
    bandPassFilter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    bufferSource.start();
  } catch (e) {}
}

function playWithCooldown(eventKey, playback) {
  const nowMs = (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? performance.now()
    : Date.now();
  const cooldownMs = SOUND_EVENT_COOLDOWNS_MS[eventKey] || 0;
  const nextAllowedAtMs = soundCooldownUntilMs.get(eventKey) || 0;
  if (nowMs < nextAllowedAtMs) return;
  if (cooldownMs > 0) soundCooldownUntilMs.set(eventKey, nowMs + cooldownMs);
  playback();
}

export const SoundEffects = {
  /* Core gameplay */
  capture:     () => playWithCooldown('capture', () => { play(520,'sine',0.18,0.22); setTimeout(() => play(780,'sine',0.15,0.18), 80); }),
  levelUp:     () => { [440,554,659,880].forEach((f,i) => setTimeout(() => play(f,'sine',0.22,0.2), i*55)); },
  clash:       () => playWithCooldown('clash', () => { play(120,'triangle',0.14,0.10); play(240,'triangle',0.08,0.06,0.02); play(960,'sine',0.05,0.03,0.01); noise(0.06,0.05); }),
  clashWin:    () => { play(330,'triangle',0.13,0.11); play(440,'sine',0.14,0.09,0.04); },
  frenzy:      () => { play(660,'square',0.08,0.12,-10); play(440,'square',0.12,0.1,10); },
  frenzyEnd:   () => { play(440,'sine',0.35,0.08); setTimeout(() => play(330,'sine',0.45,0.06), 120); },
  cut:         () => playWithCooldown('cut', () => { noise(0.07,0.09); play(220,'sawtooth',0.09,0.07); }),
  retract:     () => { play(280,'sine',0.1,0.08); play(200,'sine',0.15,0.06); },

  /* Selection & build */
  select:      () => { play(660,'sine',0.06,0.07); },
  tentGrow:    () => { play(380,'triangle',0.1,0.06,8); },
  tentFull:    () => { play(500,'sine',0.12,0.09); setTimeout(() => play(660,'sine',0.14,0.07), 60); },
  tentConnect: () => { play(440,'sine',0.08,0.12); setTimeout(() => play(550,'triangle',0.1,0.08), 40); },
  buildStart:  () => { play(300,'triangle',0.08,0.08); play(400,'triangle',0.1,0.06,3); },

  /* Cell events */
  shield:      () => { play(1200,'sine',0.07,0.1,-6); play(900,'sine',0.09,0.07,6); },
  shieldHit:   () => playWithCooldown('shieldHit', () => { play(1800,'sine',0.04,0.15,-15); play(1400,'sine',0.06,0.12,15); noise(0.04,0.06); }),
  overflow:    () => { play(160,'triangle',0.2,0.05); play(240,'triangle',0.24,0.04); },
  autoRetract: () => playWithCooldown('autoRetract', () => { play(330,'sawtooth',0.14,0.1); play(220,'sawtooth',0.2,0.08); }),
  cascadeBurst:() => { play(330,'triangle',0.12,0.1); play(440,'triangle',0.14,0.08,5); setTimeout(() => play(660,'triangle',0.16,0.1), 70); },
  enemyAlarm:  () => playWithCooldown('enemyAlarm', () => { play(440,'square',0.06,0.14); setTimeout(() => play(330,'square',0.08,0.1), 90); setTimeout(() => play(440,'square',0.06,0.12), 180); }),
  killEnemy:   () => { noise(0.1,0.12); play(200,'sawtooth',0.15,0.1); setTimeout(() => play(300,'sine',0.18,0.1), 80); },

  /* Win / Lose */
  lose:        () => { play(220,'sine',0.4,0.15); setTimeout(() => play(165,'sine',0.5,0.15), 200); setTimeout(() => play(110,'sawtooth',0.6,0.1), 450); },
  win:         () => { [523,659,784,1047].forEach((f,i) => setTimeout(() => play(f,'sine',0.3,0.2), i*90)); },
  star3:       () => { [523,784,1047,1319].forEach((f,i) => setTimeout(() => play(f,'triangle',0.3,0.25), i*80)); },
  worldUnlock: () => { [262,330,392,523,659,784,1047,1319].forEach((f,i) => setTimeout(() => play(f,'sine',0.35,0.22), i*70)); },
  worldEnter:  () => { play(110,'sine',0.6,0.12); setTimeout(() => play(165,'sine',0.7,0.1), 250); setTimeout(() => play(220,'sine',0.8,0.1), 500); setTimeout(() => play(330,'triangle',0.5,0.12), 800); },

  /* World 2: Void */
  hazardDrain: () => playWithCooldown('hazardDrain', () => { play(80+Math.random()*20,'sawtooth',0.15,0.06); }),
  voidPulse:   () => playWithCooldown('voidPulse', () => { noise(0.18,0.08); play(55,'sawtooth',0.2,0.1); }),
  vortexHum:   () => playWithCooldown('vortexHum', () => { play(55+Math.random()*15,'sawtooth',0.4,0.04,20); }),

  /* World 3: Nexus Prime */
  relayBoost:  () => playWithCooldown('relayBoost', () => { play(880,'sine',0.1,0.12); setTimeout(() => play(1100,'sine',0.12,0.1,7), 40); }),
  relayCapture:() => playWithCooldown('relayCapture', () => { play(660,'sine',0.12,0.18); setTimeout(() => play(990,'sine',0.15,0.15), 55); setTimeout(() => play(1320,'triangle',0.18,0.12), 120); }),
  pulsarFire:  () => playWithCooldown('pulsarFire', () => { [440,660,880,1100].forEach((f,i) => setTimeout(() => play(f,'sine',0.14,0.14), i*38)); }),
  pulsarCharge:() => playWithCooldown('pulsarCharge', () => { play(220,'triangle',0.2,0.07); play(330,'triangle',0.25,0.05); }),

  tick:        () => { play(880,'triangle',0.02,0.07); },
};
