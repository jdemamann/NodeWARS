# Folha de Respostas da Adaptação Tentacle Wars

## Objetivo

Use este documento para responder às perguntas em aberto de:

- `docs/project/tentacle-wars-open-questions-2026-03-11.md`

Esta folha fica separada para que o conjunto original de perguntas continue como referência limpa.

## Como Preencher

Para cada pergunta:

- escreva sua resposta em `Resposta`
- adicione nuances, exemplos ou incertezas em `Observações`
- defina um nível de confiança:
  - `alta`
  - `média`
  - `baixa`

Se ainda não tiver resposta, pode deixar em branco.

---

## 1. Modelo Central de Energia e Overflow

### 1.1 Regra de distribuição do overflow

#### P1

Pergunta:

Quando uma célula cheia recebe energia de um aliado, essa energia transborda para todos os tentáculos ativos de saída ou apenas para alguns?

Resposta: Transborda para todos os tentáculos ativos de saída da célula, e com mesmo valor da soma de energia recebido pelos tentáculos de entrada. 

Observações: Pelo que entendi, essa é uma tecnica de criação de energia por tentáculo, como você pode ver. Aparentemente  Confiança média, por observação de gameplay.

Confiança: média

#### P2

Pergunta:

Se existirem vários tentáculos de saída, algum deles tem prioridade?

Resposta: Não, todos os tentaculos possuem mesma prioridade.

Observações: 

Confiança: alta

#### P3

Pergunta:

O overflow se comporta de forma diferente dependendo se o alvo é aliado, neutro ou hostil?

Resposta: Não, o overflow é igual para todos os alvos.

Observações:

Confiança: alta

#### P4

Pergunta:

O overflow exige que a célula esteja totalmente no cap, ou começa um pouco antes do limite?

Resposta: A célula deve estar com capacidade máxima para transbordar.

Observações: 

Confiança: alta

### 1.2 Modelo de saída da célula antes do overflow

#### P5

Pergunta:

Uma célula que ainda não está cheia continua empurrando energia normal para tentáculos aliados conectados?

Resposta: Sim, todos os tentáculos que saem de uma célula transmitem o mesmo valor de energia, ao mesmo tempo. 

Observações: Esta energia deve ir progredindo junto com o nível da célula.

Confiança: alta

#### P6

Pergunta:

Ou a grande pressão nos tentáculos só aparece quando a célula está saturada?

Resposta: Sim, quando a célula está saturada, ela transfere a energia recebida pelos tentáculos dos aliados para os tentáculos que ela está alimentando. Caso ela não possua tentáculos gerados por ela, para repassar a energia, só assim esta energia de overflow é perdida.

Observações: 

Confiança: alta

#### P7

Pergunta:

Se existe saída regular antes do overflow, quão forte ela é em comparação com a pressão de overflow?

Resposta: Existe, e segue o seguinte padrão. Nivel 1 = 1 energia/s, Nivel 2 = 1.5 energia/s, Nivel 3 = 2 energia/s, Nivel 4 = 2.5 energia/s e Nivel 5 = 3 energia/s. Isso deve ser totalmente parametrizado, para futuro ajuste fino na mecanica do jogo. 

Observações: Existe, essa energia não é descontada da energia base de regen da célula, ela é uma função do nível da célula.

Confiança: média

### 1.3 Comportamento em pacotes versus fluxo contínuo

#### P8

Pergunta:

O modo Tentacle Wars deve simular transferência real em pacotes discretos?

Resposta: Sim, exatamente isso.

Observações: os pacotes fluem pelo tentáculo, como você pode ver, com uma animação em amarelo, fluindo da fonte para o destino.

Confiança: alta

#### P9

Pergunta:

Ou devemos preservar uma simulação contínua e apenas emular a sensação de pacotes na lógica/renderização?

Resposta: Deve ser transferência real de pacotes.

Observações:

Confiança: alta

#### P10

Pergunta:

Se for em pacotes, o tamanho do pacote deve ser sempre `1`, exceto no `Dominator`?

Resposta: Esses pacotes seriam a energia que flui pelos tentáculos? Se for essa a tua dúvida, essa pergunta foi respondida na sessão anterior (P7), mas vou reforçar. Essa energia não é descontada da energia base de regen da célula, ela é uma função do nível da célula. Nivel 1 = 1 energia/s, Nivel 2 = 1.5 energia/s, Nivel 3 = 2 energia/s, Nivel 4 = 2.5 energia/s e Nivel 5 = 3 energia/s. Isso deve ser totalmente parametrizado, para futuro ajuste fino na mecanica do jogo. Esta informação é mais sentimento do gameplay do que documental, então a confiança é média. Se a tua dúvida não for esta, refaça a pergunta que procuro mais informações.

Observações: Esta energia não tem correlação com a energia de regen.

