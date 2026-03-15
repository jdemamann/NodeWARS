# TentacleWars — Plano de Fidelidade Visual (Revisado com Análise de Screenshots)
## Para Auditoria por Gemini (vídeo vs. original)

**Data:** 2026-03-14 (revisado após análise das 14 imagens de referência)
**Status:** Planejamento consolidado — pronto para implementação VIS-A
**Branch:** feature/tentaclewars-mode
**Referências visuais:** `tmp/tent/1 (1..14).jpeg`

---

## Sumário Executivo

A análise das 14 screenshots do jogo original revelou uma diferença **arquitetural** entre
o que temos e o que o original usa. O plano inicial (apenas tornar os pacotes data-driven)
está correto em intenção, mas incompleto em escopo.

A diferença principal não é tamanho ou posição dos pacotes — é que o **sistema de cores é
fundamentalmente diferente**. No original:
- **Cor do proprietário** (verde/vermelho/azul) = estrutura do tentáculo
- **Amarelo/dourado** = energia em trânsito (os pacotes reais)

Em nosso sistema atual, os "packet markers" são desenhados na COR DO PROPRIETÁRIO, iguais
ao corpo do lane. Isso elimina a distinção visual que torna o jogo legível.

---

## Análise Detalhada do Original (por screenshot)

### Estrutura do Tentáculo

**O tentáculo NÃO é um tubo.** É uma **cadeia de nodos-estrela** (chain of star nodes):
- Cada nodo: ponto central pequeno + dois braços perpendiculares à direção de viagem
- Braço comprimento: ~3-4px para cada lado
- Espaçamento entre nodos: ~7-10px ao longo do caminho
- A cadeia INTEIRA é a estrutura do tentáculo — não existe stroke/tubo separado
- Cor da cadeia: cor do proprietário (verde player, vermelho inimigo, azul terceiro faction)

**Os pacotes de energia:**
- Cor: **amarelo/dourado** — independentemente do proprietário
- Tamanho: visualmente maior que os nodos (radius ~5-7px no contexto original)
- Forma: blob oval orientado na direção de viagem (semelhante ao nosso ellipse atual)
- Frequência: ~1-3 visíveis por lane num dado momento
- Distribuição: irregular, refletindo o estado real da simulação
- DIFERENÇA CRÍTICA: são **distintos da cor do tentáculo** — leitura imediata de "o que
  está se movendo" vs "qual é a estrutura"

### Células

**Forma:** circular ✅ (temos correto)

**Borda exterior:** anel colorido com **pequenas protuberâncias/spikes** distribuídas
uniformemente ao redor — como radiações de uma estrela. Os spikes são pequenos (3-4px),
e regulares (~12-16 por célula dependendo do grade).
- Nossos "follicles" animados são o análogo correto, mas precisam estar mais firmes/menos
  orgânicos. O original tem spikes rígidos, não cílios ondulando.

**Interior da célula:**
- Preenchimento: cor do proprietário, relativamente opaco
- **Anel de energia**: arco branco estilo RELÓGIO — começa às 12h, vai em sentido horário
  até a fração energy/maxE. Muito visível, alpha ~0.7-0.8. É a leitura mais importante
  depois do número.
- **Número**: energia atual em texto branco centralizado
- **Pontos de grade** (grade indicators): dois pontos brancos no TOPO do interior (como
  dois olhos ou um dominó) — estes parecem ser fixos por grade, não animados.
  Grade 1 = 1 ponto. Grade 2 = 2 pontos. Etc.

**Células neutras:**
- Anel cinza/branco com os mesmos spikes
- Interior sem preenchimento (transparente/preto)
- Sem pontos de grade visíveis (ou 1 ponto muito sutil)
- Anel de energia muito sutil (a célula não tem proprietário)

**Estado sob ataque:**
- Zona 6 (imagem 5): célula vermelha sob ataque de 8 tentáculos verdes
- Efeito visual: **pequenas partículas/pontos** se desprendendo ao redor do anel exterior
- Não é apenas mudança de cor — é um efeito de partícula/fragmentação

