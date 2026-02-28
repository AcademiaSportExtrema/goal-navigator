

## Problema: Limite de 1000 linhas no Supabase

A consulta que busca os lançamentos para calcular o "Realizado" na Meta Anual está limitada a 1000 registros (limite padrão do Supabase). O banco tem **1160 registros** com `entra_meta = true` em 2026, então ~160 registros são silenciosamente ignorados, resultando em valores incorretos.

- Receita real de Fevereiro no banco: **R$ 211.912,45**
- Receita mostrada na tela: **R$ 211.605,55** (faltando dados)

### Solução: Criar função RPC para agregar no banco

**1. Migração SQL** — criar função `get_realizado_por_mes`

```sql
CREATE OR REPLACE FUNCTION get_realizado_por_mes(p_empresa_id uuid, p_ano integer)
RETURNS TABLE(mes integer, total numeric)
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT 
    extract(month from data_lancamento::date)::integer as mes,
    coalesce(sum(valor), 0) as total
  FROM public.lancamentos
  WHERE empresa_id = p_empresa_id
    AND entra_meta = true
    AND data_lancamento >= (p_ano || '-01-01')::date
    AND data_lancamento <= (p_ano || '-12-31')::date
  GROUP BY mes
  ORDER BY mes;
$$;
```

**2. Alterar `MetaAnualTable.tsx`** — substituir a query de lançamentos pela chamada RPC

- Remover a query que busca lançamentos individuais (linhas 67-83)
- Substituir por `supabase.rpc('get_realizado_por_mes', { p_empresa_id, p_ano })`
- Ajustar o `useMemo` de `realizadoPorMes` para mapear o resultado da RPC diretamente

Isso garante que **todos** os registros sejam somados no servidor, sem limite de linhas.

