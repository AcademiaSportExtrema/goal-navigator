

## Adicionar Tabelas 3 e 4: Valores por Duração e Valores de Recorrência

### O que será feito
Duas novas tabelas espelhando as Tabelas 1 e 2, mas exibindo **soma de valores (R$)** em vez de quantidades.

### Alteração

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Relatorios.tsx` | Adicionar acumuladores de valor no `useMemo` e renderizar 2 novas tabelas |

### Detalhes

1) **No `useMemo`**, criar mapas paralelos de valores:
   - `durValMap[month][cat] += valor` (mesma lógica de filtro/mês da Tabela 1)
   - `recValMap[month].novo += valor` / `recValMap[month].recorrencia += valor` (mesma lógica da Tabela 2)
   - Totais: `durationValTotals` e `recurrenceValTotals`

2) **Tabela 3 — "Receita por Duração"**: mesma estrutura da Tabela 1, mas células exibem `formatCurrency(valor)`. Drill-down reutiliza os mesmos arrays `ldMap`.

3) **Tabela 4 — "Receita Recorrência Detalhada"**: mesma estrutura da Tabela 2, mas com valores. Drill-down reutiliza `lrMap`.

4) **Componente `ClickableCurrencyCell`**: similar ao `ClickableCell`, mas formata como moeda.

5) Layout: as 4 tabelas ficam em 2 linhas de grid (`grid-cols-1 xl:grid-cols-3`), mantendo o padrão existente.