Confiança: alta

### 1.4 Comportamento de overflow do Dominator

#### P11

Pergunta:

Como a saída do `Dominator` deve ser modelada em um modo futuro?

Resposta: Ele deve descer de nível quando atingir 180 de energia. 

Observações:

Confiança: alta

#### P12

Pergunta:

Isso deve ser modelado como “dois pacotes ao mesmo tempo”, “tamanho de pacote dobrado” ou apenas “throughput dobrado”?

Resposta: Throughput dobrado.

Observações:

Confiança: alta

---

## 2. Custo, Crescimento e Refund de Tentáculos

### 2.1 Regra exata de custo do tentáculo

#### P13

Pergunta:

No jogo original, o custo do tentáculo é pago totalmente no início ou durante o crescimento?

Resposta: Durante o crescimento.

Observações:

Confiança: alta

#### P14

Pergunta:

Se for progressivo, o custo cresce linearmente com a distância?

Resposta: Linearmente

Observações:

Confiança: alta

#### P15

Pergunta:

Existe um custo fixo base mais custo por distância, ou só custo por distância?

Resposta: Somente custo por distancia. Deve ser assim no modo NodeWARS também. Se existir custo base no NodeWARS, corrija.

Observações:

Confiança: alta

#### P16

Pergunta:

Alvos neutros e hostis devem ser tratados de forma diferente no compromisso de construção?

Resposta: Tratamento igual no custo de construção para qualquer nodo de destino.

Observações:

Confiança: alta

### 2.2 Refund em retract / cancelamento

#### P17

Pergunta:

Se um tentáculo em crescimento for cancelado antes de chegar ao alvo, a célula de origem recebe tudo de volta?

Resposta: Sim.

Observações:

Confiança: alta

#### P18

Pergunta:

Um retract manual se comporta igual a um crescimento interrompido?

Resposta: Sim

Observações:

Confiança: alta

#### P19

Pergunta:

Existe alguma situação em que retract destrói energia investida em vez de devolvê-la?

Resposta: Nenhum caso.

Observações:

Confiança: alta

### 2.3 Energia armazenada no tentáculo e valor do corte

#### P20

Pergunta:

O que determina a quantidade liberada por um corte?

Resposta: A energia liberada para é a energia de construção + energia em trânsito. E a quantidade de energia que retorna para a célula geradora e a que vai para a célula destino depende da "altura" do corte, sendo dividida de acordo com essa distância.

Observações: Cortou exatamente na base da célula geradora, a energia do tentáculo vai 100% para a célula atacada. Cortou exatamente na ponta do tentáculo, ou seja, rente a célula atacada, a energia do tentáculo volta 100% para a célula geradora.

Confiança: alta

#### P21

Pergunta:

É apenas a energia atualmente em trânsito?

Resposta: Não. Energia de construção + energia em trânsito.

Observações:

Confiança: alta

#### P22

Pergunta:

Ou os tentáculos armazenam uma reserva mais profunda de “pressão”?

Resposta: Não. Nodo funciona como uma ponte, transportando energia de um lado para outro, de acordo com a célula geradora.

Observações: Energia será sempre energia de construção + energia em trânsito (que depende, como dito, do nível atual do nodo gerador).

Confiança: alta

---

## 3. Progressão de Nível e Significado dos Thresholds

### 3.1 Estratégia de nomes dos níveis

#### P23

Pergunta:

O modo deve preservar os nomes originais dos níveis para fidelidade?

Resposta: Não

Observações: 

Confiança: alta

#### P24

Pergunta:

Ou os nomes devem continuar no estilo NodeWARS enquanto apenas a mecânica fica mais fiel?

Resposta: Sim

Observações:

Confiança: alta

### 3.2 Número máximo de níveis no modo

#### P25

Pergunta:

Queremos os thresholds exatos dos níveis originais?

Resposta: Sim

Observações:

Confiança: alta

#### P26

Pergunta:

Ou apenas a sensação/pacing deles traduzida para a progressão atual?

Resposta: Vamos usar os thresholds originais.

Observações:

Confiança: alta

### 3.3 Interação entre cap de fase e níveis

#### P27

Pergunta:

No jogo original, algumas fases são explicitamente desenhadas para bloquear níveis mais altos?

Resposta: Sim.

Observações: Tanto níveis bloqueador, como também quantidade de energia máxima aumenta conforme o jogo vai evoluindo, para o usuário ir aprendendo a usar a mecânica básica.

Confiança: alta

#### P28

Pergunta:

O modo Tentacle Wars deve reproduzir esses gargalos de cap fase a fase?

Resposta: Sim

Observações:

Confiança: alta

---

## 4. Captura de Neutros e Ownership

### 4.1 Regra de threshold para capturar neutros

#### P29

Pergunta:

