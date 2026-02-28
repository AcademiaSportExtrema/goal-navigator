

## Reorganizar Dashboard em Tabs: Consultoras vs Gerencial

### Estrutura

Substituir as seções lineares por um componente `Tabs` no primeiro quadrante do Dashboard (admin only). Consultoras continuam vendo apenas sua visão individual sem tabs.

**Aba 1 — "Vendas Consultoras"** (default):
- Cards resumo: Total Vendido, Total Faturado, Meta do Mês, Lançamentos, Pendentes
- Seção "Atingimento da Meta" (% atingimento, nível, comissão estimada)
- Seção "Performance por Consultora" (gráfico + tabela + share donut)
- Seção "Análise de Vendas" (tendência receita, forma pagamento, planos, ticket)

**Aba 2 — "Meta Gerencial"** (admin only):
- Cards gerenciais: Total Gerencial, Meta Gerencial do Mês, % Atingimento Gerencial
- Espaço para futuros indicadores gerenciais adicionais

### Alterações

**`src/pages/Dashboard.tsx`**:
- Importar `Tabs, TabsList, TabsTrigger, TabsContent` de `@/components/ui/tabs`
- Envolver todo o conteúdo admin (após header/seletor de mês) em `<Tabs defaultValue="consultoras">`
- Mover cards resumo + atingimento + performance + análise de vendas para `<TabsContent value="consultoras">`
- Mover cards gerenciais para `<TabsContent value="gerencial">`
- Manter seção IA fora das tabs (visível em ambas)
- Consultoras (não admin) continuam sem tabs, sem alteração

