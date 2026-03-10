# Relatório — Modelo de Desenvolvimento e Continuidade

## Visão geral

O projeto está no caminho certo.

Ele já saiu de um estado experimental e entrou em um estado de engenharia com base real:

- arquitetura mais clara
- documentação viva
- guardrails automatizados
- backlog e revisões técnicas
- separação entre mecânica, UI, campanha e checks

Mas ainda existe espaço importante para profissionalizar o processo sem criar burocracia excessiva.

O ganho principal daqui para frente não vem só de mais código. Vem de melhorar:

- gerenciamento do trabalho
- continuidade entre sessões
- clareza de ownership
- previsibilidade do processo
- rastreabilidade das decisões

---

## Diagnóstico atual

### Pontos fortes já existentes

- Existe documentação operacional:
  - `AGENTS.md`
  - `README.md`
  - documentação de implementação por sistema
- Existe uma suíte de checks em múltiplas camadas:
  - `smoke`
  - `ui-sanity`
  - `ui-dom-sanity`
  - `campaign-sanity`
  - `soak`
- Já existe no projeto a noção de:
  - entry points canônicos
  - baseline de gameplay
  - backlog
  - priorização por criticidade
- O desenvolvimento já está sendo feito em waves pequenas, o que é correto.

### Pontos fracos atuais

- O processo ainda depende demais de memória de sessão.
- O backlog existe, mas ainda não opera plenamente como sistema contínuo de execução.
- Os checks estão bons, mas ainda têm uma manutenção relativamente artesanal.
- Ainda não existe uma trilha totalmente formal entre:
  - descoberta
  - task
  - implementação
  - validação
  - documentação
  - fechamento

Conclusão: o projeto está tecnicamente muito melhor, mas a gerência de desenvolvimento ainda pode amadurecer bastante.

---

## Direção geral recomendada

A melhor evolução agora não é adotar um processo pesado.

A melhor evolução é um modelo leve, disciplinado e modular, com:

- roadmap vivo
- backlog executável
- task specs curtas
- checks por superfície
- handoff claro para próximas sessões

Esse modelo já é suficiente para tornar o desenvolvimento muito mais profissional sem matar a velocidade.

---

## Modelo de gerenciamento recomendado

### 1. Roadmap de produto

Documento macro com horizonte mais longo.

Ele deve responder:

- onde o projeto está
- qual é a fase atual
- quais são as 3 a 5 prioridades reais
- o que não está em foco agora

Exemplo de macrofases:

- Fase 1: estabilização e robustez
- Fase 2: balance e campaign polish
- Fase 3: fidelidade Tentacle Wars
- Fase 4: ports desktop/mobile

Parte disso já existe, mas ainda vale consolidar melhor como painel principal.

### 2. Backlog executável

Lista de tasks pequenas, com estado real.

Cada task deveria ter:

- ID
- título
- objetivo
- criticidade
- owner/workstream
- dependências
- critérios de pronto
- check obrigatório
- docs a atualizar

Formato ideal:

- curto
- objetivo
- sem texto longo demais

### 3. Task spec curta

Toda task média ou arriscada deveria ter uma spec pequena antes da implementação.

Template mínimo:

- problema
- regra desejada
- arquivos prováveis
- risco
- checks que precisam passar
- impacto esperado

Isso reduz retrabalho e mudanças impulsivas.

### 4. Fechamento obrigatório

Ao concluir qualquer task relevante:

- rodar checks
- atualizar doc relevante
- atualizar backlog/status
- registrar possíveis follow-ups

Isso já acontece parcialmente. A recomendação é tornar isso um padrão explícito.

---

## Workstreams recomendados

### WS-01 Gameplay Core

Escopo:

- energia
- tentáculos
- slice
- clash
- captura
- ownership

### WS-02 AI e Fações

Escopo:

- target selection
- relay use
- roxa/vermelha
- comportamento tático
- dificuldade comportamental

### WS-03 Campaign e Level Design

Escopo:

- layouts fixos
- pacing
- tutoriais
- progressão
- bosses
- abertura estrutural

### WS-04 UI/UX e Render

Escopo:

- menus
- HUD
- feedback visual
- tutorial UI
- fontes
- telas de resultado/final

### WS-05 Performance e Robustez

Escopo:

- render perf
- soak
- persistência
- lifecycle
- instrumentação
- checks

### WS-06 Ports e Build Pipeline

Escopo:

- Linux
- Android
- packaging
- assets locais
- fontes
- release pipeline

Esses workstreams ajudam muito a decidir onde cada task entra.

---

## Ferramentas recomendadas

### 1. Kanban simples

Vale muito a pena usar um board visual leve.

Boas opções:

- GitHub Projects
- Linear
- Trello
- Notion database

