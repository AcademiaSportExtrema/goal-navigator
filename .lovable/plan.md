

## Análise: Consultora vê lançamentos do mês anterior em "Minha Performance"

### Como funciona atualmente

A consultora **só pode ver o mês anterior até o dia 5 do mês atual** (linha 42: `showPreviousMonth = new Date().getDate() <= 5`). Se hoje for dia 2 de março, o botão de fevereiro aparece. A partir do dia 6, o botão desaparece.

Quando ela seleciona fevereiro, a query busca:
```typescript
.eq('entra_meta', true)
.eq('mes_competencia', '2026-02')
.eq('consultora_chave', consultora.nome)
```

### Potencial problema de case-sensitivity

A RLS policy de `lancamentos` para consultoras usa comparação **case-sensitive**:
```sql
consultora_chave IN (
  SELECT consultoras.nome FROM consultoras
  WHERE consultoras.id = get_user_consultora_id(auth.uid())
)
```

Se `consultora_chave` tiver casing diferente de `consultoras.nome` (ex: "Livia Maysa" vs "LIVIA MAYSA"), a consultora **não verá nenhum lançamento** — o mesmo bug que existia em `devedores_parcelas` e já foi corrigido lá.

### Plano de correção

1. **Migração SQL**: Recriar a RLS policy `Consultoras view own lancamentos` usando `LOWER()` em ambos os lados da comparação, igual ao que foi feito para `devedores_parcelas`.

2. **Frontend** (linha 120 de `MinhaPerformance.tsx`): Trocar `.eq('consultora_chave', consultora!.nome)` por `.ilike('consultora_chave', consultora!.nome)` para garantir matching case-insensitive na query também.

3. **Verificar outros locais**: Checar se `VisaoConsultora.tsx`, `Dashboard.tsx` e `useSalesMetrics.ts` também usam `.eq('consultora_chave', ...)` e corrigir para `.ilike()`.

