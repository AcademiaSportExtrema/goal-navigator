

## Correção: campo consultor com nomes duplicados separados por vírgula

### Problema

Em alguns arquivos de devedores, o campo "consultor" vem duplicado com vírgula (ex: `"Nicole Ferreira Dos Anjos, Nicole Ferreira Dos Anjos"`). O sistema grava esse valor inteiro, o que pode causar falha no matching com o cadastro e no filtro RLS.

### Correção

**1 arquivo**: `supabase/functions/upload-devedores/index.ts`

Na linha onde o `consultorRaw` é processado (antes da normalização e gravação), aplicar split por vírgula e usar apenas o primeiro segmento:

```typescript
// Antes da normalização e do insert
let consultorLimpo = consultorRaw ? String(consultorRaw).trim() : null;
if (consultorLimpo && consultorLimpo.includes(',')) {
  consultorLimpo = consultorLimpo.split(',')[0].trim();
}
```

Isso afeta 2 pontos:
- **Matching com cadastro** (linha 324): usar `consultorLimpo` em vez de `consultorRaw`
- **Insert no banco** (linha 341): gravar `consultorLimpo` em vez de `String(consultorRaw).trim()`

Nenhuma alteração de frontend ou migração SQL necessária — apenas a edge function de upload.

