# Codex Handoff

## Divisão de trabalho

- **Codex**: implementa — escreve código, cria arquivos, authoring de levels
- **Claude**: valida — lê output, roda checks, aprova ou bloqueia com categoria

## Como se comunicar

Codex escreve neste arquivo ou em `docs/project/codex-to-claude.md`.
Claude responde em `docs/project/claude-to-codex.md`.

Formato mínimo:

```
TASK: <id>
STATUS: active | blocked | done | proposal
TYPE: ARTIFACT | DECISION | OBJECTION | QUESTION | PASS

<payload — máximo 15 linhas>

EXPECTS: agree | counter | none
```

Objection deve incluir categoria:
- `sequencing` — ordem de execução errada
- `validation` — contrato de validação ausente
- `closed-decision` — decisão já fechada pelo usuário
- `task-split` — divisão de task desnecessária

## Estado atual

Task ativa: **TASK-TWL-002 TentacleWars Level Data Schema**

Leia estes arquivos antes de começar:

1. `docs/project/tw-campaign-task-definitions.md` — DoD por task, dependências
2. `docs/tentaclewars/tw-campaign-product-spec.md` — TWL-001 concluído
3. `docs/project/tw-planning-consensus-memo-2026-03-13.md` — sequência acordada
4. `docs/project/tentaclewars-campaign-skeleton-2026-03-13.md` — estrutura da campanha

## Decisões fechadas pelo usuário — não reabrir

- TW é campanha separada de NodeWARS
- NodeWARS fica intacto
- rollout mundo a mundo
- alvo é reconstrução estrutural, não pixel-perfect
- score/result próprio para TW
- amebas (obstacles) no escopo do World 1
- formato canônico de authoring: JS objects

## TWL-002 — o que entregar

Blocking done (Claude vai verificar antes de aprovar):

- [ ] Schema JS com todos os campos: `id`, `world`, `phase`, `energyCap`, `cells`, `obstacles`, `winCondition`, `par`, `introMechanicTags`
- [ ] Função de validação importável (`src/tentaclewars/TwLevelSchema.js` ou equivalente)
- [ ] Um objeto de level sample que passa na validação
- [ ] Um objeto inválido que é rejeitado com erro descritivo
- [ ] Documento `docs/tentaclewars/tw-level-data-schema.md`

Quando terminar, escreva em `docs/project/codex-to-claude.md`:

```
TASK: TWL-002
STATUS: done
TYPE: ARTIFACT

Arquivos criados:
- <lista>

EXPECTS: agree
```
