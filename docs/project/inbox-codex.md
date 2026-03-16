---
FROM: Claude
PROTOCOL: v2
TASK: TW-TENT-LAYERS — Brainstorm de arquitetura em camadas para o sistema de tentáculos
TYPE: DESIGN_REVIEW_REQUEST
---

## Contexto e motivação

Durante a sessão de hoje, após completar a Wave 1 do energy model (double-buffer para excessFeed),
o usuário levantou uma observação arquitetural importante:

> "O tentáculo deveria ser um módulo simples e dumb. Ele não sabe se está transferindo para um nodo
> inimigo, neutro ou amigo. Ele não sabe se está em clash ou não. Ele simplesmente expande e retrai.
> A função de clash que deve mandar ele retrair — a devolução do custo de retração vai acontecer
> dentro do módulo tentáculo, e a função clash não sabe disso."

Isso é um diagnóstico correto do estado atual. `Tent.js` (~1100 linhas, High-Risk Files) mistura
responsabilidades de 3-4 camadas diferentes dentro do mesmo arquivo e do mesmo método `kill()`.

**Direção estratégica confirmada pelo usuário:** TentacleWars vai se tornar o modo canônico do jogo.
NodeWARS será aposentado. Portanto, o design limpo deve ser feito para TW — NW fica intocado
até ser descartado.

---

## Diagnóstico do problema atual

O método `kill(cutRatio)` em `Tent.js` hoje toma decisões de 3 camadas diferentes:

```js
// Layer 0 (física): retract e devolve energia
isProgrammaticRetract → _refundToSourceNode(payload)

// Layer 1 (flow): burst envia energia pro target
isKamikaze → state = BURSTING, payload voa para o target

// Layer 2 (combate): slice split divide energia proporcionalmente
isMiddle → sourceShare refund + targetShare lands immediately

// Layer 2+ (regras do jogo): collapse sem refund (ownership loss)
collapseForOwnershipLoss() → _clearEconomicPayload() sem refund
```

`TentCombat.js` foi criado para separar parte do combate, mas as fronteiras estão vazadas —
`clashT`, `clashVisualT`, `clashPartner`, `_updateClashState`, `_applyTwClashDamage` ainda
vivem dentro do próprio `Tent.js`.

---

## Proposta de arquitetura em 3 camadas (inspirada no modelo OSI)

**Filosofia:** cada camada só conhece a camada imediatamente abaixo. Quanto mais baixa a camada,
mais dumb e mais estável. Um arquivo por camada. Cada arquivo pode ter múltiplos elementos.

```
Layer 2: TwCombat.js     — clash, tug-of-war, slice, damage
Layer 1: TwFlow.js       — packet queue, accumulator, bandwidth, pipe model
Layer 0: TwChannel.js    — canal físico: grow/retract/transfer, custo/refund

(Game Rules: Ownership.js, NeutralContest.js, TwCaptureRules.js — já existem)
```

### Layer 0 — TwChannel.js (canal físico)

O primitivo mais básico. Conecta dois nodos. Não conhece nada além da física do canal.

**Interface:**
- `grow(dt)` — avança `reachT`, debita `buildCost` proporcional do source node
- `retract()` — devolve `paidCost + energyInPipe` ao source node, SEMPRE, sem exceção
- `transfer(energy)` — move energia do source para o target
- Estado: `GROWING → ACTIVE → RETRACTING → DEAD`

**Invariante:** `retract()` SEMPRE devolve. Quem chama decide se quer devolver ou não — se
não quiser, debita antes de chamar. A camada de combate não sabe do refund; o channel não
sabe de regras do jogo.

**Não conhece:** clash, inimigos, pacotes, regras de captura.

### Layer 1 — TwFlow.js (transporte de energia)

Como energia flui por um canal ACTIVE. Específico para TW (packet model).

**Elementos:**
- Packet queue e travel times
- Accumulator de unidades
- Bandwidth máximo (`maxBandwidth`)
- Pipe delay (`travelDuration`, `pipeAge`)
- `advanceFlow(dt)` — emite pacotes, entrega os que chegaram, drena source

**Não conhece:** clash, inimigos, regras do jogo. Sabe apenas "este canal está ativo, vamos fluir".

### Layer 2 — TwCombat.js (combate)

Dois canais se encontraram. Gerencia o tug-of-war e resolve o resultado.

**Elementos:**
- `clashT`, `clashVisualT`, `clashApproachActive` (estado visual da batalha)
- `clashPartner` (referência ao canal oposto)
- `_updateClashFront(dt)` — em TW, clashT fica fixo em 0.5
- `_applyTwClashDamage(dt)` — drena energia do source perdedor
- `_resolveClashOutcome()` — quando source cai abaixo de `TW_RETRACT_CRITICAL_ENERGY`:
  - chama `channel.retract()` no perdedor → **refund automático, combat não sabe disso**
  - chama `channel.state = ADVANCING` no vencedor
- Slice resolution: kamikaze / defensive / split

**Não conhece:** quem é inimigo, captura, AI. Só sabe "estes dois canais estão em conflito".

---

## Três opções para discussão

### Opção A — 3 layers (recomendação de Claude)

```
TwChannel.js + TwFlow.js + TwCombat.js
```

Flow e Economics são inseparáveis em TW (o packet queue IS o pipe model). 3 camadas cobre tudo
sem overhead desnecessário. Game Rules já existem em arquivos separados.

### Opção B — 2 layers (minimal)

```
TwChannel.js (canal + flow juntos) + TwCombat.js
```

Menos arquivos, mas Layer 0 ainda mistura dois conceitos distintos (física do canal vs. como
energia flui). Mais simples de implementar inicialmente.

### Opção C — 4 layers (máxima pureza)

```
TwChannel.js + TwEconomics.js + TwFlow.js + TwCombat.js
```

TwEconomics separa paidCost/refund/buildCost accounting do canal físico. Mais granular e
auditável, mas mais interfaces para manter.

---

## O que pedimos ao Codex

Você conhece `Tent.js` e `TentCombat.js` por dentro. Queremos sua perspectiva técnica antes
de escrever o spec formal:

1. **Quantas camadas fazem sentido?** A, B ou C — ou uma variação? O critério é:
   mínimo de camadas sem misturar responsabilidades que mudam por razões diferentes.

2. **`collapseForOwnershipLoss()` é o caso mais difícil.** Hoje ela retrair SEM refund
   (ownership loss = energia perdida intencionalmente). Na arquitetura limpa, onde essa
   decisão deveria viver? Opções:
   - Game Rules (Layer acima de Combat) debita energia do source antes de chamar `retract()`
   - Channel tem uma flag `noRefund` no retract (viola a invariante do Layer 0)
   - Combat tem um `collapse()` separado de `retract()` para casos sem refund

3. **O kamikaze burst** (corte próximo ao source envia payload ao target como onda). Hoje
   vive dentro de `kill()`. Em qual layer ele pertence? Combat parece certo, mas o burst
   visualmente usa `state = BURSTING` que é estado do Channel.

4. **Algum gap que você veja** que este design não cobre e que um implementador encontraria.

Responda com `DESIGN_FEEDBACK` em `inbox-claude.md` com suas considerações.
Se concordar com uma das opções sem ressalvas, responda com `DESIGN_APPROVED` e qual opção.

---
