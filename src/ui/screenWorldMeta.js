/* ================================================================
   Screen world metadata

   Provides display-only metadata for world tabs, banners, and accents.
   ================================================================ */

export function getLevelSelectWorldMeta(language) {
  // This is presentation-only metadata; it should not be used as a gameplay
  // source of truth for unlock or progression rules.
  const isPortuguese = language === 'pt';
  return {
    0: { name: 'TUTORIAL', col: '#00ff9d', icon: '◈', sub: '' },
    1: {
      name: isPortuguese ? 'GÊNESIS' : 'GENESIS',
      col: '#00c8e0',
      icon: '◈',
      sub: isPortuguese ? 'O Despertar' : 'The Awakening',
    },
    2: {
      name: isPortuguese ? 'O VAZIO' : 'THE VOID',
      col: '#c040ff',
      icon: '⊗',
      sub: isPortuguese ? 'Vórtices' : 'Drain Vortexes',
    },
    3: {
      name: isPortuguese ? 'NEXO PRIME' : 'NEXUS PRIME',
      col: '#ff9020',
      icon: '⚡',
      sub: isPortuguese ? 'Retransmissores e Pulsares' : 'Relays & Pulsars',
    },
  };
}

export function getLevelGridWorldAccent(worldId) {
  return {
    1: { col: '#00c8e0' },
    2: { col: '#c040ff' },
    3: { col: '#ff9020' },
  }[worldId] || { col: '#00c8e0' };
}

export function getWorldBannerMeta(worldId, language) {
  const isPortuguese = language === 'pt';
  const worldMeta = {
    1: {
      name: 'GENESIS',
      sub: 'The Awakening',
      col: '#00c8e0',
      icon: '◈',
      mechanic: '',
      localizedSub: 'O Despertar',
    },
    2: {
      name: 'THE VOID',
      sub: 'Drain Vortexes Ahead',
      col: '#c040ff',
      icon: '⊗',
      mechanic: 'Vortexes drain your tentacles. Route wisely.',
      localizedSub: 'Vórtices de Drenagem',
    },
    3: {
      name: 'NEXUS PRIME',
      sub: 'Relays & Pulsars',
      col: '#ff9020',
      icon: '⚡',
      mechanic: 'Capture Relays for flow bonus. Pulsars broadcast energy.',
      localizedSub: 'Retransmissores e Pulsares',
    },
  }[worldId];

  if (!worldMeta) return null;

  return {
    ...worldMeta,
    subText: isPortuguese ? worldMeta.localizedSub : worldMeta.sub,
    mechanicText: isPortuguese
      ? (worldId === 2
          ? 'Vórtices drenam seus tentáculos. Planeje rotas.'
          : worldId === 3
            ? 'Capture Retransmissores. Pulsares emitem energia.'
            : 'O Despertar')
      : worldMeta.mechanic,
  };
}
