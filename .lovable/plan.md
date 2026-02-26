

## Herdar níveis de comissão do mês anterior

### Problema
Ao configurar um novo mês que ainda não tem dados salvos, o sistema usa defaults hardcoded. O esperado é que os percentuais dos níveis sejam copiados do último mês configurado.

### Solução

#### `src/pages/ConfiguracaoMes.tsx`
1. Adicionar uma query para buscar os níveis de comissão do mês anterior mais recente (qualquer mês com `comissao_niveis` salvo, ordenado por `mes_referencia DESC`, limitado a 1)
2. No `useEffect` que popula `niveis` (linha 140-151), quando `niveisComissao` está vazio (mês novo), usar os níveis do mês anterior em vez de `defaultNiveis`
3. Manter `defaultNiveis` como fallback final caso não exista nenhum mês anterior configurado

#### Lógica da query
```sql
-- Buscar a meta mensal mais recente que NÃO seja o mês selecionado
SELECT cn.* FROM comissao_niveis cn
JOIN metas_mensais mm ON cn.meta_mensal_id = mm.id
WHERE mm.mes_referencia < mesSelecionado
ORDER BY mm.mes_referencia DESC, cn.nivel ASC
```

Na prática: buscar `metas_mensais` com `mes_referencia` diferente do selecionado, ordenado DESC, pegar o primeiro, e então buscar seus `comissao_niveis`.

### Arquivo afetado

| Arquivo | Mudança |
|---------|---------|
| `src/pages/ConfiguracaoMes.tsx` | Nova query para último mês configurado + fallback no useEffect |

