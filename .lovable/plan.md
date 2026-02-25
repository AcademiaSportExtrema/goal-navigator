

## Aplicar visibilidade do Dashboard na Visão Consultora

### Problema
A página Visão Consultora mostra todos os 5 gráficos de performance sem respeitar as configurações de visibilidade definidas pelo admin. Ou seja, o admin desliga um gráfico para consultoras mas ao abrir a Visão Consultora ele continua aparecendo.

### Solução
Importar o hook `useDashboardVisibilidade` na página `VisaoConsultora.tsx` e envolver cada gráfico com a verificação `isComponenteVisivel()`, exatamente como já é feito no `Dashboard.tsx`.

### Detalhes técnicos

**Arquivo:** `src/pages/VisaoConsultora.tsx`

1. Importar `useDashboardVisibilidade`
2. Chamar o hook: `const { isComponenteVisivel } = useDashboardVisibilidade();`
3. Envolver cada gráfico na seção de performance (linhas 330-344) com condicionais:
   - `RevenueTrendChart` → `isComponenteVisivel('grafico_tendencia_receita')`
   - `RevenueByPaymentChart` → `isComponenteVisivel('grafico_forma_pagamento')`
   - `PlanSalesTable` → `isComponenteVisivel('tabela_vendas_plano')`
   - `CategoryShareChart` → `isComponenteVisivel('grafico_categoria')`
   - `TicketHistogram` → `isComponenteVisivel('histograma_ticket')`
4. Só renderizar cada grid row se pelo menos um dos filhos é visível

**Diferença do Dashboard:** No Dashboard usa-se `show() = isAdmin || isComponenteVisivel()` (admin sempre vê tudo). Na Visão Consultora usaremos apenas `isComponenteVisivel()` diretamente, pois o objetivo é simular exatamente o que a consultora vê.

**Nenhuma mudança de banco de dados necessária.**

