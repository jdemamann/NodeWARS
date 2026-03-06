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

import { STATE } from '../GameState.js';

let ctx         = null;
let masterGain  = null;
let playing     = false;
let currentTrack = null;
let timers      = [];
let beatInterval = null;

const C4=261.63,D4=293.66,E4=329.63,F4=349.23,G4=392.00,A4=440.00,B4=493.88;
const C3=130.81,D3=146.83,E3=164.81,F3=174.61,G3=196.00,A3=220.00,Bb3=233.08;
const C5=523.25,E5=659.26,G5=784.00,A5=880.00;
const Bb2=116.54, F2=87.31;

function getCtx() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0, ctx.currentTime);
      masterGain.connect(ctx.destination);
    } catch (e) { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function vol() {
  return (STATE.settings.sound && STATE.settings.music) ? 1 : 0;
}

function osc(freq, type, dur, gain, delay = 0, detune = 0) {
  const c = getCtx(); if (!c || !masterGain) return;
  try {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq; o.detune.value = detune;
    g.gain.setValueAtTime(0, c.currentTime + delay);
    g.gain.linearRampToValueAtTime(gain * vol(), c.currentTime + delay + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + dur);
    o.connect(g); g.connect(masterGain);
    o.start(c.currentTime + delay);
    o.stop(c.currentTime + delay + dur + 0.05);
  } catch (e) {}
}

function noiseHit(dur, gain, delay = 0, freq = 800) {
  const c = getCtx(); if (!c || !masterGain) return;
  try {
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 2;
    g.gain.setValueAtTime(gain * vol(), c.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + dur);
    src.buffer = buf; src.connect(f); f.connect(g); g.connect(masterGain);
    src.start(c.currentTime + delay);
  } catch (e) {}
}

function fadeIn(dur = 1.5) {
  const c = getCtx(); if (!c || !masterGain) return;
  const target = 0.35 * vol();
  masterGain.gain.cancelScheduledValues(c.currentTime);
  masterGain.gain.setValueAtTime(masterGain.gain.value, c.currentTime);
  masterGain.gain.linearRampToValueAtTime(target, c.currentTime + dur);
}

function fadeOut(dur = 1.0) {
  const c = getCtx(); if (!c || !masterGain) return;
  masterGain.gain.cancelScheduledValues(c.currentTime);
  masterGain.gain.setValueAtTime(masterGain.gain.value, c.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.0, c.currentTime + dur);
}

function stopAll() {
  timers.forEach(t => clearTimeout(t)); timers = [];
  if (beatInterval) { clearInterval(beatInterval); beatInterval = null; }
  playing = false; currentTrack = null;
}

/* ╔══════════════════════════════════════════════════════════╗
   ║  "DRIFT SIGNAL" — MENU THEME   (SACRED — DO NOT MODIFY)║
   ╚══════════════════════════════════════════════════════════╝ */
function playMenu() {
  if (playing && currentTrack === 'menu') return;
  stopAll(); playing = true; currentTrack = 'menu';
  getCtx(); fadeIn(2.0);

  const CHORDS = [[A3,C4,E4],[F3,A3,C4],[C3,E4,G4],[G3,B4,D4]];
  const ARP_UP  = [[C4,E4,A4,C5],[F3,A3,F4,A4],[C4,E4,G4,C5],[G3,B4,G4,B4]];
  let chordIdx = 0;

  function playChordCycle() {
    if (!playing || currentTrack !== 'menu') return;
    const ch = CHORDS[chordIdx];
    osc(ch[0]/2,'sine',3.8,0.28,0);
    ch.forEach((f,i) => { osc(f,'triangle',3.5,0.10,0.05,i*3); osc(f,'sine',3.5,0.07,0.05,-i*2); });
    ARP_UP[chordIdx].forEach((f,i) => osc(f,'triangle',0.18,0.12,i*0.22+0.1));
    chordIdx = (chordIdx + 1) % 4;
    timers.push(setTimeout(playChordCycle, 4000));
  }

  const BPM=78, BEAT=60000/BPM, STEP=BEAT/4;
  const HAT_PAT  = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0];
  const KICK_PAT = [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0];
  let step = 0;
  beatInterval = setInterval(() => {
    if (!playing || currentTrack !== 'menu') { clearInterval(beatInterval); return; }
    const s = step % 16;
    if (KICK_PAT[s]) noiseHit(0.14, 0.06, 0, 80);
    if (HAT_PAT[s])  noiseHit(0.05, 0.025, 0, 5000);
    step++;
  }, STEP);

  playChordCycle();
}
/* END "DRIFT SIGNAL" — SACRED ZONE ENDS HERE */

