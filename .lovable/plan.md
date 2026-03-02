

## Diagnóstico

O problema é um bug clássico de fuso horário na exibição de datas. O código usa `new Date('2026-03-01')` para formatar os nomes dos meses, mas essa sintaxe é interpretada como UTC meia-noite. No Brasil (UTC-3), isso vira "28 de fevereiro às 21h" — um mês antes.

**Resultado**: Os botões mostram "jan, fev, mar" mas o sistema está consultando dados de "fev, mar, abr". Quando o usuário clica em "fev 2026" (que na verdade é março), os dados retornam vazios porque março não tem vendas ainda.

## Correção: `src/pages/MinhaPerformance.tsx`

Substituir todas as chamadas `new Date(mesSelecionado + '-01')` por construção com componentes locais para evitar a interpretação UTC:

```typescript
// Helper para parsear 'YYYY-MM' sem bug de fuso
function parseMonth(mes: string): Date {
  const [y, m] = mes.split('-').map(Number);
  return new Date(y, m - 1, 1); // mês local, sem UTC
}
```

Locais que precisam ser atualizados (5 ocorrências):
1. **Linha 176** — label do mês no header
2. **Linha 190** — botão do mês anterior
3. **Linha 201** — botão do mês atual
4. **Linha 211** — botão do próximo mês
5. **Linha 395** — data dos lançamentos na tabela (`new Date(l.data_lancamento)`)

Todas passam de `new Date(string)` para `parseMonth(string)` ou `new Date(y, m-1, d)`.

Nenhuma alteração nos queries ou no banco — os dados já estão corretos.

