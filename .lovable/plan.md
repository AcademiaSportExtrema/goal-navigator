

# Separar "Total Vendido" e adicionar "Total Faturado"

## Entendimento

- **Total Vendido** (card existente): soma apenas lancamentos com `entra_meta = true` cuja `data_inicio` cai no mes selecionado. Ou seja, vendas efetivamente iniciadas naquele mes.
- **Total Faturado** (card novo): soma todos os lancamentos com `entra_meta = true` cuja `data_lancamento` cai no mes selecionado. Ou seja, tudo que foi faturado/lancado naquele mes e conta como meta.

Ambos filtram por `entra_meta = true`. A diferenca e o campo de data usado para determinar se pertence ao mes.

## Alteracoes no arquivo `src/pages/Dashboard.tsx`

### 1. Nova query para "Total Vendido" por data_inicio

Criar uma query separada que busca lancamentos com `entra_meta = true` e `data_inicio` dentro do mes selecionado (do dia 1 ao ultimo dia do mes). Esse valor substituira o `totalVendido` atual no card existente.

```typescript
const { data: lancamentosVendido } = useQuery({
  queryKey: ['dashboard-vendido-inicio', mesSelecionado],
  queryFn: async () => {
    const [ano, mes] = mesSelecionado.split('-').map(Number);
    const inicioMes = `${mesSelecionado}-01`;
    const fimMes = new Date(ano, mes, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('lancamentos')
      .select('valor')
      .eq('entra_meta', true)
      .gte('data_inicio', inicioMes)
      .lte('data_inicio', fimMes);

    if (error) throw error;
    return (data || []).reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
  },
});
```

### 2. Nova query para "Total Faturado" por data_lancamento

```typescript
const { data: totalFaturado } = useQuery({
  queryKey: ['dashboard-faturado', mesSelecionado],
  queryFn: async () => {
    const [ano, mes] = mesSelecionado.split('-').map(Number);
    const inicioMes = `${mesSelecionado}-01`;
    const fimMes = new Date(ano, mes, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('lancamentos')
      .select('valor')
      .eq('entra_meta', true)
      .gte('data_lancamento', inicioMes)
      .lte('data_lancamento', fimMes);

    if (error) throw error;
    return (data || []).reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
  },
});
```

### 3. Atualizar o card "Total Vendido"

Trocar o valor exibido de `dashboardData?.totalVendido` para `lancamentosVendido` (o novo valor filtrado por `data_inicio`). O subtitulo dira "Vendas com inicio no mes".

### 4. Adicionar card "Total Faturado"

Novo card com icone DollarSign exibindo `totalFaturado`, com subtitulo "Faturado no mes (por data lancamento)". A grade passara de 4 para 5 colunas (`lg:grid-cols-5`).

### 5. Manter calculos de meta inalterados

Os calculos de atingimento de meta, niveis e comissoes continuarao usando a query existente de `lancamentos` filtrada por `mes_competencia` (que e o que o motor de regras define). Isso garante que a logica de metas nao seja afetada.

### Resultado visual dos cards

| Card | Filtro |
|------|--------|
| Total Vendido | `entra_meta=true` + `data_inicio` no mes |
| Total Faturado (novo) | `entra_meta=true` + `data_lancamento` no mes |
| Meta do Mes | Configuracao de meta |
| Lancamentos | Contagem por `mes_competencia` |
| Pendentes de Regra | Contagem de pendentes |

### Arquivo modificado
- `src/pages/Dashboard.tsx`

