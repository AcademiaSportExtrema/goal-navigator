

## Paginacao no Gerencial e Filtros/Ordenacao nas Consultoras

### Parte 1 -- Gerencial: Paginacao real no banco de dados

Atualmente o Gerencial busca no maximo 1000 registros do banco e faz paginacao apenas no frontend (50 por pagina). Isso significa que se houver mais de 1000 lancamentos, parte dos dados fica invisivel.

**Mudanca:** Implementar paginacao server-side usando `.range()` do Supabase, buscando apenas os 50 registros da pagina atual. Os filtros e ordenacao tambem serao aplicados na query do banco.

**Arquivo:** `src/pages/Gerencial.tsx`

- Substituir a query unica por uma que recebe `currentPage`, `filters`, `sortColumn`, `sortDirection`, `searchTerm` e `dateRange` como parametros
- Usar `.range((page-1)*50, page*50-1)` para buscar apenas a pagina atual
- Aplicar filtros via `.eq()`, `.ilike()` e `.gte()/.lte()` direto na query do Supabase
- Adicionar uma segunda query com `select('id', { count: 'exact', head: true })` e os mesmos filtros para obter o total de registros (necessario para calcular o numero de paginas)
- Os totais financeiros (soma de valor) precisarao de uma abordagem: usar uma database function ou calcular a soma apenas dos registros filtrados via uma query separada com `select('valor')` e os mesmos filtros
- Manter o seletor de colunas, exportacao CSV e funcionalidades existentes
- O CSV continuara exportando todos os registros filtrados (sem paginacao), fazendo uma query separada sem `.range()`

**Nova database function** para totais:

```sql
CREATE OR REPLACE FUNCTION public.count_and_sum_lancamentos(
  _empresa_id uuid,
  _search text DEFAULT '',
  _filters jsonb DEFAULT '{}'
)
RETURNS TABLE(total_count bigint, total_valor numeric)
```

Alternativa mais simples: duas queries -- uma com `count: 'exact'` e head:true, outra pegando todos os valores para somar. Como a soma e importante, a funcao no banco e mais eficiente.

### Parte 2 -- Consultoras: Tabela com filtro, busca e ordenacao

Atualmente a pagina Consultoras exibe as consultoras como cards sem nenhum filtro ou ordenacao.

**Mudanca:** Converter para formato de tabela com:

**Arquivo:** `src/pages/Consultoras.tsx`

- Adicionar campo de busca por nome/email
- Adicionar filtro por status (Todas / Ativas / Inativas / Com Acesso / Sem Acesso)
- Adicionar ordenacao clicavel nas colunas (Nome, Email, Status, Acesso)
- Manter os cards de resumo no topo (Total, Ativas, Inativas, Com Acesso)
- Substituir a lista de cards por uma `<Table>` com colunas: Nome, Email, Status (ativo/inativo), Acesso (badge), Acoes
- Adicionar paginacao frontend (a quantidade de consultoras e pequena, nao precisa de server-side)
- 20 itens por pagina com navegacao identica ao Gerencial

### Detalhes tecnicos

**Gerencial -- query paginada:**
```typescript
const { data, count } = await supabase
  .from('lancamentos')
  .select('*', { count: 'exact' })
  .order(sortColumn || 'data_lancamento', { ascending: sortDirection === 'asc' })
  .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);
```

Os filtros serao encadeados condicionalmente:
- `searchTerm` -> `.or('nome_cliente.ilike.%term%,resp_venda.ilike.%term%,...')`
- `filters.empresa` -> `.eq('empresa', value)`
- `dateRange` -> `.gte('data_lancamento', from).lte('data_lancamento', to)`

**Consultoras -- filtro e ordenacao frontend:**
```typescript
const [search, setSearch] = useState('');
const [statusFilter, setStatusFilter] = useState('all');
const [sortCol, setSortCol] = useState<string>('nome');
const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
```

Filtro aplicado via `useMemo` sobre o array de consultoras ja carregado.

**Arquivos alterados:**
- `src/pages/Gerencial.tsx` -- paginacao server-side, queries refatoradas
- `src/pages/Consultoras.tsx` -- tabela com busca, filtro, ordenacao e paginacao

Nenhuma alteracao de schema e necessaria (a menos que se opte pela database function de totais, que seria uma migracao simples).