**Anel de seleção/hover:**
- Zona 7 (imagem 7): célula verde com anel cinza/dourado externo de seleção
- Anel mais largo que a borda da célula, com rotação suave

### A Tática do Triângulo (Retroalimentação)

Documentado claramente nas imagens 9, 10, 11, 12 (Zone 11, timer 43, 50, 80, 37):

- Triângulo de 3 células conectadas mutuamente: A→B→C→A ou variante com loop
- Energia circulando frenéticamente: múltiplos pacotes amarelos visíveis em cada lane
- A legibilidade depende DIRETAMENTE de ver os pacotes amarelos se movendo —
  sem a distinção de cor, o loop parece estático
- Com cap=60 (Zone 11) e 3 células a 60 energia cada, há energia suficiente para loops
  sustentados — mas só funciona visualmente com pacotes de cor distinta

Zona 16 (imagens 13, 14): triângulo com cap=30 — exemplo do constraint mechanic.
Células a 24/24/25 com cap=30 — tentáculos curtos e densos. O triângulo fecha num
espaço bem menor, muito mais tático.

---

## Diferenças Encontradas vs. Nossa Implementação

| Elemento | Original | Nossa Implementação | Prioridade |
|----------|----------|---------------------|-----------|
| Corpo do tentáculo | Cadeia de nodos-estrela | Stroke espesso + ribs + pulse | 🔴 CRÍTICO |
| Cor dos pacotes | **Amarelo/dourado** | Cor do proprietário (igual ao lane) | 🔴 CRÍTICO |
| Posição dos pacotes | Data-driven (packetTravelQueue) | Time-based, desacoplado | 🔴 CRÍTICO |
| Número de pacotes visíveis | 1-3 reais | 4 cosméticos fixos | 🔴 CRÍTICO |
| Anel de energia da célula | Arco relógio prominente | Anel completo, alpha ~0.22 | 🟠 ALTO |
| Spikes da célula | Rígidos, regulares | Follicles ondulantes (orgânicos) | 🟡 MÉDIO |
| Pontos de grade | 2 pontos fixos no topo | Orbitais rotativos | 🟡 MÉDIO |
| Células circulares | ✅ | ✅ | OK |
| Cores por proprietário | ✅ | ✅ | OK |
| Número de energia | ✅ | ✅ | OK |

---

## Plano de Implementação Revisado

### VIS-A — Mudanças que Tornam o Vídeo Auditável pelo Gemini

#### VIS-A1 — Cadeia de Nodos-Estrela (substitui o tubo)

**Novo visual do tentáculo:**

```js
function drawTentacleWarsChain(ctx, { esx, esy, etx, ety, controlPoint, color,
                                      laneStart, laneEnd, highGraphics }) {
  // Amostrar pontos ao longo da bezier a cada ~9px
  const laneLength = estimateBezierLength(esx, esy, controlPoint.x, controlPoint.y, etx, ety);
  const nodeCount = Math.max(4, Math.floor(laneLength / 9));

  for (let i = 0; i <= nodeCount; i++) {
    const t = laneStart + (laneEnd - laneStart) * (i / nodeCount);
    const pos = computeBezierPoint(t, esx, esy, controlPoint.x, controlPoint.y, etx, ety);
    const ahead = computeBezierPoint(
      Math.min(1, t + 0.01), esx, esy, controlPoint.x, controlPoint.y, etx, ety
    );
    const angle = Math.atan2(ahead.y - pos.y, ahead.x - pos.x);
    const perpAngle = angle + Math.PI / 2;

    // Ponto central
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1.3, 0, Math.PI * 2);
    ctx.fillStyle = colorWithAlpha(color, 0.82);
    ctx.fill();

    // Dois braços perpendiculares (o "spine")
    const armLen = highGraphics ? 3.8 : 3.0;
    ctx.beginPath();
    ctx.moveTo(pos.x + Math.cos(perpAngle) * armLen, pos.y + Math.sin(perpAngle) * armLen);
    ctx.lineTo(pos.x - Math.cos(perpAngle) * armLen, pos.y - Math.sin(perpAngle) * armLen);
    ctx.strokeStyle = colorWithAlpha(color, 0.55);
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }

  // Linha de spine central (muito fina, conecta os nodos)
  ctx.beginPath();
  drawBezierSegment(ctx, esx, esy, controlPoint.x, controlPoint.y, etx, ety, laneStart, laneEnd);
  ctx.strokeStyle = colorWithAlpha(color, 0.22);
  ctx.lineWidth = 0.7;
  ctx.stroke();
}
```

