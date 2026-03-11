/* ================================================================
   Campaign ending view

   Builds the final epilogue content shown after the last campaign
   phase. Returns a plain view model so ScreenController can render it.
   ================================================================ */

function buildEndingStat(label, value, accentClass = '') {
  return (
    '<div class="ending-stat">' +
      '<div class="ending-stat-label">' + label + '</div>' +
      '<div class="ending-stat-value ' + accentClass + '">' + value + '</div>' +
    '</div>'
  );
}

export function buildCampaignEndingMarkup(game, translate, language, { debugPreview = false } = {}) {
  // Inputs are the finished Game snapshot and a translation lookup. The output
  // is a plain object consumed by ScreenController.
  const elapsedSeconds = Math.floor(game?.scoreTime || 0);
  const worldsReclaimed = '3 / 3';
  const cuts = game?.cutsTotal || 0;
  const frenzies = game?.frenzyCount || 0;
  const score = Math.max(0, game?.calcScore?.() || 0);
  const story = translate('endingStory');
  const bodyMarkup = story
    .map(paragraph => '<div class="ending-paragraph">' + paragraph + '</div>')
    .join('');
  const statsMarkup =
    buildEndingStat(translate('endingWorlds'), worldsReclaimed, 'ending-stat-good') +
    buildEndingStat(translate('endingCuts'), String(cuts)) +
    buildEndingStat(translate('endingFrenzies'), `${frenzies}x`) +
    buildEndingStat(translate('endingTime'), `${elapsedSeconds}s`) +
    buildEndingStat(translate('endingScore'), String(score), 'ending-stat-accent');

  const subtitle = debugPreview
    ? translate('endingSubtitleDebug')
    : translate('endingSubtitle');

  return {
    title: translate('endingTitle'),
    subtitle,
    bodyMarkup,
    statsMarkup,
    quote: translate('endingQuote'),
  };
}
