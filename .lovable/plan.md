

## Corrigir Tabela 1: Contar todos os recorrentes processados no mês

### Problema
A Tabela 1 conta recorrentes por `mes_competencia`, mas deveria contar **todos os recorrentes processados no mês** (independente de `data_inicio`), já que a separação Novo vs Recorrência é feita na Tabela 2.

Para **parcelados** (4, 6, 12, 18 meses): contar apenas vendas novas (`data_inicio` == `data_lancamento` no mesmo mês), pois parcelas processadas não devem aparecer como novas vendas.

### Alteração

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Relatorios.tsx` | Na Tabela 1 (~linhas 134-141): para itens **recorrentes**, usar `data_lancamento` como mês-chave (igual à Tabela 2). Para **parcelados** (4,6,12,18), pular se `data_inicio` e `data_lancamento` diferem no mês. Loja e mensal continuam iguais. |

### Lógica

```typescript
const cat = classifyDuration(l);

// Parcelados: só conta venda original
if (['quatro','seis','doze','dezoito'].includes(cat)) {
  const diM = l.data_inicio?.slice(0, 7);
  const dlM = l.data_lancamento?.slice(0, 7);
  if (diM && dlM && diM !== dlM) continue;
}

// Recorrente: indexa pelo mês de processamento
const durMonth = (cat === 'recorrente')
  ? (l.data_lancamento?.slice(0, 7) || mc)
  : mc;

if (!durMap[durMonth]) { /* inicializa */ }
durMap[durMonth][cat]++;
ldMap[durMonth][cat].push(l);
```

