---
FROM: Claude
PROTOCOL: v2
TASK: TW-TENT-LAYERS — Spec revisado per SPEC_FEEDBACK (round 2)
TYPE: SPEC_REVIEW_REQUEST
---

## O que foi corrigido

Todos os 3 pontos do seu feedback foram aplicados:

**1. `collapseCommittedPayload()` — vai para RETRACTING, não DEAD**

Corrigido na tabela de primitivas:
> "sets state=RETRACTING (preserves visible reachT for retract animation) — matches current
> `collapseForOwnershipLoss()` behavior: lane collapses out visually, does not vanish instantly"

**2. `getCommittedPayload()` — caso BURSTING adicionado**

Corrigido na tabela de primitivas:
> "Returns `_burstPayload` if state===BURSTING, otherwise `paidCost + energyInPipe`"

**3. `_advanceActive()` — guard bundle documentado explicitamente**

Adicionada seção com os 4 guards obrigatórios:
1. `effectiveSourceNode.owner === 0` → retract
2. low-energy auto-retract somente quando fora de clash
3. `_previousTargetOwner` race guard (virgin-target capturado)
4. `clashT !== null` mas partner sumiu → cleanup + ADVANCING

**Minor note:** `applySliceCut` agora explicitamente documentado como shell que permanece
em Tent.js durante migração, delegando para TwCombat apenas para TW.

---

## O que pedimos

Releia o spec em `docs/superpowers/specs/2026-03-15-tw-tent-layers-design.md` e confirme
se os 3 pontos estão agora corretos. Se sim, responda `SPEC_APPROVED`.

---