/* ── "GENESIS PULSE" — World 1 Theme (82 BPM, Am→C→F→G) ── */
function playGenesis() {
  if (playing && currentTrack === 'genesis') return;
  stopAll(); playing = true; currentTrack = 'genesis';
  getCtx(); fadeIn(1.8);

  const CHORDS = [[A3,E4,A4],[C3,G4,C5],[F3,A3,F4],[G3,D4,G4]];
  const ARP    = [[A3,E4,A4,C5],[C4,E4,G4,C5],[F3,C4,F4,A4],[G3,D4,B4,G4]];
  let ci = 0;

  function genesisCycle() {
    if (!playing || currentTrack !== 'genesis') return;
    const ch = CHORDS[ci];
    osc(ch[0]/2,'sine',3.6,0.24,0);
    ch.forEach((f,i) => { osc(f,'triangle',3.4,0.09,0.04,i*4); osc(f,'sine',3.4,0.06,0.04,-i*3); });
    ARP[ci].forEach((f,i) => osc(f,'triangle',0.20,0.10,i*0.28+0.15));
    if (ci % 2 === 0) osc(ARP[ci][3]*2,'sine',0.14,0.05,0.6);
    ci = (ci + 1) % 4;
    timers.push(setTimeout(genesisCycle, 3700));
  }

  const BPM=82, BEAT=60000/BPM, STEP=BEAT/4;
  const KICK = [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0];
  const HAT  = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1];
  let step = 0;
  beatInterval = setInterval(() => {
    if (!playing || currentTrack !== 'genesis') { clearInterval(beatInterval); return; }
    const s = step % 16;
    if (KICK[s]) noiseHit(0.16, 0.055, 0, 75);
    if (HAT[s])  noiseHit(0.05, 0.022, 0, 4800);
    step++;
  }, STEP);

  genesisCycle();
}

/* ── "HOLLOW SIGNAL" — World 2 Theme (72 BPM, Dm→Bb→F→C) ── */
function playVoid() {
  if (playing && currentTrack === 'void') return;
  stopAll(); playing = true; currentTrack = 'void';
  getCtx(); fadeIn(2.2);

  const Dm=[D3,F3,A3], Bb=[Bb2*2,D3,F3], Fmaj=[F2*2,C3,F3], Cmaj=[C3,E3,G3];
  const CHORDS = [Dm, Bb, Fmaj, Cmaj];
  const ARP = [[D3,F3,A3,D4+D4],[Bb2*2,D3,F3,Bb3],[F3,A3,C4,F4],[C3,E3,G3,C4]];
  let ci = 0;

  function voidCycle() {
    if (!playing || currentTrack !== 'void') return;
    const ch = CHORDS[ci];
    osc(ch[0]/2,'sine',4.2,0.22,0);
    ch.forEach((f,i) => { osc(f,'triangle',4.0,0.08,0.06+i*0.15,i*5); osc(f,'sine',4.0,0.05,0.06+i*0.15,-i*4); });
    ARP[ci].forEach((f,i) => osc(f,'triangle',0.22,0.08,i*0.45+0.2));
    if (Math.random() > 0.45) osc(ARP[ci][3]*2,'sine',0.16,0.04,1.2+Math.random()*0.8);
    ci = (ci + 1) % 4;
    timers.push(setTimeout(voidCycle, 4400));
  }

  const BPM=72, BEAT=60000/BPM, STEP=BEAT/4;
  const KICK = [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0];
  const HAT  = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0];
  let step = 0;
  beatInterval = setInterval(() => {
    if (!playing || currentTrack !== 'void') { clearInterval(beatInterval); return; }
    const s = step % 16;
    if (KICK[s]) noiseHit(0.18, 0.05, 0, 65);
    if (HAT[s])  noiseHit(0.06, 0.018, 0, 3500);
    step++;
  }, STEP);

  voidCycle();
}

