# NodeWARS — Brainstorm de Melhorias
**Data:** 2026-03-15
**Autores:** Claude (análise de documentação) + Codex (revisão técnica)
**Status:** Consolidado — pronto para decisão de próxima wave

---

## Contexto

Documento gerado após leitura completa de toda a documentação do projeto e revisão técnica pelo Codex. Cobre os domínios que têm oportunidade real de melhoria, com análise de risco, prontidão e skill mapping.

O projeto está em estado sólido: NodeWARS com 32 fases balanceadas, TentacleWars com 80 fases integradas em main, runtime estável, guardrails abrangentes. O que segue são as lacunas identificadas.

---

## Prioridade Final Consolidada (Claude + Codex)

| Rank | Área | Prontidão | Risco |
|------|------|-----------|-------|
| 1 | **TentacleWars AI upgrade** | Pronto agora | Médio |
| 2 | **Visual polish (4 gaps)** | Pronto agora | Baixo |
| 3 | **NodeWARS AI validação em playtest** | Aguarda sessões | Baixo |
| 4 | **Áudio TW identity** | Pronto agora | Baixo-médio |
| 5 | **Tutorial polish** | Pronto agora | Baixo |
| 6 | **Mobile HUD** | Pronto agora | Baixo |
| 7 | **TW Balance Cross-World** | Aguarda playtests | Baixo |
| 8 | **NodeWARS Balance Wave B** | Aguarda playtests | Médio |
| 9 | **TW energyCap fidelity** | Investigar primeiro | Alto |
| 10 | **Release readiness** | Futuro | Alto |

---

## Área 1 — TentacleWars AI (PRIORIDADE MÁXIMA)

### O que está acontecendo

O AI do NodeWARS recebeu upgrade significativo em 2026-03-10: tactical states, slice pressure real, faction identity (Red conservador, Purple agressivo), structural weakness scoring.

O TentacleWars AI (`TwAI.js`, `TwAIScoring.js`) **não recebeu nenhuma dessas melhorias**. Codex confirma: "TwAI is still essentially `eligibleSources × allTargets`, then top-score pick." A única riqueza presente é o purple slice pressure básico já implementado.

### Análise do Codex

**Não é um porte literal.** O TW tem economia diferente: packetized throughput, overflow-ready pressure, slot caps, níveis multi-facção autorados. Os heurísticos do NodeWARS não mapeiam 1:1.

**Abordagem correta:**
1. Criar TW-native tactical-state builder
2. Criar TW-native pressure context helpers
3. Manter purple slice pressure como fast path separado
4. Tunar identidade Red vs Purple dentro das regras TW, sem copiar constantes do NodeWARS

**Subset recomendado para v1:** `expand`, `pressure`, `finish`
**Deixar para depois:** `support`, `recover`

**Pré-requisito crítico identificado pelo Codex:** Antes de qualquer upgrade de AI, adicionar **TW AI observability** — saída de debug scoring leve. Atualmente o TW AI é mais fácil de mudar do que de interpretar. Sem observabilidade, tuning de AI é às cegas.

### Skills relevantes
`develop-web-game`, `jupyter-notebook`

### Risco
Médio — `TwAI.js` e `TwAIScoring.js` são TW-específicos, isolados dos high-risk files do NodeWARS.

---

## Área 2 — Visual Polish (4 gaps)

### O que está faltando

**2a — Owner icons no neutral contest panel**
O painel de captura neutra mostra apenas texto. Codex confirma: infraestrutura já existe (`UIRenderer.js` já conhece leader/contributors por owner id). Implementação direta.

**2b — Capture-ready pulse (90% threshold)**
Quando progresso de captura excede 90%, não há sinalização visual especial. Codex confirma: "neutral contest progress is already available and the renderer already does timed pulse effects elsewhere." Implementação direta.

**2c — Visual legend para estruturas especiais (World 3)**
Relays/Signals/Pulsars têm identidade mas World 3 introduz sem legenda contextual. Codex: "partially present through tutorial copy and mechanic chips, but not yet as a small onboarding legend in the specific sense." Requer design novo mas infraestrutura existe.

**2d — Linha de perigo de auto-retract**
Sem aviso visual no canvas quando nó está perto do threshold de auto-retract. Codex: "conceptually supported by existing critical combat warning language, but there is no dedicated world-space pre-retract line yet." Requer implementação nova.

### Skills relevantes
`imagegen` (direção visual), `screenshot` (comparar antes/depois), `develop-web-game`

### Risco
Baixo — canvas rendering e CSS, sem toque em gameplay math.

---

## Área 3 — NodeWARS AI — Validação em Playtest

### O que está pendente

O novo sistema de AI com tactical states foi implementado mas não validado em sessões reais. Riscos documentados:
- Purple criando bursts excessivos
- Red e Purple sentindo similares
- AI over-focando targets perdidos
- Estado `recover` conservador demais

### O que precisa acontecer

Sessões de playtest nas fases 15-32 (especialmente 18, 21, 30). Após observação, tuning fino em `gameConfig.js`.

### Skills relevantes
`develop-web-game` (tuning loop), `playwright` (captura de comportamento)

