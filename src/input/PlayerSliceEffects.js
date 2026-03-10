import { isPlayerEnemyOwner } from '../systems/OwnerTeams.js';

export function applyPlayerSliceCut(sliceCut, handlers) {
  /* Canonical slice/burst entry point: player and AI strategic cuts must both
     route through Tent.applySliceCut() so burst behavior stays shared. */
  sliceCut.tentacle.applySliceCut(sliceCut.effectiveCutRatio);

  handlers.onCutApplied?.(sliceCut);
  handlers.onReactiveDefenseCut?.(sliceCut);
  handlers.onPlayerFrenzyCut?.(sliceCut);
}

export function recordReactiveDefenseCut(sliceCut, state, onTrigger) {
  if (sliceCut.effectiveSourceNode.owner !== 1 || !isPlayerEnemyOwner(sliceCut.tentacle.source.owner)) return;

  const now = state.now;
  state.aiCutLog.push(now);
  state.aiCutLog = state.aiCutLog.filter(timestamp => now - timestamp < 5);
  if (state.aiCutLog.length >= 2) {
    state.aiDefensiveDuration = 8.0;
    state.aiCutLog = [];
    onTrigger?.();
  }
}

export function recordPlayerFrenzyCut(sliceCut, state, onTrigger) {
  if (sliceCut.effectiveSourceNode.owner !== 1) return;

  if (state.hasTriggeredFrenzyThisSlice) return;

  state.sliceGestureCutTentacles.add(sliceCut.tentacle);
  if (state.sliceGestureCutTentacles.size >= 3) {
    state.frenzyDuration = 4.0;
    state.frenzyCount += 1;
    state.hasTriggeredFrenzyThisSlice = true;
    onTrigger?.();
  }
}

export function buildPlayerSliceToastMessage(sliceCut) {
  const cutProgressPercent = Math.round((1 - sliceCut.effectiveCutRatio) * 100);
  const targetLabel = sliceCut.effectiveTargetNode.owner === sliceCut.effectiveSourceNode.owner ? 'ALLY' : 'TARGET';
  return '✂ ' + cutProgressPercent + '% → ' + targetLabel;
}
