

## Problema identificado

O Dashboard da consultora está quase vazio porque:
1. Os cards de meta, nível, comissão e atingimento estão protegidos por `isAdmin &&` (linhas 398-447, 451-494)
2. O gráfico e tabela por consultora exigem `metaMensal && dashboardData` com lançamentos (linha 497) - se não houver vendas, não aparece nada
3. Sobram apenas "Total Vendido" e "Total Faturado" (controlados por `show()`), que mostram R$ 0,00

A consultora não vê sua meta individual nem níveis de comissão no Dashboard.

## Solução

Adicionar uma seção específica para consultoras no Dashboard que exiba a meta individual (mês atual e próximo), similar ao que existe em MinhaPerformance, mas de forma resumida.

### Alterações em `src/pages/Dashboard.tsx`

1. **Buscar dados da consultora logada**: usar `consultoraId` do `useAuth()` para buscar a `metas_consultoras` da consultora logada no mês selecionado
2. **Adicionar cards visíveis para consultora**:
   - Card "Minha Meta" com valor individual (meta_total * percentual)
   - Card "Níveis de Comissão" mostrando as faixas configuradas
   - Quando `isProximoMes`, ocultar cards de vendas (Total Vendido / Total Faturado) pois não há dados
3. **Renderização condicional**: `{isConsultora && metaMensal && (...)}`  mostra os cards de meta individual logo abaixo do seletor de mês

### Queries adicionais necessárias
- Query `meta-consultora-individual` para buscar `metas_consultoras` filtrada por `consultora_id` do auth
- Reutilizar queries existentes de `metaMensal` e `niveisComissao` (já existem)

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Dashboard.tsx` | Importar `consultoraId` do useAuth, adicionar query de meta individual, renderizar cards de meta e comissão para consultora |

