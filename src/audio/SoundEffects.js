/* ================================================================
   Sound effects engine

   No audio assets are needed; all sounds are procedurally generated.
   Cooldown timing is centralized through audioTiming.js so repeated
   combat events do not each reimplement their own time logic.
   ================================================================ */

import { STATE } from '../core/GameState.js';
import { runAudioEventWithCooldown } from './audioTiming.js';

let audioContext = null;
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

function getAudioContext() {
  if (!STATE.settings.sound) return null;
  if (!audioContext) {
    try { audioContext = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  return audioContext;
}

function playTone(freq, type, dur, vol = 0.18, detune = 0) {
  const audioContext = getAudioContext();
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

function playNoise(dur, vol = 0.1, filterFreq = 300) {
  const audioContext = getAudioContext();
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
  /* Collapse near-duplicate bursts into one perceptual event so clashes,
     hazard drains, and infrastructure triggers do not spam the mix. */
  runAudioEventWithCooldown(soundCooldownUntilMs, eventKey, SOUND_EVENT_COOLDOWNS_MS, playback);
}

export const SoundEffects = {
  /* Core gameplay */
  capture:     () => playWithCooldown('capture', () => { playTone(520,'sine',0.18,0.22); setTimeout(() => playTone(780,'sine',0.15,0.18), 80); }),
  levelUp:     () => { [440,554,659,880].forEach((f,i) => setTimeout(() => playTone(f,'sine',0.22,0.2), i*55)); },
  clash:       () => playWithCooldown('clash', () => { playTone(120,'triangle',0.14,0.10); playTone(240,'triangle',0.08,0.06,0.02); playTone(960,'sine',0.05,0.03,0.01); playNoise(0.06,0.05); }),
  clashWin:    () => { playTone(330,'triangle',0.13,0.11); playTone(440,'sine',0.14,0.09,0.04); },
  frenzy:      () => { playTone(660,'square',0.08,0.12,-10); playTone(440,'square',0.12,0.1,10); },
  frenzyEnd:   () => { playTone(440,'sine',0.35,0.08); setTimeout(() => playTone(330,'sine',0.45,0.06), 120); },
  cut:         () => playWithCooldown('cut', () => { playNoise(0.07,0.09); playTone(220,'sawtooth',0.09,0.07); }),
  retract:     () => { playTone(280,'sine',0.1,0.08); playTone(200,'sine',0.15,0.06); },

  /* Selection & build */
  select:      () => { playTone(660,'sine',0.06,0.07); },
  tentGrow:    () => { playTone(380,'triangle',0.1,0.06,8); },
  tentFull:    () => { playTone(500,'sine',0.12,0.09); setTimeout(() => playTone(660,'sine',0.14,0.07), 60); },
  tentConnect: () => { playTone(440,'sine',0.08,0.12); setTimeout(() => playTone(550,'triangle',0.1,0.08), 40); },
  buildStart:  () => { playTone(300,'triangle',0.08,0.08); playTone(400,'triangle',0.1,0.06,3); },

  /* Cell events */
  shield:      () => { playTone(1200,'sine',0.07,0.1,-6); playTone(900,'sine',0.09,0.07,6); },
  shieldHit:   () => playWithCooldown('shieldHit', () => { playTone(1800,'sine',0.04,0.15,-15); playTone(1400,'sine',0.06,0.12,15); playNoise(0.04,0.06); }),
  overflow:    () => { playTone(160,'triangle',0.2,0.05); playTone(240,'triangle',0.24,0.04); },
  autoRetract: () => playWithCooldown('autoRetract', () => { playTone(330,'sawtooth',0.14,0.1); playTone(220,'sawtooth',0.2,0.08); }),
  cascadeBurst:() => { playTone(330,'triangle',0.12,0.1); playTone(440,'triangle',0.14,0.08,5); setTimeout(() => playTone(660,'triangle',0.16,0.1), 70); },
  enemyAlarm:  () => playWithCooldown('enemyAlarm', () => { playTone(440,'square',0.06,0.14); setTimeout(() => playTone(330,'square',0.08,0.1), 90); setTimeout(() => playTone(440,'square',0.06,0.12), 180); }),
  killEnemy:   () => { playNoise(0.1,0.12); playTone(200,'sawtooth',0.15,0.1); setTimeout(() => playTone(300,'sine',0.18,0.1), 80); },

  /* Win / Lose */
  lose:        () => { playTone(220,'sine',0.4,0.15); setTimeout(() => playTone(165,'sine',0.5,0.15), 200); setTimeout(() => playTone(110,'sawtooth',0.6,0.1), 450); },
  win:         () => { [523,659,784,1047].forEach((f,i) => setTimeout(() => playTone(f,'sine',0.3,0.2), i*90)); },
  star3:       () => { [523,784,1047,1319].forEach((f,i) => setTimeout(() => playTone(f,'triangle',0.3,0.25), i*80)); },
  worldUnlock: () => { [262,330,392,523,659,784,1047,1319].forEach((f,i) => setTimeout(() => playTone(f,'sine',0.35,0.22), i*70)); },
  worldEnter:  () => { playTone(110,'sine',0.6,0.12); setTimeout(() => playTone(165,'sine',0.7,0.1), 250); setTimeout(() => playTone(220,'sine',0.8,0.1), 500); setTimeout(() => playTone(330,'triangle',0.5,0.12), 800); },

  /* World 2: Void */
  hazardDrain: () => playWithCooldown('hazardDrain', () => { playTone(80+Math.random()*20,'sawtooth',0.15,0.06); }),
  voidPulse:   () => playWithCooldown('voidPulse', () => { playNoise(0.18,0.08); playTone(55,'sawtooth',0.2,0.1); }),
  vortexHum:   () => playWithCooldown('vortexHum', () => { playTone(55+Math.random()*15,'sawtooth',0.4,0.04,20); }),

  /* World 3: Nexus Prime */
  relayBoost:  () => playWithCooldown('relayBoost', () => { playTone(880,'sine',0.1,0.12); setTimeout(() => playTone(1100,'sine',0.12,0.1,7), 40); }),
  relayCapture:() => playWithCooldown('relayCapture', () => { playTone(660,'sine',0.12,0.18); setTimeout(() => playTone(990,'sine',0.15,0.15), 55); setTimeout(() => playTone(1320,'triangle',0.18,0.12), 120); }),
  pulsarFire:  () => playWithCooldown('pulsarFire', () => { [440,660,880,1100].forEach((f,i) => setTimeout(() => playTone(f,'sine',0.14,0.14), i*38)); }),
  pulsarCharge:() => playWithCooldown('pulsarCharge', () => { playTone(220,'triangle',0.2,0.07); playTone(330,'triangle',0.25,0.05); }),

  tick:        () => { playTone(880,'triangle',0.02,0.07); },
};
