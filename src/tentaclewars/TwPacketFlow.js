/* ================================================================
   TentacleWars packet flow

   Implements the packet accumulator rule for TentacleWars lanes. The
   functions here stay pure so fidelity rules can be verified before any
   simulation entity or renderer depends on them.
   ================================================================ */

import { TW_BALANCE } from './TwBalance.js';

/*
 * Advance one lane accumulator and emit as many whole packets as the
 * stored throughput budget allows. Packet size stays fixed at one by
 * default, while fractional rates are represented by leftover credit.
 */
export function advanceTentacleWarsPacketAccumulator(
  accumulatorUnits,
  throughputPerSecond,
  deltaSeconds,
  packetSize = TW_BALANCE.PACKET_SIZE,
) {
  const safeAccumulatorUnits = Number.isFinite(accumulatorUnits) ? Math.max(0, accumulatorUnits) : 0;
  const safeThroughputPerSecond = Number.isFinite(throughputPerSecond) ? Math.max(0, throughputPerSecond) : 0;
  const safeDeltaSeconds = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
  const safePacketSize = Number.isFinite(packetSize) && packetSize > 0 ? packetSize : TW_BALANCE.PACKET_SIZE;

  const accumulatedUnits = safeAccumulatorUnits + safeThroughputPerSecond * safeDeltaSeconds;
  const emittedPacketCount = Math.floor(accumulatedUnits / safePacketSize);
  const nextAccumulatorUnits = accumulatedUnits - emittedPacketCount * safePacketSize;

  return {
    emittedPacketCount,
    nextAccumulatorUnits,
  };
}

/*
 * Advance a group of lane accumulators under the same frame step. This
 * keeps tests and future debug views deterministic without requiring
 * full tentacle instances during the early prototype stages.
 */
export function advanceTentacleWarsPacketAccumulators(
  accumulatorUnitsByLane,
  throughputPerSecond,
  deltaSeconds,
  packetSize = TW_BALANCE.PACKET_SIZE,
) {
  return accumulatorUnitsByLane.map(accumulatorUnits =>
    advanceTentacleWarsPacketAccumulator(accumulatorUnits, throughputPerSecond, deltaSeconds, packetSize),
  );
}

/*
 * Advance one live TentacleWars lane. The lane keeps fractional credit in an
 * accumulator, emits only whole packets that the source can actually pay for,
 * and moves those packets through a fixed-duration travel queue.
 */
export function advanceTentacleWarsLaneRuntime({
  accumulatorUnits,
  throughputPerSecond,
  deltaSeconds,
  sourceAvailableEnergy,
  queuedPacketTravelTimes = [],
  travelDurationSeconds,
  packetSize = TW_BALANCE.PACKET_SIZE,
}) {
  const safePacketSize = Number.isFinite(packetSize) && packetSize > 0 ? packetSize : TW_BALANCE.PACKET_SIZE;
  const safeAccumulatorUnits = Number.isFinite(accumulatorUnits) ? Math.max(0, accumulatorUnits) : 0;
  const safeThroughputPerSecond = Number.isFinite(throughputPerSecond) ? Math.max(0, throughputPerSecond) : 0;
  const safeDeltaSeconds = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
  const safeSourceAvailableEnergy = Number.isFinite(sourceAvailableEnergy) ? Math.max(0, sourceAvailableEnergy) : 0;
  const safeTravelDurationSeconds = Number.isFinite(travelDurationSeconds) ? Math.max(0, travelDurationSeconds) : 0;

  const accumulatedUnits = safeAccumulatorUnits + safeThroughputPerSecond * safeDeltaSeconds;
  const affordablePacketCount = Math.floor(safeSourceAvailableEnergy / safePacketSize);
  const emittedPacketCount = Math.min(
    Math.floor(accumulatedUnits / safePacketSize),
    affordablePacketCount,
  );
  const nextAccumulatorUnits = accumulatedUnits - emittedPacketCount * safePacketSize;

  const advancedTravelTimes = queuedPacketTravelTimes
    .map(travelTime => (Number.isFinite(travelTime) ? travelTime : 0) - safeDeltaSeconds);
  const deliveredPacketCount = advancedTravelTimes.filter(travelTime => travelTime <= 0).length;
  const nextQueuedPacketTravelTimes = advancedTravelTimes
    .filter(travelTime => travelTime > 0);

  for (let packetIndex = 0; packetIndex < emittedPacketCount; packetIndex += 1) {
    nextQueuedPacketTravelTimes.push(safeTravelDurationSeconds);
  }

  return {
    emittedPacketCount,
    deliveredPacketCount,
    nextAccumulatorUnits,
    nextQueuedPacketTravelTimes,
  };
}
