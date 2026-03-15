/* ================================================================
   TentacleWars world-select view

   Builds the small world cards and summary copy used by the separate
   TentacleWars campaign shell before the player picks a phase.
   ================================================================ */

function getWorldAccent(worldId) {
  if (worldId === 2) return '#c040ff';
  if (worldId === 3) return '#ff9020';
  if (worldId === 4) return '#f5c518';
  return '#00e5ff';
}

/* Keep world labels explicit so the shell stays readable without i18n churn. */
function getWorldLabel(worldId) {
  return `WORLD ${worldId}`;
}

/* Surface only the current TW pointer and world unlock breadth in one line. */
export function buildTwWorldSummaryMarkup(currentLevelId, unlockedWorldCount) {
  return `CURRENT POINTER ${currentLevelId} · ${unlockedWorldCount}/4 WORLDS OPEN`;
}

/* World cards stay compact and reuse the shared level-card visual language. */
export function buildTwWorldCardsMarkup(worldCards) {
  return worldCards.map(worldCard => {
    const accent = getWorldAccent(worldCard.worldId);
    const classes = ['lb2', 'tw-world-card'];
    if (!worldCard.unlocked) classes.push('lk');
    if (worldCard.isCurrent) classes.push('cur');
    return (
      `<button class="${classes.join(' ')}" ` +
      `data-tw-world="${worldCard.worldId}" ` +
      `style="border-color:${accent}40">` +
        `<div class="ln" style="color:${accent}">${worldCard.worldId}</div>` +
        `<div class="lna">${getWorldLabel(worldCard.worldId)}</div>` +
        `<div class="lb-meta">${worldCard.phaseRangeLabel}</div>` +
        `<div class="lb-score">${worldCard.currentLevelLabel}</div>` +
        `<div class="lb-meta">${worldCard.unlocked ? 'SELECT WORLD' : '🔒 LOCKED'}</div>` +
      '</button>'
    );
  }).join('');
}
