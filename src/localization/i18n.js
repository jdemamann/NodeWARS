/* ================================================================
   NODE WARS v3 — Internationalisation (PT / EN)
   Fixed: removed duplicate keys from original (phase, enemies,
   range, aiSpeed were declared twice in en:{} — JS silently
   kept only the last). maxLinks is now properly included.
   ================================================================ */

import { STATE } from '../core/GameState.js';

export const LANG = {
  en: {
    pause:'PAUSE', resume:'▶ RESUME', phaseSelect:'PHASE SELECT', restart:'RESTART PHASE',
    skip:'SKIP PHASE ↷', mainMenu:'MAIN MENU', startCampaign:'▶ START CAMPAIGN',
    skipReady:'Skip unlocked after repeated defeats',
    skipLockedBoss:'Boss phases cannot be skipped',
    skipLockedProgress: n => `Skip unlocks after ${n} more defeat(s) on this phase`,
    startWorld2:'⊗ ENTER THE VOID →', settings:'⚙ SETTINGS',
    startWorld3:'⚡ ENTER NEXUS PRIME →',
    theStory:'◈ THE STORY', enterGrid:'▶ ENTER THE GRID', back:'← MENU',
    credits:'◈ CREDITS',
    tutExit:'EXIT',
    /* Settings labels */
    setWorlds:'WORLDS', setGameplay:'GAMEPLAY', setDisplay:'DISPLAY', setDeveloper:'DEVELOPER',
    setGraphicsMode:'✦ GRAPHICS PROFILE', setGraphicsModeDesc:'HIGH for richer effects · LOW for better performance',
    setShowFps:'FPS MONITOR', setShowFpsDesc:'Show the live frame rate in the HUD',
    setW2:'⊗ WORLD 2: THE VOID', setW2desc:'Hazardous vortexes drain energy in transit',
    setW3:'⚡ WORLD 3: NEXUS PRIME', setW3desc:'Relays boost flow · Pulsars broadcast energy',
    setSfx:'SOUND EFFECTS', setSfxDesc:'Procedural audio feedback',
    setMusic:'MUSIC', setMusicDesc:'Procedural adaptive soundtrack',
    setFont:'UI FONT', setFontDesc:'Change the display font',
    setZoom:'TEXT SIZE', setZoomDesc:'Scale the UI text (50–200%)',
    setLang:'LANGUAGE', setLangDesc:'Português / English',
    setTheme:'🎨 THEME', setThemeDesc:'Switch the full interface art direction',
    setDebug:'⚡ DEBUG MODE', setDebugDesc:'All levels unlocked · Shows hidden info',
    setCopyDebug:'COPY SNAPSHOT', setCopyDebugDesc:'Copy runtime diagnostics to the clipboard',
    setReset:'⚠ RESET PROGRESS', setResetDesc:'Clears all stars and completed levels',
    /* Credits */
    creditsTitle:'CREDITS',
    creditsBack:'← MENU',
    phases:'PHASES', retry:'RETRY', next:'NEXT ▶',
    you:'YOU', neutral:'NEUTRAL', enemy:'ENEMY',
    phaseClear:'PHASE CLEAR', annihilated:'ANNIHILATED',
    allComplete:'The Singularity is yours.',
    autoRetract:'AUTO-RETRACT — ENERGY CRITICAL',
    time:'TIME', par:'PAR', wasted:'WASTED', frenzies:'FRENZIES',
    phase:'PHASE', enemies:'ENEMIES', range:'RANGE', aiSpeed:'AI SPEED', maxLinks:'MAX LINKS',
    tentRetracted:'TENTACLES RETRACTED', noLinks:'NO ACTIVE LINKS',
    slotsFullMsg: n  => `SLOTS FULL (${n}) — GAIN ENERGY FOR MORE`,
    needEnergy:  (tot, cost, range, have) => `NEED ${tot}E  BUILD:${cost} RANGE:${range}  HAVE:${have}`,
    flowRev:'FLOW REVERSED ←', flowRest:'FLOW RESTORED →',
    cantReverse:'CANNOT REVERSE ATTACK LINKS',
    alreadyFinal:'ALREADY AT FINAL PHASE',
    tutorial:'TUTORIAL',
    nextAvail:'NEXT',
    progSaved:'Progress auto-saved to browser',
    phaseSuffix: (id, name) => `PHASE ${id} — ${name}`,
    phaseOf:     (id, n)    => `Phase ${id}/${n} complete.`,
    nextPhase:   name       => `Next: ${name}`,
    eliminated:  (id, n)    => `Eliminated at phase ${id}/${n}.`,
    tutComplete:'All phases complete.',
    storTitle:'NODE WARS',
    stor: [
      { t:'// PROLOGUE — THE BIOPLEX', p:'In the year 2187, humanity discovered that consciousness itself could be encoded as a living network — a web of pulsing nodes, each carrying fragments of intelligence and energy. They called this the <b style="color:#00e5ff">Bioplex</b>.' },
      { p:'The Bioplex is divided into three fundamental territories, each with its own laws of physics. Those who master all three control the fate of the entire network.' },
      { t:'// CHAPTER I — AWAKENING · WORLD 1: GENESIS', p:'You are <b style="color:#00e5ff">CERO</b>: a rogue cell-fragment that gained sentience inside a dying Bioplex cluster. When the corporate AI collective — the <b style="color:#ff3d5a">NEXUS HIVE</b> — began purging anomalous nodes, you survived by one truth: <i>energy flows to the bold.</i>' },
      { p:'In Genesis, the laws are pure. <b style="color:#00e5ff">Tentacles</b> are your only weapon and lifeline — each costs energy to build, longer reach costs more. Neutral cells enter an <b style="color:#f5c518">embryo state</b> when attacked. Two forces competing for the same node create a tug-of-war resolved by raw energy density and evolution level.' },
      { q:'"A cell that does not grow, decays. A network that does not expand, dies."' },
      { t:'// CHAPTER II — INTO THE VOID · WORLD 2: THE VOID', p:'Beyond Genesis lies a cursed territory — <b style="color:#c040ff">The Void</b>. Pulsing <b style="color:#c040ff">Vortex Hazards</b> tear through the fabric of the grid, draining energy from any tentacle that passes too close. The closer to the core, the greater the drain.' },
      { p:'In the Void, brute expansion is suicide. Routes must be calculated. Safe corridors must be found and held. The NEXUS HIVE thrives here — it has adapted to the chaos. CERO must learn to route around it, or accept the drain and press harder.' },
      { q:'"The Void does not kill you. It starves you slowly — and that is worse."' },
      { t:'// CHAPTER III — THE FINAL FRONTIER · WORLD 3: NEXUS PRIME', p:'At the heart of the Bioplex lies <b style="color:#ff9020">Nexus Prime</b> — the seat of the NEXUS HIVE\'s power. Here, two ancient structures reshape the war entirely.' },
      { p:'<b style="color:#00e5ff">◈ Relay Nodes</b> — capturable nodes that amplify every tentacle sent through them by +45%. Whoever controls the Relays controls the flow of the entire battlefield.<br><br><b style="color:#ff9020">⚡ Pulsars</b> — neutral beacons that periodically broadcast energy to <b>owned non-relay cells</b> inside their radius. Position your network in the pulse zone, and you receive free power every 4.5 seconds — a tide that turns the war.' },
      { q:'"The Hive built Nexus Prime to be impregnable. CERO built it to be conquered."' },
      { t:'// EPILOGUE — SINGULARITY', p:'When the last NEXUS HIVE node blinks out across all three worlds, the Bioplex will belong to CERO entirely. Not through destruction — but through superior flow, superior routing, superior will.' },
      { q:'"When the last Hive node blinks out, the Bioplex will remember only one pattern: yours."' },
    ],
    tutorialStepsWorld1: [
      { title:'WELCOME TO NODE WARS',
        text:'You control the <b style="color:#00e5ff">cyan cell</b>. Energy regenerates passively — watch the number rise. Cell size grows with energy level (5 levels total). The bigger your cell, the more powerful.',
        action:'read' },
      { title:'SELECT YOUR CELL',
        text:'<b>Click on your cell</b> to select it. A pulsing dashed ring appears showing your attack range. Slot dots at the top show how many tentacles you can send (more at higher levels).',
        action:'select', hint:'Click your cell' },
      { title:'SEND A TENTACLE',
        text:'With your cell selected, <b>click a neutral grey cell</b> or <b>drag from your cell and release on it</b>. A tentacle grows toward it. Notice: <b>energy only starts flowing after the tip fully connects</b> — there is a travel delay.',
        action:'tentacle', hint:'Click or drag to a neutral cell' },
      { title:'CAPTURE IN PROGRESS',
        text:'Watch the arc around the grey cell fill up. Energy travels through the tentacle at a finite speed — you can see the orbs flowing. Capture takes time: <b>be patient and defend your link!</b>',
        action:'capture', hint:'Wait for capture...' },
      { title:'RETRACT A TENTACLE',
        text:'<b>Click your cell again</b> (the sending cell) to retract all its tentacles. Retracting is a tactical cancel: it frees slots, stops pressure, and <b>returns the invested energy to the source cell</b>.',
        action:'retract', hint:'Click your cell again' },
      { title:'THE CUT — YOUR BLADE',
        text:'Send a new tentacle. Then <b>right-click and drag</b> a line across it to cut it.<br><br>⚡ <b>Key mechanic:</b> cut near the <i>source</i> to trigger a burst, cut in the <i>middle</i> to split the link, and cut near the <i>target</i> to force a defensive refund.',
        action:'cut', hint:'Right-drag across the tentacle' },
      { title:'FRENZY MODE',
        text:'<b>Cut 3 active tentacles in the same continuous slice</b> to trigger ⚡ FRENZY — all your cells get +35% regen for 4 seconds. A golden bar pulses on screen.<br><br>This is your most powerful burst tactic.',
        action:'read' },
      { title:'ENERGY RESERVES',
        text:'Cells with <b>high stored energy</b> can sustain more pressure on the frontline. Build support networks so rear cells stay stocked while forward cells keep attacking.<br><br>A gold shimmer shows when a cell is near full and actively feeding the network.',
        action:'read' },
      { title:'TUTORIAL COMPLETE!',
        text:'You know the fundamentals. <b>Capture all enemy cells</b> to win each phase.<br><br><span style="color:#f5c518">★ Scoring: finish under PAR TIME for 3 stars. Every wasted tentacle costs points. Trigger Frenzy for bonus points.</span>',
        action:'done' },
    ],
    tutorialStepsWorld2: [
      { title:'WELCOME TO THE VOID',
        text:'World 2 introduces <b style="color:#c040ff">Vortex Hazards</b> — pulsing purple spirals scattered across the map.<br><br>Any tentacle that passes through a vortex core <b>loses energy in transit</b>. The drain intensifies closer to the center.',
        action:'read' },
      { title:'THE VORTEX HAZARD',
        text:'Watch the purple vortex on screen. It has two zones:<br>• <b style="color:#c040ff">Warning ring</b> (outer) — slow drain<br>• <b style="color:#ff40ff">Core</b> (inner) — heavy drain<br><br>Tentacles crossing the core can lose all their in-transit energy.',
        action:'read' },
      { title:'ROUTE AROUND IT',
        text:'<b>Select your cell and send a tentacle to a neutral cell.</b> You can click or drag-release. Try to reach one that is NOT blocked by the vortex. If your route passes through it, you will see the orbs dim and energy delivery slow down.',
        action:'tentacle', hint:'Click or drag to a neutral cell' },
      { title:'CAPTURE!',
        text:'Watch the orbs on your tentacle. If they dim and delivery slows, the vortex is draining your link.<br><br>Tip: <b>shorter routes avoid more vortex exposure</b>. Prioritise captures in safe corridors.',
        action:'capture', hint:'Wait for capture...' },
      { title:'VOID MASTERED',
        text:'You understand the Void. In upcoming levels, multiple vortexes will force hard routing decisions — sometimes you must accept drain to reach key cells faster.<br><br><b>The Void does not forgive slow play.</b>',
        action:'done' },
    ],
    tutorialStepsWorld3: [
      { title:'WELCOME TO NEXUS PRIME',
        text:'World 3 adds two new structures:<br><b style="color:#00e5ff">◈ Relays</b> — capturable nodes that boost flow by +45%<br><b style="color:#ff9020">⚡ Pulsars</b> — neutral beacons that broadcast energy every 4.5s<br><br>Learn to use both to dominate.',
        action:'read' },
      { title:'RELAY NODES',
        text:'The <b style="color:#00e5ff">teal hexagonal node</b> is a Relay. It starts neutral and can be captured like any other cell.<br><br>Once captured, <b>every tentacle sent FROM that relay gains +45% efficiency</b> — delivering energy faster and farther.',
        action:'read' },
      { title:'CAPTURE THE RELAY',
        text:'<b>Select your cell and capture the Relay node</b> (the hexagonal one). You can click it directly or drag-release onto it. Once you own it, use it as a forward base — send tentacles from it to reach distant cells with a massive flow advantage.',
        action:'capture_relay', hint:'Capture the Relay node' },
      { title:'PULSAR BEACONS',
        text:'The <b style="color:#ff9020">orange beacon</b> is a Pulsar. Every 4.5 seconds it <b>broadcasts energy to owned non-relay cells within its radius</b>.<br><br>⚡ Watch for the charge animation — a ring growing around it — then the burst wave spreading outward.',
        action:'read' },
      { title:'NEXUS PRIME MASTERED',
        text:'You control the fundamentals of Nexus Prime. Strategy tip:<br><br><b>Capture relays early</b> to establish high-efficiency corridors. <b>Position your owned cells inside pulsar radius</b> for free energy every 4.5 seconds.<br><br>Use both to overwhelm the AI.',
        action:'done' },
    ],
  },

  pt: {
    pause:'PAUSAR', resume:'▶ CONTINUAR', phaseSelect:'SELECIONAR FASE', restart:'REINICIAR FASE',
    skip:'PULAR FASE ↷', mainMenu:'MENU PRINCIPAL', startCampaign:'▶ INICIAR CAMPANHA',
    skipReady:'Pulo liberado após derrotas repetidas',
    skipLockedBoss:'Fases de chefe não podem ser puladas',
    skipLockedProgress: n => `O pulo libera após mais ${n} derrota(s) nesta fase`,
    startWorld2:'⊗ ENTRAR NO VAZIO →', settings:'⚙ CONFIGURAÇÕES',
    startWorld3:'⚡ ENTRAR NO NEXO PRIME →',
    theStory:'◈ A HISTÓRIA', enterGrid:'▶ ENTRAR NA REDE', back:'← MENU',
    credits:'◈ CRÉDITOS',
    tutExit:'SAIR',
    /* Settings labels */
    setWorlds:'MUNDOS', setGameplay:'GAMEPLAY', setDisplay:'EXIBIÇÃO', setDeveloper:'DESENVOLVEDOR',
    setGraphicsMode:'✦ PERFIL GRÁFICO', setGraphicsModeDesc:'ALTO para efeitos mais ricos · BAIXO para melhor desempenho',
    setShowFps:'MONITOR DE FPS', setShowFpsDesc:'Mostra a taxa de quadros ao vivo na HUD',
    setW2:'⊗ MUNDO 2: O VAZIO', setW2desc:'Vórtices drenam energia em trânsito',
    setW3:'⚡ MUNDO 3: NEXO PRIME', setW3desc:'Retransmissores aumentam fluxo · Pulsares emitem energia',
    setSfx:'EFEITOS SONOROS', setSfxDesc:'Feedback de áudio procedural',
    setMusic:'MÚSICA', setMusicDesc:'Trilha adaptativa procedural',
    setFont:'FONTE DA UI', setFontDesc:'Alterar a fonte de exibição',
    setZoom:'TAMANHO DO TEXTO', setZoomDesc:'Escala da UI (50–200%)',
    setLang:'IDIOMA', setLangDesc:'Português / English',
    setTheme:'🎨 TEMA', setThemeDesc:'Troca toda a direção visual da interface',
    setDebug:'⚡ MODO DEBUG', setDebugDesc:'Todos os níveis desbloqueados · Mostra info oculta',
    setCopyDebug:'COPIAR SNAPSHOT', setCopyDebugDesc:'Copia o diagnóstico atual para a área de transferência',
    setReset:'⚠ RESETAR PROGRESSO', setResetDesc:'Apaga todas as estrelas e fases concluídas',
    /* Credits */
    creditsTitle:'CRÉDITOS',
    creditsBack:'← MENU',
    phases:'FASES', retry:'TENTAR DE NOVO', next:'PRÓXIMA ▶',
    you:'VOCÊ', neutral:'NEUTRO', enemy:'INIMIGO',
    phaseClear:'FASE CONCLUÍDA', annihilated:'ANIQUILADO',
    allComplete:'A Singularidade é sua.',
    autoRetract:'AUTO-RETRAÇÃO — ENERGIA CRÍTICA',
    time:'TEMPO', par:'PAR', wasted:'DESPERDIÇADOS', frenzies:'FRENZIES',
    phase:'FASE', enemies:'INIMIGOS', range:'ALCANCE', aiSpeed:'VEL. IA', maxLinks:'LINKS MÁX.',
    tentRetracted:'TENTÁCULOS RECOLHIDOS', noLinks:'SEM LINKS ATIVOS',
    slotsFullMsg: n  => `SLOTS CHEIOS (${n}) — GANHE ENERGIA PARA MAIS`,
    needEnergy:  (tot, cost, range, have) => `PRECISA DE ${tot}E  CONSTRUÇÃO:${cost} ALCANCE:${range}  POSSUI:${have}`,
    flowRev:'FLUXO INVERTIDO ←', flowRest:'FLUXO RESTAURADO →',
    cantReverse:'NÃO É POSSÍVEL INVERTER LINKS DE ATAQUE',
    alreadyFinal:'VOCÊ JÁ ESTÁ NA FASE FINAL',
    tutorial:'TUTORIAL',
    nextAvail:'PRÓXIMA',
    progSaved:'Progresso salvo automaticamente no navegador',
    phaseSuffix: (id, name) => `FASE ${id} — ${name}`,
    phaseOf:     (id, n)    => `Fase ${id}/${n} concluída.`,
    nextPhase:   name       => `Próxima: ${name}`,
    eliminated:  (id, n)    => `Eliminado na fase ${id}/${n}.`,
    tutComplete:'Todas as fases concluídas.',
    storTitle:'NODE WARS',
    stor: [
      { t:'// PRÓLOGO — O BIOPLEX', p:'No ano 2187, a humanidade descobriu que a consciência podia ser codificada como uma rede viva — uma teia de nós pulsantes, cada um carregando fragmentos de inteligência e energia. Chamaram isso de <b style="color:#00e5ff">Bioplex</b>.' },
      { p:'O Bioplex é dividido em três territórios fundamentais, cada um com suas próprias leis físicas. Quem dominar os três controlará o destino de toda a rede.' },
      { t:'// CAPÍTULO I — O DESPERTAR · MUNDO 1: GÊNESIS', p:'Você é <b style="color:#00e5ff">CERO</b>: um fragmento celular renegado que ganhou consciência dentro de um cluster Bioplex moribundo. Quando o coletivo de IA corporativo — o <b style="color:#ff3d5a">NEXUS HIVE</b> — começou a purgar nós anômalos, você sobreviveu com uma única verdade: <i>a energia flui para os audaciosos.</i>' },
      { p:'Em Gênesis, as leis são puras. <b style="color:#00e5ff">Tentáculos</b> são sua única arma e linha de vida — cada um custa energia; alcance maior custa mais. Células neutras entram em um <b style="color:#f5c518">estado embrião</b> quando atacadas. Dois atacantes competindo pelo mesmo nó criam uma disputa resolvida pela densidade de energia e nível de evolução.' },
      { q:'"Uma célula que não cresce, decai. Uma rede que não se expande, morre."' },
      { t:'// CAPÍTULO II — NO VAZIO · MUNDO 2: O VAZIO', p:'Além de Gênesis está um território amaldiçoado — <b style="color:#c040ff">O Vazio</b>. <b style="color:#c040ff">Vórtices</b> pulsantes rasgam o tecido da rede, drenando energia de qualquer tentáculo que passe perto demais. Quanto mais próximo do núcleo, maior a drenagem.' },
      { p:'No Vazio, expansão bruta é suicídio. Rotas precisam ser calculadas. Corredores seguros devem ser encontrados e mantidos. O NEXUS HIVE prospera aqui — ele se adaptou ao caos. CERO precisa aprender a desviar, ou aceitar a drenagem e avançar com mais força.' },
      { q:'"O Vazio não te mata. Ele te enfraquece lentamente — e isso é pior."' },
      { t:'// CAPÍTULO III — A FRONTEIRA FINAL · MUNDO 3: NEXO PRIME', p:'No coração do Bioplex está <b style="color:#ff9020">Nexo Prime</b> — o centro do poder do NEXUS HIVE. Aqui, duas estruturas ancestrais transformam completamente a guerra.' },
      { p:'<b style="color:#00e5ff">◈ Retransmissores</b> — nós capturáveis que amplificam cada tentáculo enviado por eles em +45%. Quem controla os Retransmissores controla o fluxo de todo o campo de batalha.<br><br><b style="color:#ff9020">⚡ Pulsares</b> — balizas neutras que periodicamente transmitem energia para <b>células próprias que não sejam retransmissores</b> dentro do raio. Posicione sua rede na zona de pulso e receba energia gratuita a cada 4,5 segundos — uma maré que muda a guerra.' },
      { q:'"O Hive construiu o Nexo Prime para ser impenetrável. CERO o construiu para ser conquistado."' },
      { t:'// EPÍLOGO — SINGULARIDADE', p:'Quando o último nó do NEXUS HIVE se apagar nos três mundos, o Bioplex pertencerá a CERO inteiramente. Não pela destruição — mas pelo fluxo superior, roteamento superior, vontade superior.' },
      { q:'"Quando o último nó do Hive se apagar, o Bioplex lembrará apenas de um padrão: o seu."' },
    ],
    tutorialStepsWorld1: [
      { title:'BEM-VINDO AO NODE WARS',
        text:'Você controla a <b style="color:#00e5ff">célula ciano</b>. A energia se regenera passivamente — observe o número subir. O tamanho da célula cresce com o nível de energia (5 níveis). Célula maior = mais poder.',
        action:'read' },
      { title:'SELECIONE SUA CÉLULA',
        text:'<b>Clique na sua célula</b> para selecioná-la. Um anel pulsante aparece mostrando seu alcance. Os pontos mostram quantos tentáculos você pode enviar (mais em níveis maiores).',
        action:'select', hint:'Clique na sua célula' },
      { title:'ENVIE UM TENTÁCULO',
        text:'Com sua célula selecionada, <b>clique em uma célula neutra cinza</b> ou <b>arraste da sua célula e solte sobre ela</b>. Um tentáculo cresce até ela. Atenção: <b>a energia só flui depois que a ponta se conecta</b> — há um atraso de percurso.',
        action:'tentacle', hint:'Clique ou arraste até uma célula neutra' },
      { title:'CAPTURA EM ANDAMENTO',
        text:'Observe o arco ao redor da célula cinza se preenchendo. A energia viaja em velocidade finita — veja os orbs fluindo. Capturar leva tempo: <b>seja paciente e defenda o link!</b>',
        action:'capture', hint:'Aguarde a captura...' },
      { title:'RECOLHA UM TENTÁCULO',
        text:'<b>Clique novamente na sua célula</b> para recolher todos os tentáculos. Recolher é um cancelamento tático: libera slots, interrompe a pressão e <b>devolve a energia investida para a célula de origem</b>.',
        action:'retract', hint:'Clique novamente na sua célula' },
      { title:'O CORTE — SUA LÂMINA',
        text:'Envie um novo tentáculo. Depois <b>clique com o botão direito e arraste</b> uma linha sobre ele para cortá-lo.<br><br>⚡ <b>Mecânica-chave:</b> corte perto da <i>fonte</i> para disparar um burst, corte no <i>meio</i> para dividir o link, e corte perto do <i>alvo</i> para forçar um reembolso defensivo.',
        action:'cut', hint:'Arraste o botão direito sobre o tentáculo' },
      { title:'MODO FRENZY',
        text:'<b>Corte 3 tentáculos ativos no mesmo gesto contínuo</b> para ativar ⚡ FRENZY — todas as suas células ganham +35% de regen por 4 segundos. Uma barra dourada pulsa na tela.<br><br>Esta é sua tática de explosão mais poderosa.',
        action:'read' },
      { title:'RESERVAS DE ENERGIA',
        text:'Células com <b>alta energia armazenada</b> sustentam melhor a linha de frente. Monte redes de suporte para manter a retaguarda abastecida enquanto a frente continua atacando.<br><br>Um brilho dourado indica quando a célula está quase cheia e alimentando a rede com folga.',
        action:'read' },
      { title:'TUTORIAL COMPLETO!',
        text:'Você conhece os fundamentos. <b>Capture todas as células inimigas</b> para vencer cada fase.<br><br><span style="color:#f5c518">★ Pontuação: termine abaixo do TEMPO PAR para 3 estrelas. Tentáculos desperdiçados custam pontos. Ative Frenzy para bônus.</span>',
        action:'done' },
    ],
    tutorialStepsWorld2: [
      { title:'BEM-VINDO AO VAZIO',
        text:'O Mundo 2 introduz <b style="color:#c040ff">Vórtices</b> — espirais roxas espalhadas pelo mapa.<br><br>Qualquer tentáculo que passe pelo núcleo de um vórtice <b>perde energia em trânsito</b>. A drenagem aumenta quanto mais próximo do centro.',
        action:'read' },
      { title:'O VÓRTICE',
        text:'Observe o vórtice roxo na tela. Ele tem duas zonas:<br>• <b style="color:#c040ff">Anel de aviso</b> (externo) — drenagem leve<br>• <b style="color:#ff40ff">Núcleo</b> (interno) — drenagem intensa<br><br>Tentáculos que cruzam o núcleo podem perder toda a energia em trânsito.',
        action:'read' },
      { title:'DESVIE DELE',
        text:'<b>Selecione sua célula e envie um tentáculo para uma célula neutra.</b> Você pode clicar ou arrastar e soltar. Tente alcançar uma que NÃO seja bloqueada pelo vórtice. Se a rota passar por ele, os orbs escurecerão e a entrega de energia diminuirá.',
        action:'tentacle', hint:'Clique ou arraste até uma célula neutra' },
      { title:'CAPTURE!',
        text:'Observe os orbs no tentáculo. Se escurecerem e a entrega diminuir, o vórtice está drenando o link.<br><br>Dica: <b>rotas mais curtas evitam mais exposição ao vórtice</b>. Priorize capturas em corredores seguros.',
        action:'capture', hint:'Aguarde a captura...' },
      { title:'VAZIO DOMINADO',
        text:'Você entende o Vazio. Nos próximos níveis, múltiplos vórtices forçarão decisões difíceis de roteamento — às vezes você deve aceitar a drenagem para alcançar células-chave mais rápido.<br><br><b>O Vazio não perdoa jogo lento.</b>',
        action:'done' },
    ],
    tutorialStepsWorld3: [
      { title:'BEM-VINDO AO NEXO PRIME',
        text:'O Mundo 3 adiciona duas estruturas novas:<br><b style="color:#00e5ff">◈ Retransmissores</b> — nós capturáveis que aumentam o fluxo em +45%<br><b style="color:#ff9020">⚡ Pulsares</b> — balizas neutras que transmitem energia a cada 4,5s<br><br>Aprenda a usar ambos para dominar.',
        action:'read' },
      { title:'RETRANSMISSORES',
        text:'O <b style="color:#00e5ff">nó hexagonal ciano</b> é um Retransmissor. Começa neutro e pode ser capturado normalmente.<br><br>Uma vez capturado, <b>todo tentáculo enviado A PARTIR dele ganha +45% de eficiência</b> — entregando energia mais rápido e mais longe.',
        action:'read' },
      { title:'CAPTURE O RETRANSMISSOR',
        text:'<b>Selecione sua célula e capture o nó Retransmissor</b> (o hexagonal). Você pode clicar nele diretamente ou arrastar e soltar. Depois use-o como base avançada — envie tentáculos a partir dele para alcançar células distantes com enorme vantagem de fluxo.',
        action:'capture_relay', hint:'Capture o Retransmissor' },
      { title:'PULSARES',
        text:'A <b style="color:#ff9020">baliza laranja</b> é um Pulsar. A cada 4,5 segundos ele <b>transmite energia para células próprias que não sejam retransmissores dentro do raio</b>.<br><br>⚡ Observe a animação de carga — um anel crescendo ao redor — e então a onda de pulso se expandindo.',
        action:'read' },
      { title:'NEXO PRIME DOMINADO',
        text:'Você controla os fundamentos do Nexo Prime. Dica estratégica:<br><br><b>Capture retransmissores cedo</b> para criar corredores de alta eficiência. <b>Posicione suas células próprias dentro do raio do pulsar</b> para energia grátis a cada 4,5 segundos.<br><br>Use ambos para esmagar a IA.',
        action:'done' },
    ],
  },
};

