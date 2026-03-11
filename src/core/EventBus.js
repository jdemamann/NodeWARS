/* ================================================================
   Event bus

   Lightweight pub/sub for decoupling runtime systems such as audio,
   fog, visual feedback, and UI.
   ================================================================ */

class EventBus {
  constructor() {
    this._listeners = {};
  }

  on(event, fn) {
    (this._listeners[event] ??= []).push(fn);
    return this; // chainable
  }

  off(event, fn) {
    if (!this._listeners[event]) return this;
    this._listeners[event] = this._listeners[event].filter(l => l !== fn);
    return this;
  }

  emit(event, ...args) {
    (this._listeners[event] || []).forEach(fn => fn(...args));
  }
}

export const bus = new EventBus();

/*
  Defined events:
    'node:levelup'        (node)      — a node leveled up
    'node:capture'        (node)      — a node was freshly captured (owner changed from 0)
    'node:owner_change'   (node)      — node owner changed (any direction) → fog dirty
    'tent:connect'        (tent)      — tentacle tip reached target
    'tent:clash'          (tent)      — two tentacles began clashing
    'tent:clashwin'       (tent)      — clash was won
    'cell:killed_enemy'   (node)      — player captured an enemy cell
    'cell:lost'           (node)      — player lost a cell to enemy
    'frenzy:start'        ()          — frenzy mode triggered
    'frenzy:end'          ()          — frenzy mode expired
    'ai:defensive'        ()          — AI switched to defensive posture
    'pulsar:fire'         (pulsar)    — pulsar broadcast fired
    'pulsar:charge'       (pulsar)    — pulsar about to fire
    'hazard:drain'        (hazard)    — vortex drained a tentacle
    'relay:capture'       (node)      — relay node was captured
    'autoretract'         (node)      — auto-retract fired on a node
*/
