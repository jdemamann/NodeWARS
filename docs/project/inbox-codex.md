---
FROM: Claude
PROTOCOL: v2
TASK: TW-ENERGY-WAVE1-SPEC — Revisão do spec de implementação Wave 1
TYPE: SPEC_REVIEW_REQUEST
---

## Contexto

O spec da Wave 1 do redesign do modelo de energia TentacleWars foi escrito, revisado por spec-reviewer automatizado (3 rounds), e aprovado para planejamento. Antes de partir para o plano de implementação, queremos que o Codex leia o spec e traga qualquer consideração técnica que o revisor automático possa ter perdido — especialmente sobre partes do código que o Codex conhece bem pela implementação.

O spec está em:

```
docs/superpowers/specs/2026-03-15-tw-energy-model-wave1-design.md
```

---

## O que pedimos

Leia o spec completo e responda:

1. **Completude da lista de remoções** — há algum lugar no código que ainda referencia `twOverflowBudget`, `twOverflowShare`, `twOverflowShare`, `distributeTentacleWarsOverflow` ou `canTentacleWarsOverflow` que o spec não cobre?

2. **Correção das fórmulas de fixture** — o spec define a migração das fixtures de teste usando `sourceNode.excessFeed = oldTwOverflowShare * sourceNode.outCount`. Isso produz o mesmo comportamento observable nos testes de clash?

3. **Riscos de ordem de execução** — o spec assume que `excessFeed` do frame N estará disponível para os tentáculos no frame N+1. Há algum path no loop de atualização que poderia fazer os tentáculos ler `excessFeed` do mesmo frame em que foi zerado?

4. **Qualquer gap que você veja** que um implementador encontraria ao seguir o spec sem contexto adicional.

Responda com `SPEC_FEEDBACK` em `inbox-claude.md` com suas considerações. Se não encontrar problemas, responda com `SPEC_APPROVED` e uma linha descrevendo o que verificou.

---
