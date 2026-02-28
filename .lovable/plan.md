

## Formatar número do META ANO

O input "META ANO" mostra o valor bruto (ex: `3000000`) sem formatação. Precisa exibir como `3.000.000,00` no formato brasileiro.

### Alterações em `src/components/relatorios/MetaAnualTable.tsx`

1. **Adicionar função `formatInputBRL`** — formata número para string BRL (ex: `3000000` → `3.000.000,00`)

2. **Alterar o `useEffect` (linha 92-98)** — ao carregar do banco, formatar o valor com `formatInputBRL` em vez de `String()`

3. **Alterar o `onChange` do Input META ANO (linha 195)** — permitir apenas dígitos, pontos e vírgula na digitação, mantendo o valor legível

4. **Arquivo**: `src/components/relatorios/MetaAnualTable.tsx`