Recomendação:

- GitHub Projects se quiser integração direta com o repositório
- Trello se quiser simplicidade máxima

Colunas sugeridas:

- Inbox
- Planned
- In Progress
- Needs Validation
- Done

### 2. Issue tracker real

Vale a pena transformar bugs e melhorias em issues curtas.

Categorias sugeridas:

- bug
- design
- tech-debt
- balance
- ui
- performance
- port

Isso evita perda de contexto entre sessões.

### 3. Check runner consolidado

Hoje `npm run check` já é um ótimo ponto de entrada.

No futuro, faz sentido separar também:

- `npm run check:gameplay`
- `npm run check:ui`
- `npm run check:campaign`
- `npm run check:full`

Isso ajuda bastante nos ciclos curtos.

### 4. Release notes leves

Não precisa ser algo pesado.

Mas vale ter:

- `docs/project/release-notes.md`

ou usar GitHub Releases, mais à frente.

Isso é especialmente útil porque o projeto já teve muitas mudanças relevantes de mecânica.

---

## Devemos criar agentes específicos?

Sim, faz sentido.

Mas em número pequeno e por domínio crítico.

Não vale criar agentes demais.

### Agentes que fazem sentido

#### 1. Gameplay Systems Agent

Responsável por:

- energia
- tentáculos
- clash
- refund
- slice
- captura

Checklist:

- conservação de energia
- entry points canônicos
- smoke gameplay
- comentários e docs de mecânica

#### 2. Campaign & Level Agent

Responsável por:

- fases
- pacing
- tutoriais
- bosses
- balance estrutural

Checklist:

- dificuldade
- opening pressure
- tutorial optionality
- campaign sanity
- layouts authored

#### 3. UI/UX Agent

Responsável por:

- menus
- HUD
- fonte
- i18n
- feedback visual
- ending screen

Checklist:

- i18n PT/EN
- resposta visual/sonora
- cobertura da fonte
- usabilidade mobile
- `ui-sanity` e `ui-dom-sanity`

#### 4. Performance & Build Agent

Responsável por:

- render perf
- soak
- profile HIGH/LOW
- packaging Linux/Android
- assets e fontes locais

Checklist:

- fps/debug
- instrumentação
- lifecycle
- assets embutidos
- viabilidade de build

### Como criar esses agentes

Usar `AGENTS.md` como hub principal e criar documentos complementares, por exemplo:

- `docs/agents/gameplay-systems-agent.md`
- `docs/agents/campaign-level-agent.md`
- `docs/agents/ui-ux-agent.md`
- `docs/agents/performance-build-agent.md`

Cada um deveria conter:

- escopo
- arquivos críticos
- checks obrigatórios
- docs a atualizar
- anti-patterns
- definition of done

---

## Como prosseguir quando quisermos continuar daqui

### Passo 1. Ler os arquivos certos

Ordem recomendada:

1. `AGENTS.md`
2. `README.md`
3. `docs/implementation/current-gameplay-baseline.md`
4. `docs/project/task-backlog.md`
5. `docs/project/stabilization-status.md`

### Passo 2. Rodar validação

```bash
npm run check
```

### Passo 3. Escolher a próxima wave

Sempre em formato:

- problema
- impacto
- escopo pequeno
- checks esperados

### Passo 4. Implementar

- mexer só no necessário
- atualizar docs relevantes
- atualizar checks se a regra mudou

### Passo 5. Fechar

- rodar checks
- atualizar backlog/status
- registrar follow-ups

---

## O que ainda falta para o desenvolvimento ficar mais profissional

### Curto prazo

- consolidar roadmap/backlog/status
- criar agentes por domínio
- formalizar template de task
- separar melhor tipos de check por comando

### Médio prazo

- board real
- issues por categoria
- release notes
- matriz de checks por sistema

### Longo prazo

- pipeline de build Linux/Android
- harnesses mais profundos de input/gameplay
- telemetria simples de playtest
- suporte melhor a release management

---

## O que eu faria agora, em ordem

1. Criar o conjunto de agentes por domínio
2. Consolidar um board operacional leve
3. Organizar um template único de task
4. Criar uma matriz de checks por sistema
5. Entrar em wave de playtest/balance com esse processo novo

---

## Conclusão

Sim, o projeto está no caminho certo.

O que falta agora não é mais uma reestruturação técnica grande.
O que falta é processo leve, consistente e repetível.

Recomendação final:

- não adotar ferramenta pesada demais
- não criar burocracia artificial
- organizar o que já existe em:
  - roadmap
  - backlog
  - task spec
  - agents por domínio
  - check matrix
  - fluxo padrão de retomada

Isso deixará a continuidade muito mais previsível e muito menos dependente de memória de sessão.
