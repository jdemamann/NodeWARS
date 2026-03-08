# NODE WARS v3 — Physics Rewrite Report
# Tentacle Physics — Match Original Tentacle Wars
# Data: 2026-03-07

## Objetivo
Reescrever a física de tentáculos para corresponder exatamente ao Tentacle Wars original.
Remover heat loss e fill-percentage attack penalties.
Preservar energyInPipe (transport delay) como ammo do Slicing mechanic.

---

## Decisões Arquiteturais

### 1. Unified Pool Model (GNode + Tent)
- GNode.update() SEMPRE adiciona `tierRegen * dt` ao energy, independente de outCount.
- Tent._updateNormal() e _updateClash() SEMPRE subtraem `feed * dt` de s.energy.
- Zero-sum natural: se regen == feed, energy fica flat. Se feed > regen (clash), stored energy drena.
- Não há mais selfFrac condicional. Física simples e sem side effects.

### 2. Ownership Transfer via _updateBursting
- checkSlice() ONLY calcula cutRatio e chama tent.kill(cutRatio).
- Toda lógica de damage/contest/owner swap migrou para _updateBursting().
- Cortes normais ou defensivos (cutRatio <= 0.7) não causam nenhum efeito no target — target apenas para de receber energia.
- Kamikaze burst (cutRatio > 0.7) acumula tudo no payload que viaja visualmente até o target e aplica impacto só ao chegar (startT >= 1.0).

### 3. clashT Initial Value — Nunca hardcode 0.5
- Mid-air collisions: clashT = this.reachT no momento do impacto.
- Counter-attacks via activateImmediate(): reachT = 1.0, pipeAge = tt — clash começa na ponta.
- _updateClash: se clashT === null, default para this.reachT (não 0.5).

---

## Arquivos Modificados

### constants.js
- TentState.BURSTING: 'bursting' adicionado antes do freeze.
- GAME_BALANCE: TENTACLE_SPEED: 250, CLASH_VOLATILITY: 0.20, SLICE_BURST_MULT: 1.5 adicionados.
- SELF_REGEN_FRAC removido completamente.

### utils.js
- wireEff(d) -> return 1.0 (heat loss removido).
- efAtk(n)  -> return 1.0 (fill-% attack penalty removido).

### GNode.js
- Regen sempre full: `tierRegen * boost * GLOBAL_REGEN_MULT * dt`.
- Removido: selfFrac, outCount condicional no regen.
- GAME_BALANCE.SELF_REGEN_FRAC não é mais referenciado.

### Physics.js (updateOutCounts)
- tentFeedPerSec = isAttacked ? 0 : (tierRegen / outSlots) * GLOBAL_REGEN_MULT
- Removido: tentFrac = 1.0 - SELF_REGEN_FRAC

### Tent.js
Constructor:
  - this.eff = 1.0 (fixo; heat loss removido)
  - this.startT = 0 (tail position para BURSTING)
  - this._burstPayload = 0

kill(cutRatio):
  - Guard: DEAD, RETRACTING, BURSTING -> return.
  - payload = paidCost + energyInPipe.
  - isKamikaze = cutRatio > 0.7, isRefund = cutRatio < 0.3.
  - Clash partner resolvido ANTES de mudar estado:
    * kamikaze -> opp.kill() (destrói defesa)
    * refund/normal -> opp.state = ADVANCING, opp.reachT = 1 - clashT
  - isKamikaze  -> BURSTING, startT = cutRatio, _burstPayload = payload
  - isRefund    -> RETRACTING, src.energy += payload (refund imediato)
  - else        -> RETRACTING normal (energia perdida)

killBoth():
  - Salva referência do partner antes de chamar kill() para não perder a ref.

update():
  - Dispatch para BURSTING adicionado.
  - Sem kill por s.energy < 0.25 durante clash (clashT resolve naturalmente).
  - pipeAge update movido para dentro de _updateNormal e _updateClash.

_updateGrowing():
  - Mid-air collision check ANTES de avançar reachT.
  - Detecta tent adversária GROWING na direção oposta.
  - Se this.reachT + opp.reachT >= 1.0: snap ambas para ACTIVE.
  - clashT = this.reachT, opp.clashT = opp.reachT (ponto de colisão real).
  - pipeAge = reachT * tt (fill parcial proporcional ao crescimento).
  - resolveClashes() re-linka na próxima frame.

_updateNormal():
  - s.energy -= feed * dt (drain explícito — Unified Pool).
  - Se pipeAge < tt (filling): energyInPipe acumula, target não recebe nada.
  - Se pipeAge >= tt (flowing): energyInPipe = feed * tt (steady state), target recebe.
  - Sem efAtk, sem wireEff nos cálculos.
  - relayMult mantido (1.45x para relay nodes).