export function getTutorialSteps(language, tutorialWorldId = 1) {
  const worldId = tutorialWorldId > 1 ? tutorialWorldId : 1;
  const tutorialKey = `tutorialStepsWorld${worldId}`;
  return LANG[language]?.[tutorialKey] || LANG.en[tutorialKey] || LANG.en.tutorialStepsWorld1;
}

/** Translate key with optional args. Falls back to EN if PT key missing. */
export function T(k, ...args) {
  const v = LANG[STATE.curLang][k];
  if (v !== undefined) return typeof v === 'function' ? v(...args) : v;
  const fallback = LANG.en[k];
  return typeof fallback === 'function' ? fallback(...args) : (fallback ?? k);
}

export function setLang(lang) {
  STATE.saveLang(lang);
  document.getElementById('btnlangpt')?.classList.toggle('active', lang === 'pt');
  document.getElementById('btnlangen')?.classList.toggle('active', lang === 'en');
  const msub = document.getElementById('msub');
  if (msub) msub.innerHTML = lang === 'pt'
    ? 'A rede está viva. Energia flui. Nós evoluem.<br>Domine a grade — ou seja consumido por ela.'
    : 'The network is alive. Energy flows. Nodes evolve.<br>Dominate the grid — or be consumed by it.';
  applyLang();
}

