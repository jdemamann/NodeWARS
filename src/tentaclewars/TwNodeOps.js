/*
 * Purpose:
 * Layer 1 node-state commit primitives for TentacleWars architecture.
 *
 * Responsibilities:
 * - Own the only public ownership-state write surface.
 * - Preserve invariant node resets during ownership transfer.
 *
 * Runtime role:
 * Called by Layer 2 ownership policy so node.owner is never written directly outside Layer 1.
 */

/*
 * Commits a node ownership transfer with the canonical substrate resets.
 * Input: target node, new owner id, and starting energy chosen by Layer 2 policy.
 * Output: owner/energy/regen/contest state updated atomically inside Layer 1.
 */
export function commitOwnershipTransfer(node, newOwner, startingEnergy) {
  node.owner = newOwner;
  node.energy = startingEnergy;
  node.regen = 0;
  node.contest = null;
  node.syncLevelFromEnergy?.();
}
