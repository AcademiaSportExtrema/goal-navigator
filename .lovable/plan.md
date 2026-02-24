

## Ocultar métricas globais do Dashboard para consultoras

### Problema
Consultoras têm acesso ao Dashboard e veem cards com informações globais que não são relevantes para elas:
1. **Meta do Mês** (R$ 200.000,00 com link "Configurar meta →")
2. **% Atingimento** global
3. **Nível Atual** global

Essas informações são da empresa toda e só fazem sentido para o admin. As consultoras já têm suas métricas individuais na página Minha Performance.

### Solução
Usar a role do usuário (`useAuth`) no Dashboard para condicionar a exibição desses cards. Quando o usuário for `consultora`, esses 3 cards serão ocultados. Também serão ocultados os cards "Lançamentos" (link para Gerencial), "Pendentes de Regra" (link para Pendências) e "Comissão Estimada" global, que são informações administrativas.

### Detalhes técnicos

**Arquivo:** `src/pages/Dashboard.tsx`

1. Importar `useAuth` e obter a `role` do usuário
2. Criar flag `isAdmin = role === 'admin'`
3. Envolver os seguintes blocos com `{isAdmin && ...}`:
   - Card "Meta do Mês" (linhas 375-388)
   - Card "Lançamentos" (linhas 390-401) — link para `/gerencial`
   - Card "Pendentes de Regra" (linhas 403-418) — link para `/pendencias`
   - Seção inteira de "Cards de meta detalhados" com % Atingimento, Nível Atual e Comissão Estimada (linhas 421-465)

Isso mantém visíveis para a consultora apenas: **Total Vendido** e **Total Faturado** (informações de volume geral do mês).