**Peristaltic ribs, membrane pulse, e lane contour ficam DESATIVADOS** para lanes TW —
substituídos pela cadeia acima. O glow sutil pode permanecer como camada de fundo.

---

#### VIS-A2 — Pacotes Amarelos Data-Driven

**Pacotes da cor CORRETA (amarelo) nas posições CORRETAS:**

```js
function drawTentacleWarsEnergyPackets(ctx, {
  esx, esy, etx, ety, controlPoint,
  laneStart, laneEnd,
  packetTravelQueue,    // de tent.packetTravelQueue
  travelDuration,      // de tent.travelDuration
  highGraphics,
}) {
  if (!packetTravelQueue || packetTravelQueue.length === 0) return;

  // Amarelo/dourado — cor de energia, não do proprietário
  const PACKET_COLOR = '#f5c800';
  const maxVisible = highGraphics ? 8 : 6;

  // Selecionar subset representativo se queue muito longa
  const queue = packetTravelQueue.length <= maxVisible
    ? packetTravelQueue
    : selectRepresentativeSubset(packetTravelQueue, maxVisible);

  for (const remainingTime of queue) {
    const progress = 1.0 - Math.max(0, Math.min(1, remainingTime / travelDuration));
    const laneT = laneStart + (laneEnd - laneStart) * progress;

    const pos = computeBezierPoint(laneT, esx, esy, controlPoint.x, controlPoint.y, etx, ety);
    const ahead = computeBezierPoint(
      Math.min(1, laneT + 0.012), esx, esy, controlPoint.x, controlPoint.y, etx, ety
    );
    const angle = Math.atan2(ahead.y - pos.y, ahead.x - pos.x);

    // Pulse sutil baseado em posição
    const pulseFactor = 1.0 + 0.10 * Math.sin(progress * Math.PI);
    const baseRadius = highGraphics ? 4.8 : 3.8;
    const r = baseRadius * pulseFactor;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);

    // Aura dourada
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, 0, r * 2.1, r * 1.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = colorWithAlpha(PACKET_COLOR, 0.22);
    ctx.fill();

    // Núcleo brilhante
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.2, r * 0.88, 0, 0, Math.PI * 2);
    ctx.fillStyle = colorWithAlpha(PACKET_COLOR, 0.95);
    sg(ctx, PACKET_COLOR, highGraphics ? 10 : 6);
    ctx.fill();

    // Realce branco
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.15, Math.max(0.7, r * 0.3), 0, Math.PI * 2);
    ctx.fillStyle = colorWithAlpha('#ffffff', 0.45);
    ctx.fill();

    ctx.restore();
  }
}

// Seleciona subset representativo preservando truthfulness
function selectRepresentativeSubset(queue, maxCount) {
  // Sempre incluir o mais novo (mais perto da fonte) e o mais velho (mais perto do alvo)
  const sorted = [...queue].sort((a, b) => b - a);  // ordenar por remainingTime desc
  const step = Math.floor(sorted.length / maxCount);
  const result = [];
  for (let i = 0; i < sorted.length && result.length < maxCount; i += Math.max(1, step)) {
    result.push(sorted[i]);
  }
  return result;
}
```

---

#### VIS-A3 — Anel de Energia como Arco Relógio

**Substituir o anel completo sutil por arco proporcional prominente:**

