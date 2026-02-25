

## Gráfico de Proporção de Vendas por Consultora

### Objetivo
Adicionar um gráfico de pizza/donut no Dashboard mostrando a participação de cada consultora no total vendido do mês.

### Dados
Os dados já existem em `dashboardData.consultoras` (calculados no `useMemo` do Dashboard, linha 230-272). Cada item tem `nome` e `vendido`. Basta calcular o percentual de cada uma sobre o total.

### Implementação

#### 1. Novo componente `ConsultoraShareChart.tsx`
- Gráfico donut (PieChart do Recharts, igual ao `CategoryShareChart` existente)
- Recebe array `{ nome: string; vendido: number; percentual: number }[]`
- Top 5 consultoras + "Outras" se houver mais de 6
- Tooltip com nome, valor e percentual
- Título: "Participação por Consultora"

#### 2. Atualizar `Dashboard.tsx`
- Importar o novo componente
- Inserir na seção do grid de gráficos por consultora (junto ao gráfico de barras e tabela existentes)
- Usar `dashboardData.consultoras` para montar os dados do gráfico
- Controlar visibilidade com chave `grafico_share_consultora`

#### 3. Atualizar `useDashboardVisibilidade.ts`
- Adicionar entrada `{ chave: 'grafico_share_consultora', label: 'Participação por Consultora', padrao: true }` na lista de componentes

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/ConsultoraShareChart.tsx` | Novo componente donut chart |
| `src/pages/Dashboard.tsx` | Importar e renderizar o gráfico |
| `src/hooks/useDashboardVisibilidade.ts` | Registrar nova chave de visibilidade |

