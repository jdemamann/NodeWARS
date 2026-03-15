/* ================================================================
   Physics system

   Owns core simulation bookkeeping shared by nodes and tentacles.
   World-layer mechanics such as fog, pulsars, vortexes, relays, and
   camera follow live in WorldSystems.
   ================================================================ */

import { TentState } from '../config/gameConfig.js';
import {
  captureRelayFeedBudget,
  captureTentacleWarsOverflowBudget,
  computeNodeTentacleFeedRate,
} from './EnergyBudget.js';
import { distributeTentacleWarsOverflow } from '../tentaclewars/TwEnergyModel.js';

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
      n.twOverflowBudget = captureTentacleWarsOverflowBudget(n);
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

    /* Pass 4: TentacleWars overflow pre-assignment.
       Distributes each node's twOverflowBudget to eligible outgoing tentacles
       so both ACTIVE and CLASH paths read a ready-to-consume per-tentacle share. */

    // Step 4a: zero every tentacle's share (covers non-TW tentacles too)
    for (let i = 0; i < tents.length; i++) {
      tents[i].twOverflowShare = 0;
    }

    // Step 4b: collect eligible tentacle counts per TW node with overflow
    const overflowEligibleCounts = new Map(); // nodeId → eligible count
    for (let i = 0; i < tents.length; i++) {
      const t = tents[i];
      if (!t.alive || t.state === TentState.DEAD || t.state === TentState.RETRACTING) continue;
      const src = t.reversed ? t.target : t.source;
      if (src.simulationMode !== 'tentaclewars' || !(src.twOverflowBudget > 0)) continue;
      overflowEligibleCounts.set(src.id, (overflowEligibleCounts.get(src.id) ?? 0) + 1);
    }

    // Step 4c: assign shares using per-node counters (Map<nodeId, counter>)
    // Counters are incremented each time an eligible tentacle for that node is seen.
    // Do NOT reset when source node changes — tentacles may be non-contiguous in game.tents.
    const perNodeCounter = new Map(); // nodeId → assignment index so far
    for (let i = 0; i < tents.length; i++) {
      const t = tents[i];
      if (!t.alive || t.state === TentState.DEAD || t.state === TentState.RETRACTING) continue;
      const src = t.reversed ? t.target : t.source;
      if (src.simulationMode !== 'tentaclewars' || !(src.twOverflowBudget > 0)) continue;
      const eligibleCount = overflowEligibleCounts.get(src.id) ?? 0;
      if (eligibleCount === 0) continue;
      const { laneOverflowShares } = distributeTentacleWarsOverflow(src.twOverflowBudget, eligibleCount);
      const idx = perNodeCounter.get(src.id) ?? 0;
      t.twOverflowShare = laneOverflowShares[idx] ?? 0;
      perNodeCounter.set(src.id, idx + 1);
    }
  }
}
