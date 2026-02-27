

## Adicionar filtro, pesquisa e ordenação na lista de regras

### Alterações em `src/pages/Regras.tsx`

1. **Novos estados**: `searchTerm`, `filterCampo` (filtro por campo_alvo), `sortField` e `sortDirection`
2. **Barra de filtros** entre o CardHeader e a lista de regras:
   - Input de pesquisa (busca no `valor` e `observacao`)
   - Select para filtrar por `campo_alvo` (Produto, Plano, etc.) com opção "Todos"
   - Select para ordenar por: Prioridade, Campo, Valor, Entra Meta (asc/desc toggle)
3. **Lógica de filtragem/ordenação**: aplicar `useMemo` sobre `regras` para gerar `regrasFiltradas` com search + filter + sort, e renderizar `regrasFiltradas` em vez de `regras` na lista

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Regras.tsx` | Estados de filtro/busca/ordenação + barra de filtros + useMemo para lista filtrada |