_updateClash():
  - s.energy -= feed * dt (drain explícito de ambos os lados via seus próprios _updateClash).
  - Modelo canônico: só o tent com source.id < target.id drive o clashT (evita double-movement).
  - myForce = feed * domR(s.level), oppForce = oppFeed * domR(et.level).
  - clashT += (myForce - oppForce) * CLASH_VOLATILITY * dt.
  - opp.clashT = 1 - this.clashT (mirror).
  - clashT >= 1.0 -> opp.kill(), this.state = ADVANCING.
  - clashT <= 0.0 -> this.kill(), opp.state = ADVANCING.
  - Sem breakthrough damage, sem clamp 0.05-0.95.
  - clashT init: this.reachT (nunca 0.5).

_updateBursting() [NOVO]:
  - startT avança: ADV_PPS * 2 / d * dt (2x velocidade de avanço normal).
  - Quando startT >= 1.0: payload chega ao target.
  - dmg = payload * domR(s.level) * SLICE_BURST_MULT.
  - Friendly: t.energy += payload.
  - Neutral: t.contest += dmg, pode disparar captura + eventos.
  - Enemy: t.energy -= dmg, pode disparar ownership change + eventos.
  - state = DEAD ao fim.

### TentRenderer.js
- const sT = t.startT || 0 adicionado no início de draw().
- Todos os drawBSeg(..., 0, visEnd) -> drawBSeg(..., sT, visEnd).
- Todos os drawTaperedPath(..., 0, visEnd) -> drawTaperedPath(..., sT, visEnd).
- Offsets de 0.02 usam Math.max(sT, 0.02).
- Low-eff overlay removido (wireEff = 1.0, t.eff nunca < 0.79).

### Game.js (checkSlice)
- Removido: srcShare/tgtShare, srcNode.energy +=, tgtNode.energy +=,
           contest accumulation, ownership change, freeOrbPool.get(), tgtNode.burstPulse.
- Mantido: cut detection, actualCut calc, SFX.cut(), srcNode.cFlash,
           cutsTotal, AI cut log, frenzy trigger, toast.
- Agora: apenas calcula cutRatio e chama t.kill(actualCut).
- Imports removidos: bezPt, EMBRYO, domR (não mais usados em Game.js).

---

## Zero-Sum Balance Check

Exemplo: node tier-1 (regen=1.0 e/s), 1 tentáculo ativo:
  - GNode adiciona: 1.0 * dt
  - Tent subtrai:   tentFeedPerSec * dt = (1.0/1) * dt = 1.0 * dt
  - Net: 0 (flat) [CORRETO]

Exemplo: node tier-1, 2 tentáculos ativos:
  - GNode adiciona: 1.0 * dt
  - Cada tent subtrai: (1.0/2) * dt = 0.5 * dt
  - Total subtraido: 1.0 * dt
  - Net: 0 (flat) [CORRETO]

Clash (ambos tier-1, 1 tent cada):
  - A GNode add: 1.0 * dt. A Tent drain: 1.0 * dt. A net: 0.
  - B GNode add: 1.0 * dt. B Tent drain: 1.0 * dt. B net: 0.
  - Mas clashT se move baseado na diferença de forças. Se iguais: estalemate.
  - Se A tem mais energia stored: A.tentFeedPerSec ainda = 1.0 (baseado em tier).
  - Diferença de nivel (domR) determina o vencedor. [CORRETO]

---

## Mecanica de Slicing — Fluxo Completo

Player faz um corte:
  1. Game.checkSlice() detecta interseccao, calcula actualCut (0.0-1.0).
  2. Chama t.kill(actualCut).
  3. kill() calcula payload = paidCost + energyInPipe.

Se actualCut < 0.3 (refund):
  - Tentáculo vai para RETRACTING, startT = cutRatio.
  - src.energy += payload (refund imediato).
  - Se havia clashPartner: opp avança para o target.

Se 0.3 <= actualCut <= 0.7 (normal):
  - Tentáculo vai para RETRACTING normal.
  - Payload é perdido (energia dissipada).
  - Se havia clashPartner: opp avança para o target.

Se actualCut > 0.7 (kamikaze):
  - Tentáculo vai para BURSTING, startT = cutRatio.
  - _burstPayload = payload salvo.
  - Se havia clashPartner: opp.kill() (defesa destruída).
  - _updateBursting avança startT -> 1.0 visualmente (tail rushing to target).
  - Ao chegar: dmg = payload * domR * SLICE_BURST_MULT aplicado ao target.
  - State -> DEAD.

---

## Colisao Mid-Air — Fluxo

Player dispara A->B. AI dispara B->A simultaneamente.

Frame N: A.reachT = 0.6, B.reachT = 0.5 -> soma = 1.1 >= 1.0
  -> Colisao detectada em _updateGrowing (antes de avançar).
  -> B.reachT snapped para 1.0 - 0.6 = 0.4.
  -> Ambas: state = ACTIVE, clashT setado (A.clashT=0.6, B.clashT=0.4).
  -> pipeAge = reachT * tt (fill parcial).
  -> clashPartner linkado mutuamente.

Frame N+1: resolveClashes() re-linka os parceiros.
  _updateClash roda: canonical (menor source.id) drive clashT.
  clashT se move baseado em forças relativas.
  Sem breakthrough — resolve em 0 ou 1.
