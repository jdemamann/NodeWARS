# Perguntas de Follow-up — Modo Tentacle Wars

## Objetivo

Este documento contém apenas as perguntas restantes de maior impacto para destravar a proposta de arquitetura do modo `TentacleWars`.

Ele é uma continuação da folha anterior e foca só no que ainda está ambíguo.

## Como responder

Para cada pergunta:

- escreva sua resposta em `Resposta`
- use `Observações` para exemplos, exceções ou incertezas
- informe o nível de confiança:
  - `alta`
  - `média`
  - `baixa`

---

## 1. Regra de duplicação do overflow

### F1

Pergunta:

Quando uma célula cheia recebe suporte e possui vários tentáculos de saída, o overflow deve:

- entregar o valor inteiro para **cada** tentáculo de saída
- dividir igualmente entre os tentáculos de saída
- ou seguir alguma terceira regra?

Resposta: entregar valor inteiro para cada tentáculo de saida

Observações:

Confiança: alta

### F2

Pergunta:

Se a resposta for “terceira regra”, descreva essa regra da forma mais concreta possível.

Resposta: 

Observações:

Confiança:

---

## 2. Modelo exato dos pacotes

### F3

Pergunta:

No modo Tentacle Wars, cada pacote deve valer sempre `1`, e o nível da célula só muda a frequência de emissão?

Resposta: Exato. 

Observações: Vamos implementar a opção de deixar o tamanho do pacote parametrizável, com ele fixo em 1 por enquanto.

Confiança: alta

### F4

Pergunta:

Ou o tamanho do pacote também muda com o nível da célula?

Resposta:

Observações:

Confiança:

### F5

Pergunta:

Se o tamanho do pacote mudar com o nível, descreva como você imagina essa escala.

Resposta:

Observações:

Confiança:

---

## 3. Regra completa do Dominator

### F6

Pergunta:

Qual deve ser o threshold de subida para o `Dominator`?

Resposta: 180

Observações:

Confiança: media

### F7

Pergunta:

Qual deve ser o threshold de descida do `Dominator`?

Resposta: 160

Observações:

Confiança: media

### F8

Pergunta:

O `Dominator` deve:

- emitir o dobro de pacotes
- emitir pacotes maiores
- ou simplesmente dobrar o throughput por outra regra?

Resposta: emitir o dobro de pacotes

Observações: deixe parametrizável, para ajustes caso a jogabilidade fique prejudicada.

Confiança: alta

---

## 4. Regra de captura hostil

### F9

Pergunta:

Quando uma célula hostil é capturada, ela deve:

- resetar para um valor base fixo e depois receber a energia restante do ataque
- ficar apenas com a energia restante do ataque
- ou seguir outra regra?

Resposta: Reseta para 10, recebendo a energia proveniente dos possíveis tentáculos que ela gerou, para aumentar sua energia básica. Soma-se a isso também a energia de algum tentáculo que foi cortado para capturar essa célula hostil. Perceba que a logica dos Tentáculos sempre garante reutilizar a energia de geração + energia transportada, independentemente da situação.

Observações:

Confiança: alta

### F10

Pergunta:

Se existir um valor base fixo após captura hostil, qual deve ser esse valor?

Resposta: 10 de energia + energia proveniente dos tentáculos que ela ainda possuir. 

Observações: Provavelmente a logica de retração dos tentáculos deve garantir esta mecânica, náo sendo necessário tratamento separado.

Confiança: alta

### F11

Pergunta:

O custo de aquisição hostil deve ser igual ao custo de aquisição neutro, ou diferente?

Resposta: O custo de aquisição do hostil depende da energia dele. Precisamos reduzir a energia de um qualquer célula hostil para zero.

Observações: Lembre-se que a energia que flui por um tentáculo, quando em combate com uma célula hostil, é usada para neutralizar a energia do tentáculo hostil. Sobrando energia, ela deve causar dano na energia base da célula. Isso já está bem entendido, correto?

Confiança: alta

---

## 5. Rigidez do slice no modo Tentacle Wars

### F12

Pergunta:

No modo Tentacle Wars, o slice deve ser mais rígido que no NodeWARS atual?

Resposta: Pode seguir a mesma regra.

Observações:

Confiança: media

### F13

Pergunta:

Se sim, em que aspecto ele deve ser mais rígido?

Possibilidades:

- corredor de acerto menor
- menos tolerância nas extremidades
- gesto mais rápido
- outra regra

Resposta:

Observações:

Confiança:

### F14

Pergunta:

Se não, devemos manter o mesmo sistema de slice do NodeWARS por responsividade?

Resposta: Sim

Observações:

Confiança: alta

---

## 6. Escopo do primeiro protótipo

### F15

Pergunta:

Quantas fases o primeiro protótipo jogável do modo Tentacle Wars deve ter?

Resposta: Vamos fazer uma fase randômica, para testar possibilidades

Observações:

Confiança: alta

### F16

Pergunta:

O primeiro protótipo já deve incluir a facção roxa?

Resposta: Sim, para conseguirmos fazer testes com distribuição de células de maneira randômica e validar a mecânica.

Observações: Obviamente com mais celulas neutras do que amigas e inimigos

Confiança: alta

### F17

Pergunta:

O primeiro protótipo já deve incluir todos os níveis de célula, incluindo `Dominator`?

Resposta: Sim

Observações:

Confiança: alta

### F18

Pergunta:

Você prefere que o primeiro protótipo seja:

- uma prova de mecânica em poucas fases
- ou já um mini-campaign slice com progressão?

Resposta: prova mecânica com poucas fases

Observações:

Confiança: alta

