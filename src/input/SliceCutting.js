import { findBezierCutRatio } from '../math/bezierGeometry.js';

export function getLatestSliceSegment(slicePath) {
  if (slicePath.length < 2) return null;

  return {
    startPoint: slicePath[slicePath.length - 2],
    endPoint: slicePath[slicePath.length - 1],
  };
}

export function scanPlayerSliceCuts(tents, sliceSegment, playerOwner = 1) {
  if (!sliceSegment) return [];

  const cuts = [];

  tents.forEach(tentacle => {
    if (!tentacle.alive) return;

    const isPlayerCuttable = tentacle.source && tentacle.target &&
      (tentacle.source.owner === playerOwner || (tentacle.reversed && tentacle.target.owner === playerOwner));
    if (!isPlayerCuttable) return;

    const controlPoint = tentacle.getCP();
    const cutRatioAlongTentacle = findBezierCutRatio(
      sliceSegment.startPoint.x,
      sliceSegment.startPoint.y,
      sliceSegment.endPoint.x,
      sliceSegment.endPoint.y,
      tentacle.source.x,
      tentacle.source.y,
      controlPoint.x,
      controlPoint.y,
      tentacle.target.x,
      tentacle.target.y,
    );
    if (cutRatioAlongTentacle < 0) return;

    const effectiveCutRatio = tentacle.reversed ? (1 - cutRatioAlongTentacle) : cutRatioAlongTentacle;
    const effectiveSourceNode = tentacle.reversed ? tentacle.target : tentacle.source;
    const effectiveTargetNode = tentacle.reversed ? tentacle.source : tentacle.target;

    cuts.push({
      tentacle,
      effectiveCutRatio,
      effectiveSourceNode,
      effectiveTargetNode,
    });
  });

  return cuts;
}