```js
// Em NodeRenderer.js, dentro do bloco isTentacleWarsNode:
if (isTentacleWarsNode) {
  const energyFraction = n.maxE > 0 ? Math.min(1, n.energy / n.maxE) : 0;

  // Trilho (capacidade máxima) — arco completo escuro
  ctx.beginPath();
  ctx.arc(n.x, n.y, r * 0.84, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);
  ctx.strokeStyle = colorWithAlpha('#ffffff', 0.10);
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Arco de energia atual
  if (energyFraction > 0.01) {
    const arcEnd = -Math.PI / 2 + energyFraction * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(n.x, n.y, r * 0.84, -Math.PI / 2, arcEnd);
    ctx.strokeStyle = colorWithAlpha('#ffffff', 0.55 + energyFraction * 0.30);
    ctx.lineWidth = 2.5;
    sg(ctx, '#ffffff', 3);
    ctx.stroke();
  }
}
```

---

### VIS-B — Polish (Após VIS-A Validado pelo Gemini)

#### VIS-B1 — Spikes Rígidos (substituir follicles orgânicos)

Os follicles animados criam um efeito orgânico que não existe no original. O original tem
spikes rígidos e regulares ao redor da borda da célula.

Proposta: manter a animação sutil de escala (pulso de respiração), mas remover o `sin()`
lateral dos follicles — eles devem apontar radialmente para fora, sem ondular.

#### VIS-B2 — Pontos de Grade Fixos (substituir orbitais rotativos)

O original mostra os indicadores de grade como 2 pontos brancos estáticos no topo
do interior da célula (não orbitais rotativos). Para grade 0: 1 ponto. Grade 1: 2 pontos.

#### VIS-B3 — Flash de Emissão + Absorção

Como discutido no plano original e confirmado pelo Codex:
- Campo `twEmitFlash` em Tent ou GameNode, acionado pelo runtime
- Campo `twAbsorbFlash` em GameNode, acionado ao deliver
- Visual: anel expansivo breve

---

## Arquivos Afetados por VIS-A

| Arquivo | Mudança |
|---------|---------|
| `src/rendering/TentRenderer.js` | Substituir corpo do tentáculo TW por drawTentacleWarsChain() + drawTentacleWarsEnergyPackets() com cor amarela |
| `src/rendering/NodeRenderer.js` | Substituir anel interno por arco relógio |
| Caller no render loop | Passar `t.packetTravelQueue` e `t.travelDuration` ao pacote de parâmetros TW |

---

## Alinhamento com Codex

A resposta do Codex (inbox-claude.md, 2026-03-14) confirmou:
- ✅ Opção A para exposição dos dados (direto da entidade)
- ✅ Flashes em campos de entidade (não heurísticas no renderer)
- ✅ Ordem: 1 → 3 → 2 (truthfulness antes de polish)
- ✅ Identificou os riscos: overlap policy, draw order, edge cases de travel duration

**Nova informação das screenshots não estava no plano anterior:**
- Cor dos pacotes = **amarelo**, não cor do proprietário — altera Item 2 inteiramente
- Corpo do tentáculo = cadeia de nodos (não tubo) — novo Item 0 que precede tudo

---

## Critérios de Sucesso para o Gemini

Após VIS-A implementado, ao enviar vídeo para comparação:

| O Gemini deve conseguir ver | Nosso impl após VIS-A |
|-----------------------------|-----------------------|
| Pacotes amarelos se movendo | ✅ cor correta, data-driven |
| Mais pacotes em grades altas | ✅ (emissão proporcional ao grade) |
| Células com anel de energia legível | ✅ arco relógio |
| Estrutura do tentáculo como cadeia | ✅ nodos-estrela |
| Triângulo de retroalimentação frenético | ✅ (mecânica já correta; visual agora legível) |

---

## O Que NÃO Muda

- Modo NodeWARS: zero impacto (todos os changes são gated em isTentacleWarsLane/Node)
- Simulação: zero impacto (apenas rendering)
- Dados de entidade: apenas leitura de campos já existentes (packetTravelQueue, travelDuration)
- GameNode: sem novos campos em VIS-A (apenas em VIS-B)

---

*Relatório atualizado em 2026-03-14 após análise das 14 imagens de referência do original.*
*Codex consultado e alinhado via inbox-claude.md / inbox-codex.md.*
