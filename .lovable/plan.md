

## Correção: Parsing de valor monetário no upload de devedores

### Problema
Na função `parseValor` (linha 88 de `upload-devedores/index.ts`), o código **sempre** trata o ponto como separador de milhar e o remove:

```
"149.00" → remove pontos → "14900" → parseFloat → 14900 ❌
```

O arquivo usa formato com ponto decimal (ex: `149.00` = cento e quarenta e nove reais), mas o parser interpreta como 14.900 reais.

### Solução
Detectar o formato automaticamente antes de limpar:

- Se o valor tem **vírgula como decimal** (ex: `14.900,00` ou `149,00`): formato BR — remover pontos, trocar vírgula por ponto
- Se o valor tem **ponto como decimal** e **sem vírgula** (ex: `149.00`, `14900.50`): formato EN — usar direto
- Se o valor tem **ambos** com vírgula depois do ponto (ex: `14.900,00`): formato BR

Lógica concreta:
```typescript
// Se tem vírgula → formato BR (ponto é milhar)
// Se não tem vírgula e tem ponto → formato EN (ponto é decimal)
if (str.includes(',')) {
  cleaned = str.replace(/\./g, '').replace(',', '.');
} else {
  cleaned = str; // ponto já é decimal
}
```

### Alteração
Apenas a função `parseValor` em `supabase/functions/upload-devedores/index.ts` (linhas 86-89). Uma única Edge Function, sem impacto em nenhum outro arquivo.