### Risco
Baixo para observação; médio para tuning.

---

## Área 4 — Áudio TentacleWars

### Estado atual (Codex confirma)

TW usa exclusivamente `'stella'` (`DEFAULT_SOUNDTRACK_TRACK_ID: 'stella'` em `TwBalance.js`). Sem diferenciação por World. O routing já é mode-owned em `TwModeRuntime.js`, então adicionar divergência é tecnicamente simples.

### O que melhoraria

- Trilha procedural dedicada para TW com identidade distinta (mais alien, orgânica)
- Progressão de intensidade por World (W1 calmo → W4 tenso)

### Skills relevantes
`imagegen` (mood board sonoro), audio reconstruction workflow (`docs/project/linux-audio-extraction-playbook.md`), `doc`

### Risco
Baixo-médio — `Music.js` não é high-risk mas é complexo.

---

## Área 5 — Tutorial Polish

### O que está pendente

Tutorial alinhado com regras (sweep completo). "Ghost guidance" (guias visuais de drag-release e cortes) identificado como candidato para polish mas não implementado. Tutorial TW específico pode precisar de feedback distinto dado que mecânica de tentácula TW difere do NodeWARS.

### Skills relevantes
`develop-web-game`, `playwright-interactive`, `playwright`

### Risco
Baixo — UI/UX, sem toque em gameplay systems.

---

## Área 6 — Mobile HUD

### O que está pendente

Cleanup planejado em estudos mas nunca executado. Em telas menores: sobreposição com canvas, botões pequenos para toque, densidade de informação excessiva.

### Skills relevantes
`figma` (conceito), `playwright` (validação em viewport mobile), `screenshot`

### Risco
Baixo — CSS e layout.

---

## Área 7 — TentacleWars Balance Cross-World

### O que está pendente

Fases flagradas: W3-15, W3-16, W4-16, W4-19, W4-20. Par values podem não refletir tempo real de execução. Requer playtests cronometrados.

### Codex nota

TW balance cross-world e NodeWARS Balance Wave B são ambos playtest-gated. Não rankear acima de trabalho acionável agora.

### Skills relevantes
`spreadsheet`, `jupyter-notebook`

### Risco
Baixo — apenas dados de nível em `TwWorld*.js`.

---

## Área 8 — NodeWARS Balance Wave B

### O que está pendente

Fases 18 (MAELSTROM), 21 (OBLIVION), 24 (RELAY RACE), 30 (SIGNAL LOCK), 32 (TRANSCENDENCE). Wave A foi conservadora; Wave B requer evidência de playtest.

### Skills relevantes
`spreadsheet`, `develop-web-game`, `doc`

### Risco
Médio — toca `FixedCampaignLayouts.js` (high-risk) e `gameConfig.js`.

---

## Área 9 — TentacleWars energyCap Fidelity

### Estado atual

energyCaps em 50-70% dos valores originais. Dívida estrutural documentada. Todo o campaign foi calibrado em torno desses valores menores.

### Análise do Codex

"Yes, notebook analysis is worthwhile. But I do not expect a near-original-cap move to be a local tuning pass. If the conclusion is 'raise caps substantially,' that becomes a campaign-wide redesign."

**Decisão: investigar apenas com jupyter-notebook antes de qualquer implementação.** Não tratar como tuning local.

### Skills relevantes
`jupyter-notebook`, `spreadsheet`

### Risco
Alto se implementado. Manter como investigação.

---

## Área 10 — Release Readiness

### O que falta

- Sentry — monitoramento de erros em produção
- Packaging Linux/Android — sem data
- Build pipeline — projeto é vanilla JS sem bundler

### Skills relevantes
`sentry`, `doc`, `playwright`

### Risco
Médio-alto — infraestrutura nova.

---

## Itens adicionais identificados pelo Codex (não estavam na lista original)

### TW Browser Validation Debt
O workflow Chromium está documentado e funciona, mas visual validation ainda é mais frágil do que deveria. Impacto em futuras waves de UI/polish.

### TW Result/Ending Shell Coupling
`ScreenController.js` ainda compartilha DOM do result entre NW e TW (intencional MVP). Manter visível como maintenance debt.

### CSS Hidden-Screen Contract Risk
O bug `#stwe` provou que há risco real de regressão em `styles/main.css`. Não justifica wave standalone, mas é classe de bug recorrente.

### TW AI Observability (PRÉ-REQUISITO para Área 1)
Antes de qualquer upgrade de TW AI, adicionar saída de debug scoring leve. "TW AI is easier to change than to interpret." Sem isso, tuning de AI é às cegas.

---

## Decisões para próxima wave

Baseado na análise consolidada Claude + Codex:

**Candidato principal:** TentacleWars AI upgrade — com pré-requisito de observability primeiro
**Candidato paralelo:** Visual polish — baixo risco, implementação-ready, pode avançar em paralelo
**Aguardar:** Balance waves (NW e TW) — ambas playtest-gated
**Investigar antes de decidir:** TW energyCap fidelity via jupyter-notebook
**Futuro:** Release readiness quando packaging se tornar ativo
