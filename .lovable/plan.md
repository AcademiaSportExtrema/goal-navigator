

## Aplicar regra de "só venda nova" ao plano Mensal na Tabela 1

### Problema
Planos mensais (`duracao=1`) estão sendo contados mesmo quando são parcelas processadas de meses anteriores. Devem seguir a mesma regra dos parcelados: só contar se `data_inicio` e `data_lancamento` estão no mesmo mês.

### Alteração

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Relatorios.tsx` | Linha 138: adicionar `'mensal'` à lista de categorias que filtram por venda original |

### Código
```typescript
// Antes (linha 138):
if (['quatro', 'seis', 'doze', 'dezoito'].includes(cat)) {

// Depois:
if (['mensal', 'quatro', 'seis', 'doze', 'dezoito'].includes(cat)) {
```

Alteração de uma única linha. Loja e recorrente continuam com regras próprias.

