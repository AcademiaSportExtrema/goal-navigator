
# Dashboard de Vendas -- Novos Graficos de Performance

## Resumo

Adicionar 5 novos graficos ao Dashboard existente, abaixo dos cards e do grafico de progresso por consultora. Todos usam dados reais da tabela `lancamentos` do mes selecionado (com `entra_meta = true`). Nenhum mock sera necessario.

## O que ja existe e sera mantido

- Cards de KPI (Total Vendido, Faturado, Meta, Lancamentos, Pendentes) -- ja cobre o requisito de KPIs
- Cards de meta (% Atingimento, Nivel, Comissao)
- Grafico "Progresso da Meta por Consultora" (barras empilhadas)
- Tabela "Detalhamento por Consultora" com Coach IA
- Ultimos Uploads e Equipe

## Novos graficos a adicionar

### A) Tendencia de Receita no Tempo (grafico de linha)

- Agrupar lancamentos por `data_lancamento` (dia a dia dentro do mes)
- Linha mostrando receita acumulada e/ou diaria
- Toggle de visualizacao: "Diario" / "Acumulado"
- Tooltip: receita do dia, quantidade de vendas, ticket medio
- Largura: 2/3 da linha

### B) Receita por Forma de Pagamento (barras verticais)

- Agrupar por `forma_pagamento` (equivalente a "canal" no contexto da academia)
- Ordenar do maior para o menor
- Tooltip: receita e quantidade de vendas
- Largura: 1/3 da linha (ao lado do grafico de tendencia)

### C) Top 10 Produtos (barras horizontais)

- Agrupar por campo `produto`, somar valor
- Mostrar quantidade vendida ao lado
- Ordenar do maior para o menor, limitar a 10
- Largura: 1/2 da linha

### D) Mix por Plano (grafico donut)

- Agrupar por campo `plano`
- Mostrar participacao percentual de cada plano na receita total
- Se houver mais de 6 planos, agrupar os menores em "Outros"
- Largura: 1/2 da linha (ao lado do Top 10)

### E) Distribuicao de Ticket (histograma)

- Faixas de valor: R$0-100, R$100-300, R$300-500, R$500-1000, R$1000+
- Contar lancamentos em cada faixa
- Mostrar ticket medio global como referencia no card
- Largura total da linha

## Layout final do Dashboard

```text
Linha 1: [Seletor de mes]
Linha 2: [5 cards de KPI]
Linha 3: [3 cards de meta]  (se houver meta configurada)
Linha 4: [Progresso por Consultora (grafico)] [Detalhamento (tabela)]
-- NOVOS --
Linha 5: [Tendencia Receita (2/3)] [Receita por Forma Pgto (1/3)]
Linha 6: [Top 10 Produtos (1/2)] [Mix por Plano donut (1/2)]
Linha 7: [Distribuicao de Ticket - largura total]
-- EXISTENTES --
Linha 8: [Ultimos Uploads] [Equipe]
Linha 9: [Acoes Rapidas]
```

## Detalhes tecnicos

### Novo hook: `src/hooks/useSalesMetrics.ts`

- Recebe o `mesSelecionado` como parametro
- Faz uma unica query de `lancamentos` com `entra_meta = true` e `mes_competencia = mesSelecionado`
- Processa os dados em memoria e retorna objetos prontos para cada grafico:
  - `revenueByDay`: array de `{ data, receita, pedidos, ticketMedio, acumulado }`
  - `revenueByPayment`: array de `{ forma, receita, pedidos }` ordenado desc
  - `topProducts`: array de `{ produto, receita, qtd }` top 10
  - `salesByPlan`: array de `{ plano, receita, percentual }` com agrupamento "Outros"
  - `ticketDistribution`: array de `{ faixa, contagem }` + `ticketMedioGlobal`
- Usa os lancamentos ja buscados no Dashboard (reutilizando a query existente) ou faz uma query propria com select dos campos necessarios

### Novos componentes (5 arquivos)

1. `src/components/dashboard/RevenueTrendChart.tsx` -- grafico de linha com toggle diario/acumulado
2. `src/components/dashboard/RevenueByPaymentChart.tsx` -- barras verticais por forma de pagamento
3. `src/components/dashboard/TopProductsChart.tsx` -- barras horizontais top 10
4. `src/components/dashboard/CategoryShareChart.tsx` -- donut por plano
5. `src/components/dashboard/TicketHistogram.tsx` -- histograma de faixas de valor

Todos usam Recharts (ja instalado no projeto). Cada componente recebe os dados processados via props do hook.

### Alteracao: `src/pages/Dashboard.tsx`

- Importar o hook `useSalesMetrics` e os 5 novos componentes
- Renderizar a nova secao de graficos entre o bloco de "Progresso por Consultora" e "Ultimos Uploads"
- Layout responsivo: 2 colunas no desktop, 1 coluna no mobile (usando grid do Tailwind)

### Nenhuma alteracao no backend

Todos os dados ja existem na tabela `lancamentos`. Nenhuma nova tabela, migration ou edge function e necessaria.