export function curLang() { return STATE.curLang; }

export function toggleLang() {
  setLang(STATE.curLang === 'pt' ? 'en' : 'pt');
}

export function applyLang() {
  const lang = STATE.curLang;
  document.querySelectorAll('[data-t]').forEach(el => {
    const k = el.dataset.t;
    const v = LANG[lang][k];
    if (v && typeof v === 'string') el.textContent = v;
  });

  const pauseEl = document.querySelector('#hpause [data-t="pause"]');
  if (pauseEl) pauseEl.textContent = T('pause');

  const langBtn = document.getElementById('hlang');
  if (langBtn) langBtn.textContent = lang === 'pt' ? 'PT|EN' : 'EN|PT';

  document.documentElement.lang = lang;

  const hh = document.getElementById('hhints');
  if (hh) {
    const hints = lang === 'pt'
      ? [['CLIQUE','selecionar → enviar'],['ARRASTE E SOLTE','conectar / atacar'],['RE-CLIQUE NO NÓ','recolher todos'],['ARRASTAR DIR.','cortar links']]
      : [['CLICK','select → link'],['DRAG & RELEASE','connect / attack'],['RE-CLICK NODE','retract all'],['R-DRAG','cut links']];
    hh.innerHTML = hints.map(([b, t]) => `<span><b>${b}</b> ${t}</span>`).join('');
  }
}
