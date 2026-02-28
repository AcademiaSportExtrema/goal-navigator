

## Mover Analista IA para dentro da aba "Vendas Consultoras"

### Problema
O Analista IA está fora das tabs (linhas 942-948), aparecendo após ambas as abas. O usuário quer que fique apenas no final da primeira aba ("Vendas Consultoras"), analisando tanto a meta de vendas das consultoras quanto a gerencial em uma única análise.

### Alteração

**`src/pages/Dashboard.tsx`**:
- Remover a seção "Inteligência Artificial" de fora das tabs (linhas 942-948)
- Inserir essa mesma seção no final do `<TabsContent value="consultoras">`, antes do fechamento `</TabsContent>` (após linha 875, antes de 876)
- Manter o mesmo componente `AnalistaIaCard` — ele já recebe os dados do mês e gera a análise completa que inclui tanto métricas de consultoras quanto gerencial

