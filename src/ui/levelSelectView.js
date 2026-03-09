export function buildLevelMechanicBadge(levelConfig) {
  if (levelConfig.vortexCount > 0) {
    return '<div class="lb-meta lb-meta-vortex">VORTEX×' + levelConfig.vortexCount +
      (levelConfig.hasSuperVortex ? ' ⊗' : '') +
      (levelConfig.movingVortexCount ? ' MV' : '') +
      (levelConfig.pulsingVortexPeriodSeconds ? ' ∿' : '') +
      '</div>';
  }

  if (levelConfig.relayCount > 0 || levelConfig.pulsarCount > 0 || levelConfig.signalTowerCount) {
    return '<div class="lb-meta lb-meta-world3">' +
      (levelConfig.relayCount ? 'R×' + levelConfig.relayCount : '') +
      (levelConfig.relayCount && levelConfig.pulsarCount ? ' ' : '') +
      (levelConfig.pulsarCount ? 'P×' + levelConfig.pulsarCount : '') +
      ((levelConfig.relayCount || levelConfig.pulsarCount) && levelConfig.signalTowerCount ? ' ' : '') +
      (levelConfig.signalTowerCount ? 'S×' + levelConfig.signalTowerCount : '') +
      (levelConfig.fortifiedRelayCount ? ' <span class="lb-accent-fort">FORT×' + levelConfig.fortifiedRelayCount + '</span>' : '') +
      (levelConfig.hasSuperPulsar ? ' <span class="lb-accent-core">CORE</span>' : '') +
      '</div>';
  }

  if (levelConfig.bunkerCount || levelConfig.isSymmetricLayout) {
    return '<div class="lb-meta lb-meta-fort">' +
      (levelConfig.bunkerCount ? 'BK×' + levelConfig.bunkerCount : '') +
      (levelConfig.isSymmetricLayout ? (levelConfig.bunkerCount ? ' ' : '') + 'ECHO' : '') +
      '</div>';
  }

  return '';
}

export function buildPurpleEnemyBadge(levelConfig) {
  if (!levelConfig.purpleEnemyCount || levelConfig.purpleEnemyCount <= 0) return '';
  return '<div class="lb-meta lb-meta-purple">⚔ CUTTHROAT×' + levelConfig.purpleEnemyCount + '</div>';
}
