

## Adicionar gráficos de performance à página Visão Consultora

### Problema
Quando um admin/super admin acessa a "Visão Consultora" para simular o que a consultora vê, a página mostra apenas KPIs, níveis de comissão e tabela de vendas. Porém, quando a consultora faz login, ela também vê no Dashboard os gráficos de performance (tendência de receita, receita por forma de pagamento, vendas por plano e histograma de ticket). A Visão Consultora não está replicando fielmente a experiência da consultora.

### Solução
Adicionar os mesmos 5 componentes de gráficos que existem no Dashboard à página `VisaoConsultora.tsx`, alimentados pelos lançamentos da consultora selecionada (não os dados globais).

### Detalhes técnicos

**Arquivo:** `src/pages/VisaoConsultora.tsx`

1. Importar o hook `useSalesMetrics` e os 5 componentes de gráfico:
   - `RevenueTrendChart`
   - `RevenueByPaymentChart`
   - `PlanSalesTable`
   - `CategoryShareChart`
   - `TicketHistogram`

2. Chamar `useSalesMetrics(lancamentos)` passando os lançamentos já filtrados da consultora selecionada

3. Adicionar os gráficos após a seção de "Níveis de Comissão" e antes da tabela de "Vendas do Mês", usando o mesmo layout do Dashboard:
   - Grid 2/3 + 1/3: `RevenueTrendChart` + `RevenueByPaymentChart`
   - Grid 1/2 + 1/2: `PlanSalesTable` + `CategoryShareChart`
   - Full width: `TicketHistogram`

4. Envolver com condicional `{lancamentos && lancamentos.length > 0 && ...}` para não mostrar gráficos sem dados

**Nenhuma mudança de banco de dados necessária** — os dados já existem nos lançamentos carregados. É apenas uma adição de componentes visuais.

