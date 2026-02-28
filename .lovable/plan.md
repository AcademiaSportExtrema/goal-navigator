

## Tabela 3 — Adicionar coluna "Média Mensal"

### O que será feito
Adicionar uma coluna **"Média Mensal"** na Tabela 3 (Ticket Médio por Duração) que calcula o valor mensal equivalente dividindo o ticket médio pela duração em meses.

### Lógica
- Para cada coluna com duração conhecida, dividir o ticket médio pelo número de meses:
  - `recorrente` → ticket / 1 (já é mensal, mas incluir para consistência)
  - `quatro` → ticket / 4
  - `seis` → ticket / 6
  - `doze` → ticket / 12
  - `dezoito` → ticket / 18
- **Excluir** do cálculo: `loja`, `mensal`, `entuspass` (não fazem sentido como média mensal)
- `outros` → excluir também, pois não temos duração fixa

### Implementação em `src/pages/Relatorios.tsx`

| Mudança | Detalhe |
|---------|---------|
| Mapa de divisores | `const DURATION_MONTHS: Partial<Record<DurationKey, number>> = { recorrente: 1, quatro: 4, seis: 6, doze: 12, dezoito: 18 }` |
| Nova coluna no header | Adicionar `<TableHead>Média Mensal</TableHead>` após Entuspass |
| Cálculo por linha | Para cada mês, somar todos os valores das durações aplicáveis, somar todas as quantidades × respectivos meses, e calcular a média ponderada mensal |
| Linha Total | Mesmo cálculo sobre os totais globais |

O cálculo da média mensal ponderada por linha será:
```typescript
// soma dos (valor de cada coluna) / soma dos (qty × meses de cada coluna)
// Ou seja: quanto cada plano custa por mês, ponderado pela quantidade vendida
let sumVal = 0, sumQtyMonths = 0;
for (const [key, months] of Object.entries(DURATION_MONTHS)) {
  if (qtyRow[key] > 0) {
    sumVal += valRow[key];
    sumQtyMonths += qtyRow[key] * months;
  }
}
const mediaMensal = sumQtyMonths > 0 ? sumVal / sumQtyMonths : null;
```

