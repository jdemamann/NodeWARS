/* ================================================================
   TentacleWars debug metrics

   Builds lightweight packet, overflow, and capture summaries for the
   TentacleWars sandbox so tuning work can inspect the live runtime
   without touching the stable NodeWARS debug surfaces.
   ================================================================ */

/*
 * Summarize the live TentacleWars sandbox state into one small object the UI
 * and debug snapshot can consume without duplicating traversal logic.
 */
export function buildTentacleWarsDebugMetrics(game) {
  if (!game?.twMode?.isSandboxActive?.()) return null;

  const nodes = Array.isArray(game.nodes) ? game.nodes : [];
  const tents = Array.isArray(game.tents) ? game.tents : [];
  const neutralNodes = nodes.filter(node => node.owner === 0 && !node.isRelay);
  const contestedNeutralNodes = neutralNodes.filter(node => Object.keys(node.contest || {}).length > 0);
  const overflowReadyNodes = nodes.filter(node => (node.excessFeed || 0) > 0);
  const packetLaneTentacles = tents.filter(tentacle => tentacle.effectiveSourceNode?.simulationMode === 'tentaclewars');

  const queuedPacketCount = packetLaneTentacles.reduce(
    (sum, tentacle) => sum + ((tentacle.packetTravelQueue && tentacle.packetTravelQueue.length) || 0),
    0,
  );
  const packetAccumulatorUnits = packetLaneTentacles.reduce(
    (sum, tentacle) => sum + (tentacle.packetAccumulatorUnits || 0),
    0,
  );
  const contestedCapturePressure = contestedNeutralNodes.reduce((sum, node) => {
    const captureScores = Object.values(node.contest || {});
    return sum + Math.max(0, ...captureScores.map(value => Number(value) || 0));
  }, 0);

  return {
    packetLaneCount: packetLaneTentacles.length,
    queuedPacketCount,
    packetAccumulatorUnits,
    overflowReadyNodeCount: overflowReadyNodes.length,
    contestedNeutralNodeCount: contestedNeutralNodes.length,
    contestedCapturePressure,
    leadingNeutralCaptureThreshold: contestedNeutralNodes.reduce((highest, node) => Math.max(highest, node.captureThreshold || 0), 0),
  };
}
