

## Correção: Entuspass deve usar `data_lancamento` como mês de referência

### Problema
Na linha 237, o Entuspass usa `mes_competencia` como prioridade, mas `mes_competencia` é calculado pela regra de classificação e pode estar baseado em `data_inicio`. Como Entuspass é recorrente, o correto é usar **sempre** `data_lancamento`.

### Alteração em `src/pages/Relatorios.tsx`

Linha 237: trocar de:
```typescript
const mc = l.mes_competencia || l.data_lancamento?.slice(0, 7);
```
Para:
```typescript
const mc = l.data_lancamento?.slice(0, 7);
```

Isso garante que os lançamentos Entuspass sejam agrupados pelo mês de processamento (data do lançamento), não pelo início do plano.

