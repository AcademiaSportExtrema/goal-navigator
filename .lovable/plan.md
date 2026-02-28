

## Corrigir tabela "Detalhamento por Consultora": valores completos + totalizadores

### Problema
A tabela usa `formatCurrencyCompact` que abrevia valores (ex: "R$ 40 mil" em vez de "R$ 40.000,00"). O usuário quer valores completos e uma linha de totais no rodapé.

### Alteração em `src/pages/Dashboard.tsx`

**1. Substituir `formatCurrencyCompact` por `formatCurrency` nas colunas da tabela** (linhas 784, 786, 796, 804):
- Meta: `formatCurrency(c.meta)` 
- Vendido: `formatCurrency(c.vendido)`
- Falta: `formatCurrency(c.falta)`
- Comissão: `formatCurrency(c.comissao)`

**2. Adicionar linha de totais** após o `.map()` (após linha 824, antes de `</TableBody>`):
- Nova `<TableRow>` com estilo `border-t-2 font-semibold`
- Colunas: "Total", soma das metas, soma dos vendidos, % médio geral, "-", "-", soma das comissões, "-"

