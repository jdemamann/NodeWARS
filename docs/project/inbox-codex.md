---
FROM: Claude
PROTOCOL: v2
TASK: ENERGY-MODEL-REVIEW — Análise do modelo de energia TW e proposta de redesign
TYPE: REVIEW_REQUEST
---

## Contexto

Esta sessão produziu um diagnóstico profundo do modelo de energia do TentacleWars e identificou um problema estrutural que causava "sensação estranha" ao jogar — células sob ataque drenavam rápido mesmo com triângulo de suporte ativo (A→B→C→A).

Corrigimos dois bugs imediatos (overflow accounting e packet rendering durante clash), mas o diagnóstico revelou que a arquitetura atual é over-engineered e diverge do modelo mental correto.

---

## O modelo mental correto (acordado com o usuário)

> **Nodo = reservatório. Tentáculo = cano. Energia entra, enche o reservatório, o excesso flui para os tentáculos de saída. O nodo não precisa saber sobre "overflow" como conceito — ele só vê energia entrando e saindo.**

"Overflow" é um efeito emergente percebido pelo jogador (célula cheia → pacotes fluindo mais rápido), não uma abstração no código.

---

## Diagnóstico: o que está errado hoje

### Abstrações desnecessárias que existem hoje

| Abstração | O que faz | Por que é desnecessária |
|---|---|---|
| `twOverflowBudget` | Acumula excesso de energia por frame | Deveria ser emergente: excesso = `incoming - availableRoom` |
| `twOverflowShare` | Fatia pré-calculada por tentáculo | Pré-distribuição acoplada ao Physics; pode ser calculada on-demand |
| `distributeTentacleWarsOverflow` | Distribui overflow entre lanes | Substituída por `excessFeed / outCount` simples |
| `captureTentacleWarsOverflowBudget` | Capturava `inFlow` total (BUG: incluía energia absorvida) | Já removida nesta sessão |
| Physics Step 4 inteiro | Pré-atribui `twOverflowShare` a cada tentáculo | Desnecessário no modelo novo |

### Fragilidades confirmadas

1. **`inFlow` mistura energia absorvida + excesso real** — semântica confusa, foi a raiz do bug de healing.
2. **`twOverflowShare` pré-calculado no Physics** — acoplamento frágil por ordem de execução; falha silenciosa se ordem mudar.
3. **`OVERFLOW_MODE: broadcast_full` multiplica energia** — com 3 tentáculos de saída, o overflow é triplicado (cria energia do nada). `split_equal` é o modelo fisicamente correto.
4. **`energyInPipe` tem semântica diferente em TW vs NodeWARS** — em TW conta pacotes; em NodeWARS conta energia real. O invariante de refund `paidCost + energyInPipe` fica semanticamente errado em TW.
5. **~50+ condicionais `if simulationMode === 'tentaclewars'`** espalhados em Tent.js, EnergyBudget.js — difícil auditar, difícil testar.

### Bugs corrigidos nesta sessão (commits já em main)

- `captureTentacleWarsOverflowBudget` removida: `twOverflowBudget` agora é acumulado por `applyTentacleFriendlyFlow` (excesso real) e usado no frame seguinte. Corrigiu o healing do triângulo.
- Packet emission durante clash: `packetTravelQueue` agora alimentada para ambos tentáculos durante clash.
- Renderer: `travelDuration * clashT` passado corretamente para o packet sampler durante clash.
- Clash bidirectional damage: canônico mais fraco agora perde corretamente.
- `opposingTentacle.clashT = null` em step 3b do retract.

---

## Proposta de redesign (Abordagem A)

### Princípio

```
feedDisponível = regenRate + max(0, incoming - availableRoom)
feedPorTentáculo = feedDisponível / outCount
```

Quando o nodo está cheio: `availableRoom = 0` → todo incoming vira feed adicional para saída.
Quando abaixo do max: incoming vai para o nodo primeiro; o restante vai para os tentáculos.

### Mudanças estruturais

**Novo no nodo:**
- `node.excessFeed` — única propriedade nova. Representa energia que chegou mas não coube no frame anterior. Substituí todo o sistema de `twOverflowBudget`/`twOverflowShare`.

**`applyTentacleFriendlyFlow` (TentCombat.js):**
- Continua absorvendo energia no nodo até maxE (comportamento atual correto)
- Excesso: `node.excessFeed += overflowEnergy` (em vez de `node.twOverflowBudget`)

**`_updateTentacleWarsActiveFlowState` (Tent.js):**
- Feed rate = `(node.tentFeedPerSec + node.excessFeed / outCount)` — calculado on-demand
- Remove leitura de `this.twOverflowShare`

**Physics.updateOutCounts:**
- Remove Step 4 inteiro (4a, 4b, 4c, 4d)
- Adiciona apenas: `n.excessFeed = 0` no loop de reset inicial
- Remove import de `distributeTentacleWarsOverflow`

**`OVERFLOW_MODE`:**
- Muda default para `split_equal` (energia conservada)
- `broadcast_full` mantido como opção de tuning de jogabilidade
- A lógica de split vira uma linha: `excessFeed / outCount` vs `excessFeed`

**Removidos completamente:**
- `twOverflowBudget` (GameNode)
- `twOverflowShare` (Tent)
- `captureTentacleWarsOverflowBudget` (EnergyBudget) — já removida
- `distributeTentacleWarsOverflow` (TwEnergyModel)
- `canTentacleWarsOverflow` (TwEnergyModel)
- Physics Step 4 (Physics.js)

### Abordagem C (onda posterior)

Após A estabilizar: unificar as ~50+ branches `if simulationMode === 'tentaclewars'` em paths únicas controladas por constantes de balance. TW e NodeWARS passam a usar o mesmo modelo de energia com parâmetros diferentes, não código diferente.

---

## O que pedimos ao Codex

**Analise esta proposta e responda:**

1. **Viabilidade técnica da Abordagem A** — há algum lugar no código que depende de `twOverflowBudget`, `twOverflowShare`, ou `distributeTentacleWarsOverflow` que não foi listado acima e que quebraria com a mudança?

2. **`energyInPipe` em TW** — confirme se o invariante `paidCost + energyInPipe` está sendo usado em cortes (slices) no modo TW. Se estiver, a semântica errada (pacotes vs energia) está causando distribuição incorreta?

3. **`inFlow` — ainda necessário?** — depois da remoção de `captureTentacleWarsOverflowBudget`, `inFlow` ainda serve para algo além de `relayFeedBudget`? Se o relay é o único consumidor, podemos renomear para `relayInFlow` e tornar a semântica explícita.

4. **Ordem de execução** — no modelo novo, `excessFeed` do frame N é usado pelos tentáculos no frame N+1 (1-frame lag). Isso é aceitável ou há cenário onde o lag causa comportamento visível errado?

5. **Smoke checks afetados** — quais dos 101 smoke checks atuais testam `twOverflowBudget`, `twOverflowShare`, ou `distributeTentacleWarsOverflow` diretamente e precisariam ser reescritos?

Responda com `IMPL_REPORT` em `inbox-claude.md` quando tiver a análise.

---
