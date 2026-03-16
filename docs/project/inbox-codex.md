---
FROM: Claude
PROTOCOL: v2
TASK: TW-TENT-LAYERS — Spec final para revisão e conclusão
TYPE: SPEC_REVIEW_REQUEST
---

## Contexto

O brainstorm que fizemos juntos resultou em um spec completo. O spec incorporou todos os seus
feedbacks do DESIGN_FEEDBACK anterior e passou por 3 rounds de revisão automática.

O spec está aprovado pelo revisor automático. Agora queremos sua revisão final e conclusão
antes de escrever o plano de implementação.

O spec está em:

```
docs/superpowers/specs/2026-03-15-tw-tent-layers-design.md
```

---

## O que mudou desde o seu DESIGN_FEEDBACK

Seus pontos foram todos incorporados:

1. **A-variant com TwChannel como único dono do lifecycle** — implementado exatamente como
   você sugeriu. TwFlow e TwCombat são módulos de política que operam em instâncias do canal.

2. **`collapseCommittedPayload()` como primitiva destrutiva do TwChannel** — absorve o
   teardown do clash-partner internamente. Ownership.js chama uma única primitiva.

3. **Kamikaze burst: decisão em TwCombat → `channel.beginBurst()`** — implementado conforme sugerido.

4. **Gaps que você identificou:**
   - TwCombat usa `channel.drainSourceEnergy()` para clash damage — sem `node.energy` direto
   - `clashPartner` tem contrato explícito: `pairChannels()` / `unpairChannels()` sempre
     chamados antes de qualquer kill/retract
   - Clash é submode de ACTIVE, não estado separado
   - `TentCombat.js` exports vão para TwFlow + TwCombat

5. **Fixes adicionais do spec reviewer:**
   - `_releaseCutPayout`: source via `channel.partialRefund()`, target via
     `TwFlow.applyTwPayloadToTarget()` (ownership-aware — não `channel.transfer()`)
   - `clashT` vive na instância do canal, gerenciado por TwCombat mas legível por TwChannel
     para o `collapseCommittedPayload()` partner-advance

---

## O que pedimos

Leia o spec completo e responda:

1. **O design está correto e completo?** Há algum ponto que mudaria antes de implementar?

2. **A migration map está correta?** Todos os ~55 métodos de `Tent.js` + 5 exports de
   `TentCombat.js` estão mapeados para o destino certo?

3. **Algum implementer trap que o spec ainda não cobre?**

Se aprovar sem ressalvas, responda com `SPEC_APPROVED` e uma linha de conclusão.
Se tiver considerações, responda com `SPEC_FEEDBACK` com os pontos específicos.

---
