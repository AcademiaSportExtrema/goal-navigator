

## Remover opção HIBRIDA do motor de regras

### Contexto
Existem **75 regras** com `regra_mes = 'HIBRIDA'`, 8 com `DATA_INICIO` e 9 com `DATA_LANCAMENTO`. A maioria das regras HIBRIDA são produtos (Bold, Monster, Gatorade, etc.) que devem usar `DATA_LANCAMENTO`. 

### Decisão necessária
Antes de implementar, preciso confirmar: as 75 regras HIBRIDA devem ser convertidas para `DATA_LANCAMENTO`? Produtos de loja/avulsos usam data de lançamento, e as regras com `DATA_INICIO` (8 regras) já estão corretas para recorrências.

### Plano de execução

**1. Migração no banco de dados**
- Converter todas as 75 regras `HIBRIDA` → `DATA_LANCAMENTO`
- Remover o valor `HIBRIDA` do enum `regra_mes` (ficam apenas `DATA_LANCAMENTO` e `DATA_INICIO`)

**2. Remover HIBRIDA do frontend (2 arquivos)**
- `src/pages/Regras.tsx` (linha 71): remover opção `HIBRIDA` do array `regraMesOptions`
- `src/pages/Pendencias.tsx` (linha 68): remover opção `HIBRIDA` do array `regraMesOptions`
- `src/types/database.ts` (linha 37): remover `HIBRIDA` do tipo `RegraMes`

**3. Remover lógica HIBRIDA dos 3 edge functions**
- `supabase/functions/classificar-meta/index.ts`: remover bloco `else if HIBRIDA` (linhas 117-119)
- `supabase/functions/upload-importar-xls/index.ts`: remover bloco `else if HIBRIDA` (linhas 204-206)
- `supabase/functions/reprocessar-upload/index.ts`: remover bloco `else if HIBRIDA` (linhas 265-268)

### Impacto
- Regras existentes HIBRIDA passam a usar `DATA_LANCAMENTO` (correto para produtos)
- Regras de recorrência já usam `DATA_INICIO` e não são afetadas
- Nenhum lançamento é reprocessado (apenas a regra muda para futuras classificações)

