

# Substituir Top 10 Produtos por Tabela de Planos Vendidos

## O que sera feito

- Remover o grafico "Top 10 Produtos" (barras horizontais)
- Criar no lugar uma tabela mostrando a quantidade de cada plano vendido, com receita e percentual

## Alteracoes

### 1. Hook `src/hooks/useSalesMetrics.ts`

- Adicionar campo `pedidos` (quantidade) na interface `SalesByPlan` e no calculo da secao D
- O `planMap` passara a acumular tambem a contagem de lancamentos por plano

### 2. Novo componente: `src/components/dashboard/PlanSalesTable.tsx`

- Tabela estilizada com as colunas: Plano, Qtd Vendida, Receita, % Participacao
- Ordenada por receita (maior primeiro)
- Usa os componentes `Card`, `Table` ja existentes no projeto
- Linha de total no rodape

### 3. Dashboard `src/pages/Dashboard.tsx`

- Remover import e uso do `TopProductsChart`
- Importar e usar `PlanSalesTable` no mesmo lugar (grid 1/2 ao lado do donut "Mix por Plano")

### 4. Limpeza

- O arquivo `src/components/dashboard/TopProductsChart.tsx` pode ser removido (nao sera mais usado)
- A interface `TopProduct` e o calculo `topProducts` no hook podem ser removidos tambem

