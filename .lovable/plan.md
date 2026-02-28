

## Corrigir classificação Novos vs Recorrência na Tabela 2

### Problema
A lógica atual compara `data_inicio` com `mes_competencia`. O correto é comparar `data_inicio` (início do plano) com `data_lancamento` (data do processamento da parcela):

- **Novo**: `data_inicio` e `data_lancamento` no mesmo mês → plano recorrente vendido naquele mês
- **Recorrência**: `data_inicio` em mês anterior ao `data_lancamento` → parcela processada de contrato antigo

### Alterações

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Relatorios.tsx` | Adicionar `data_lancamento` ao select da query (linha 102); na classificação da Tabela 2 (linhas 147-158), trocar comparação de `data_inicio` vs `mes_competencia` para `data_inicio` vs `data_lancamento`; adicionar `data_lancamento` à interface `Lancamento` |

### Lógica corrigida
```typescript
const diMonth = l.data_inicio ? l.data_inicio.slice(0, 7) : null;
const dlMonth = l.data_lancamento ? l.data_lancamento.slice(0, 7) : null;

if (diMonth && dlMonth && diMonth === dlMonth) {
  // Novo: data_inicio == data_lancamento (vendido este mês)
} else {
  // Recorrência: data_inicio anterior (processando parcela)
}
```

