

## Correção: 2 lançamentos de março + regra SPORT 06 OFF + lógica HIBRIDA

### 1. Corrigir regra SPORT 06 OFF no banco
A regra `dda589a4` está com `regra_mes = DATA_INICIO` mas SPORT 06 OFF é parcelado. Alterar para `DATA_LANCAMENTO`.

### 2. Corrigir os 2 lançamentos no banco
- `13c32f13` (Jozineide): `mes_competencia` de `2026-03` → `2026-02`
- `55b01ae8` (Kenzo): `mes_competencia` de `2026-03` → `2026-02`

### 3. Corrigir lógica HIBRIDA nos 3 edge functions

Alterar nos 3 arquivos a linha HIBRIDA de:
```typescript
dataRef = lancamento.plano ? (lancamento.data_inicio || lancamento.data_lancamento) : lancamento.data_lancamento;
```
Para:
```typescript
const isRecorrencia = (lancamento.condicao_pagamento || '').toUpperCase().includes('RECORRÊNCIA');
dataRef = isRecorrencia ? (lancamento.data_inicio || lancamento.data_lancamento) : lancamento.data_lancamento;
```

**Arquivos afetados:**
- `supabase/functions/classificar-meta/index.ts` (linha ~118)
- `supabase/functions/upload-importar-xls/index.ts` (linha ~204-205)
- `supabase/functions/reprocessar-upload/index.ts` (linha ~265)

### Impacto
- Janeiro: **sem alteração** (não mexemos)
- Fevereiro: +R$ 3.336 (Nicole +R$ 2.322, Livia +R$ 1.014)
- Março: zera (correto, mês não começou)
- Futuros uploads: lógica HIBRIDA usará `data_inicio` somente para recorrências