/* ── "CURRENT" — World 3 Theme (88 BPM, Am→Em→F→G) ── */
function playNexus() {
  if (playing && currentTrack === 'nexus') return;
  stopAll(); playing = true; currentTrack = 'nexus';
  getCtx(); fadeIn(1.4);

  const CHORDS  = [[A3,E4,A4],[E3,B4,E4],[F3,A3,C4],[G3,D4,G4]];
  const ARP_A   = [[A3,C4,E4,A4],[E3,G3,B4,E4],[F3,A3,C4,F4],[G3,B4,D4,G4]];
  const ARP_B   = [[C4,E4,A4,C5],[B4,E4,G3,B4],[A3,C4,F4,A4],[D4,G4,B4,D4]];
  let ci = 0;

  function nexusCycle() {
    if (!playing || currentTrack !== 'nexus') return;
    const ch = CHORDS[ci];
    osc(ch[0]/2,'sine',3.3,0.20,0);
    ch.forEach((f,i) => { osc(f,'triangle',3.1,0.08,0.03,i*3); osc(f,'sine',3.1,0.06,0.03,-i*3); });
    ARP_A[ci].forEach((f,i) => osc(f,'triangle',0.18,0.09,i*0.20+0.05));
    ARP_B[ci].forEach((f,i) => osc(f,'sine',   0.16,0.07,i*0.20+0.15));
    ci = (ci + 1) % 4;
    timers.push(setTimeout(nexusCycle, 3400));
  }

  const BPM=88, BEAT=60000/BPM, STEP=BEAT/4;
  const KICK  = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0];
  const SNARE = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
  const HAT   = [1,0,1,0, 1,0,1,1, 1,0,1,0, 1,0,1,1];
  let step = 0;
  beatInterval = setInterval(() => {
    if (!playing || currentTrack !== 'nexus') { clearInterval(beatInterval); return; }
    const s = step % 16;
    if (KICK[s])  noiseHit(0.14, 0.050, 0, 75);
    if (SNARE[s]) noiseHit(0.10, 0.035, 0, 250);
    if (HAT[s])   noiseHit(0.04, 0.018, 0, 6000);
    step++;
  }, STEP);

  nexusCycle();
}

/* ── UI SOUND EFFECTS ── */
function menuClick() {
  const c = getCtx(); if (!c) return;
  try {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = 660;
    g.gain.setValueAtTime(0.12 * vol(), c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.09);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.1);
  } catch (e) {}
  setTimeout(() => {
    const c2 = getCtx(); if (!c2) return;
    try {
      const o = c2.createOscillator(), g = c2.createGain();
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.setValueAtTime(0.09 * vol(), c2.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c2.currentTime + 0.07);
      o.connect(g); g.connect(c2.destination); o.start(); o.stop(c2.currentTime + 0.08);
    } catch (e) {}
  }, 50);
}

function menuHover() {
  const c = getCtx(); if (!c) return;
  try {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = 520;
    g.gain.setValueAtTime(0.04 * vol(), c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.06);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.07);
  } catch (e) {}
}

function tabSwitch() {
  const c = getCtx(); if (!c) return;
  try {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = 440;
    g.gain.setValueAtTime(0.08 * vol(), c.currentTime);
    g.gain.linearRampToValueAtTime(0.12 * vol(), c.currentTime + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.12);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.13);
  } catch (e) {}
}

export const Music = {
  playMenu, playGenesis, playVoid, playNexus,
  menuClick, menuHover, tabSwitch,
  fadeOut, fadeIn, stopAll,
  initOnGesture() {
    const c = getCtx();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  },
  isPlaying:    () => playing,
  currentTrack: () => currentTrack,
  setVolume:    v  => { if (masterGain && getCtx()) masterGain.gain.setValueAtTime(v * 0.35, getCtx().currentTime); },
};
