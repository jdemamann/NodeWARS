/* ================================================================
   Physics system

   Owns core simulation bookkeeping shared by nodes and tentacles.
   World-layer mechanics such as fog, pulsars, vortexes, relays, and
   camera follow live in WorldSystems.
   ================================================================ */

import { TentState } from '../config/gameConfig.js';
import { captureRelayFeedBudget, computeNodeTentacleFeedRate } from './EnergyBudget.js';

export class Physics {
  /* ── outCount + tentFeedPerSec: computed once per frame ── */
  static updateOutCounts(game) {
    const nodes = game.nodes;
    const tents = game.tents;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      /* Relay rule: only last frame's received flow can be forwarded this frame.
         Relays are infrastructure, not generators. */
      n.relayFeedBudget = captureRelayFeedBudget(n);
      n.outCount = 0;
      n.inFlow   = 0;
    }

    for (let i = 0; i < tents.length; i++) {
      const t = tents[i];
      if (!t.alive || t.state === TentState.DEAD || t.state === TentState.RETRACTING) continue;
      const src = t.reversed ? t.target : t.source;
      src.outCount++;
    }

    /* tentFeedPerSec: canonical outgoing energy budget resolver.
       Normal nodes split tier regen across their outgoing tentacles.
       Relay nodes split only buffered upstream flow from the prior frame. */
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].tentFeedPerSec = computeNodeTentacleFeedRate(nodes[i]);
    }
  }
}