Como a conversão de neutros deve ser modelada no modo Tentacle Wars?

Resposta: Nodo neutro deve ter um nível de energia e um custo de aquisição separado. Por exemplo, nodo com nível de energia 10 tem um custo de aquisição de 4. Quando alguma célula transmite 4 de energia para uma célula neutra, ela é dominada e transformada em célula ativa com energia 10. Podemos estabelecer uma regra de custo de aquisição sendo 40% do nível de energia da célula neutra, acredito ser uma boa métrica.

Observações: Deixe parametrizável

Confiança: alta

#### P30

Pergunta:

É melhor representar isso como acúmulo de pacotes até um threshold?

Resposta: Acredito ter respondido na pergunta anterior. Se ficou alguma dúvida ainda, faça novamente.

Observações: Caso não tenha respondido, faça novamente a pergunta.

Confiança: média

#### P31

Pergunta:

Células neutras devem ter requisitos de captura visíveis ou invisíveis?

Resposta: Visíveis numa caixa de informações quando passar o mouse por cima, igual ao que temos implementado hoje no NodeWARS

Observações: 

Confiança: alta

### 4.2 Energia inicial após a captura

#### P32

Pergunta:

Quando uma célula neutra vira aliada, com quanta energia ela deve começar?

Resposta: Acredito ter respondido na P29, mas vamos reforçar. Células neutras tem um nível de energia mínimo de 10, com custo de aquisição de 4 (ou seja, 40% do nível de energia). O nível de energia e o level de uma célula neutra pode variar em cada fase, mas vamos manter a proporção de aquisição em relação ao nível de energia em 40%, para início. 

Observações: Deixe parametrizável 

Confiança: alta

#### P33

Pergunta:

Isso deve ser diferente de uma captura hostil?

Resposta: O que seria captura hostil? Quando eu fizer um corte de tentáculo ao atacar? Se for isso, a energia do tentáculo, descontando o custo de aquisição, deve ser adicionado ao nível de energia da célula capturada. Se não for essa a tua dúvida, pergunte novamente.

Observações: Lembre-se, a energia do tentáculo não deve ser desperdiçada ou se perder, sempre vai pra algum lugar. única situação que ela se perde é quando célula está com nível de energia máximo, sendo abastecida por células aliadas e não tem um tentáculo de saída para despejar o fluxo de energia excedente.

Confiança: alta

### 4.3 Captura neutra com múltiplas fontes

#### P34

Pergunta:

Feeds aliados simultâneos devem somar diretamente para capturar neutros?

Resposta: Sim

Observações:

Confiança: alta

#### P35

Pergunta:

Existe algum retorno decrescente quando muitas células alimentam o mesmo neutro?

Resposta: Nao

Observações:

Confiança: alta

---

## 5. IA Inimiga e Facção Roxa

### 5.1 Uso de slice por inimigos

#### P36

Pergunta:

Quais cores inimigas usam corte de tentáculos no jogo original?

Resposta: Roxa

Observações:

Confiança: alta

#### P37

Pergunta:

A roxa corta principalmente:

- para burst de dano
- para negar lanes
- para redirecionar rapidamente
- ou para as três coisas?

Resposta: as três coisas

Observações:

Confiança: alta

#### P38

Pergunta:

Com que frequência o inimigo deve poder cortar sem parecer injusto?

Resposta: Acredito que essa técnica pode ir evoluindo conforme as fases passam. 

Observações: Podemos deixar parametrizável o nível de corte do inimigo?

Confiança: alta

### 5.2 Planejamento estrutural do inimigo

#### P39

Pergunta:

O modo Tentacle Wars deve fazer a IA valorizar explicitamente triângulos de suporte?

Resposta: Somente IA roxa, em níveis de jogo elevado. 

Observações: Também deve ser uma estrutura parametrizada, para ajuste futuro.

Confiança: alta

#### P40

Pergunta:

Ou regras fiéis de energia/overflow já produziriam esse comportamento naturalmente, mesmo com uma heurística mais simples?

Resposta: Acredito que estas regras fieis já vão ajudar muito, mas é bom ter a opção de dosar a inteligência de triangulação da IA.

Observações:

Confiança: alta

### 5.3 Papel da facção roxa no modo Tentacle Wars

#### P41

Pergunta:

Queremos preservar a lógica atual de coalizão de cores do NodeWARS no modo de fidelidade?

Resposta: No TentacleWARS, todas as células são inimigas umas das outras. Ou seja, célula roxa pode atacar célula vermelha.

Observações: Podemos deixar isso parametrizável. Para tratar células Roxa e vermelha como amigas, colaboradoras ou inimigas. 

Confiança: alta

#### P42

Pergunta:

Ou o modo deve se aproximar mais da estrutura original de papéis inimigos, mesmo que isso divirja da campanha atual?

Resposta: Estrutura original, mas parametrizável.

