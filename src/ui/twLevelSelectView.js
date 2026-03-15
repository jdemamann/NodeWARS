/* ================================================================
   TentacleWars level-select view

   Builds the authored phase cards for one TentacleWars world while
   keeping progression cues dense enough for the compact menu shell.
   ================================================================ */

/* Keep mastery readable even in compact cards by collapsing stars to text. */
function buildStarStrip(starCount) {
  return `<div class="lstar">${'★'.repeat(starCount)}${'☆'.repeat(3 - starCount)}</div>`;
}

/* Mirror the live TW pointer above the grid so world navigation stays grounded. */
export function buildTwLevelMetaMarkup(worldId, currentLevelId, T) {
  return T('twLevelPointer', worldId, currentLevelId);
}

/* Phase cards surface just enough authored metadata for fast selection. */
export function buildTwLevelCardsMarkup(levelCards, T) {
  return levelCards.map(levelCard => {
    const classes = ['lb2', 'tw-level-card'];
    if (levelCard.locked) classes.push('lk');
    if (levelCard.isCurrent) classes.push('cur');
    if (levelCard.isNext) classes.push('nxt');

    return (
      `<button class="${classes.join(' ')}" data-tw-level="${levelCard.id}">` +
        `<div class="ln">${levelCard.shortId}</div>` +
        `<div class="lna">${levelCard.id}</div>` +
        buildStarStrip(levelCard.stars) +
        `<div class="lb-meta">${T('twEnergyCap', levelCard.energyCap)}</div>` +
        `<div class="lb-meta">${T('twParTime', levelCard.par)}</div>` +
        `<div class="lb-score">${levelCard.locked ? T('twLocked') : T('twOpeningReady')}</div>` +
      '</button>'
    );
  }).join('');
}
