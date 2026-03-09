export function buildMechanicSummary(levelConfig) {
  return [
    levelConfig.vortexCount ? (levelConfig.hasSuperVortex ? 'VOID CORE' : 'VORTEX') : null,
    levelConfig.relayCount ? 'RELAY' : null,
    levelConfig.pulsarCount ? (levelConfig.hasSuperPulsar ? 'NEXUS CORE' : 'PULSAR') : null,
    levelConfig.signalTowerCount ? 'SIGNAL' : null,
    levelConfig.bunkerCount || levelConfig.fortifiedRelayCount ? 'FORT' : null,
    levelConfig.purpleEnemyCount ? 'PURPLE AI' : null,
  ].filter(Boolean).join(' · ');
}

export function buildResultInfoMarkup(levelConfig, game, translate, totalLevels) {
  const parSeconds = levelConfig.par || 120;
  const elapsedSeconds = Math.floor(game.scoreTime);
  const isUnderPar = elapsedSeconds <= parSeconds;
  const elapsedMarkup = (isUnderPar ? '<span class="result-good">' : '<span class="result-alert">') + elapsedSeconds + 's</span>';
  const parDeltaMarkup = (isUnderPar
    ? '<span class="result-good">-' + (parSeconds - elapsedSeconds) + 's ▲</span>'
    : '<span class="result-bad">+' + (elapsedSeconds - parSeconds) + 's ▼</span>') +
    ' (par ' + parSeconds + 's)';
  const mechanicSummary = buildMechanicSummary(levelConfig);

  return '<div class="lr"><div class="ll">' + translate('phase')  + '</div><div class="lv">' + levelConfig.id + '/' + totalLevels + '</div></div>' +
    '<div class="lr"><div class="ll">' + translate('time')   + '</div><div class="lv">' + elapsedMarkup + ' ' + parDeltaMarkup + '</div></div>' +
    '<div class="lr"><div class="ll">' + translate('wasted') + '</div><div class="lv">' + (game.wastedTents || 0) + ' link(s) <span class="result-subnote">(-' + (game.wastedTents || 0) * 25 + 'p)</span></div></div>' +
    '<div class="lr"><div class="ll">' + translate('frenzies')+ '</div><div class="lv">' + (game.frenzyCount || 0) + 'x <span class="result-bonus">(+' + Math.min(90, (game.frenzyCount || 0) * 30) + 'p)</span></div></div>' +
    '<div class="lr"><div class="ll">' + translate('enemies') + '</div><div class="lv">' + (levelConfig.enemyCount + (levelConfig.purpleEnemyCount || 0)) + ' eliminated</div></div>' +
    (mechanicSummary ? '<div class="lr"><div class="ll">MECH</div><div class="lv lv-mech">' + mechanicSummary + '</div></div>' : '');
}