Observações:

Confiança: alta

---

## 6. Modelo de Input e Controle do Jogador

### 6.1 Click-connect versus draw-connect

#### P43

Pergunta:

O modo deve usar draw-connect como padrão obrigatório?

Resposta: Sim

Observações:

Confiança: alta

#### P44

Pergunta:

Ou click-connect deve continuar disponível por acessibilidade / conveniência?

Resposta: Pode continuar disponível também. Os dois modos validos.

Observações:

Confiança: alta

### 6.2 Rigidez do gesto de slice

#### P45

Pergunta:

O modo de fidelidade deve tornar o slice mais rígido e mais dependente de habilidade?

Resposta: Pode ser rígido, mas não sei quais seriam as outras variantes. Explique isto depois.

Observações:

Confiança: média

#### P46

Pergunta:

Ou devemos preservar o gesto atual, mais generoso, pela responsividade?

Resposta: Como seria ese gesto mais generoso. Explique as possibilidades para decidirmos.

Observações:

Confiança: média

---

## 7. Campanha e Separação de Modos

### 7.1 Escopo do novo modo

#### P47

Pergunta:

O modo `TentacleWars` deve surgir inicialmente como:

- apenas sandbox / skirmish
- um subconjunto de fases
- ou uma campanha completa paralela?

Resposta: Vamos fazer uma campanha paralela, para dividir a logica e mecânica para cada modo de jogo.

Observações: Apresente suas considerações, o que seria melhor fazer no momento.

Confiança: alta

#### P48

Pergunta:

A primeira implementação deve focar apenas no modelo de energia/overflow antes de reproduzir mapas e identidades inimigas?

Resposta: Sim. Vamos aos poucos. Primeiro acertar 100% da mecânica do jogo e depois pensamos nos mapas.

Observações: Fazer primeiro algumas fases para testar a nova mecânica.

Confiança: alta

### 7.2 Sistemas compartilhados versus bifurcados

#### P49

Pergunta:

Quais sistemas atuais devem ser compartilhados entre os dois modos?

Candidatos:

- rendering
- input
- save system
- notifications
- music

Resposta: Acredito que deses sistemas, todos podem ser compartilhados com o novo modo de jogo.

Observações: Minha duvida fica no input. Verifique se teremos algum problema usando ele. Se não tiver nenhuma objeção, vamos usar.

Confiança: alta

#### P50

Pergunta:

Quais sistemas provavelmente devem ser separados?

Candidatos:

- energy model
- grade table
- AI tuning
- campaign layouts

Resposta: Todos esses.

Observações: Vai ser bem diferente. Podemos nos basear em como são implementados, mas o funcionamento deve ser bastante diferente, não?

Confiança: alta

### 7.3 Alvo de fidelidade da campanha

#### P51

Pergunta:

O modo Tentacle Wars deve ser:

- apenas inspirado mecanicamente
- mecanicamente próximo
- ou uma reconstrução fase a fase?

Resposta: Acredito que o mais proximo possível mecanicamente. 

Observações: Apresente também suas considerações.

Confiança: media

#### P52

Pergunta:

Quão importante é reproduzir a campanha exata versus priorizar apenas a fidelidade mecânica?

Resposta: Fidelidade mecânica mais importante.

Observações:

Confiança: alta

---

## 8. Fidelidade Visual e Sonora

### 8.1 Renderização do fluxo nos tentáculos

#### P53

Pergunta:

Quão perto do original os visuais de pacotes nos tentáculos devem chegar?

Resposta: Gostaria que este modo seja bem parecido visualmente com o TentacleWARs.

Observações:

Confiança: alta

#### P54

Pergunta:

A densidade visual da lane deve refletir diretamente a pressão de overflow no modo de fidelidade?

Resposta: Sim

Observações:

Confiança: alta

### 8.2 Visual dos níveis da célula

#### P55

Pergunta:

Queremos fidelidade visual dos níveis das células no modo Tentacle Wars?

Resposta: O mais proximo possível 

Observações:

Confiança: medio

#### P56

Pergunta:

Ou apenas a mecânica deve mudar, mantendo a linguagem visual atual do NodeWARS?

Resposta: Gostaria de uma identidade visual próxima do TentacleWARS para este modo.

Observações:

Confiança: medio

### 8.3 Direção musical e sonora

#### P57

Pergunta:

O modo Tentacle Wars também deve mudar a direção de música e efeitos sonoros?

Resposta: Podemos utilizar o mesmo do NodeWARS.

Observações:

Confiança: alta

#### P58

Pergunta:

Ou deve manter a identidade audiovisual atual do NodeWARS enquanto apenas a mecânica muda?

Resposta: Audio pode mantar o mesmo. Visual devemos nos aproximar de TentacleWARS.

Observações:

Confiança: alta
