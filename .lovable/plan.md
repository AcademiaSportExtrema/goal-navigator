

## Correção: Trocar coluna "Média Mensal" por linha "Valor Mensal"

### O que muda
- **Remover** a coluna "Média Mensal" (header + células de dados + total)
- **Adicionar uma linha extra** abaixo da linha Total chamada "Valor Mensal" que mostra, para cada coluna de duração, o ticket médio dividido pela duração em meses
- Cálculo simples: para cada coluna, `ticket_médio_total / meses_duração`
  - `recorrente` → ticket / 1
  - `quatro` → ticket / 4
  - `seis` → ticket / 6
  - `doze` → ticket / 12
  - `dezoito` → ticket / 18
- Colunas sem duração (`loja`, `mensal`, `outros`) e agregadores (`Wellhub`, `Total Pass`, `Entuspass`) mostram "-"

### Alterações em `src/pages/Relatorios.tsx`

| Mudança | Linhas |
|---------|--------|
| Remover `<TableHead>Média Mensal</TableHead>` | ~602 |
| Remover `<TableCell>` da média mensal nas linhas de dados | ~632-644 |
| Remover `<TableCell>` da média mensal na linha Total | ~658-670 |
| Adicionar nova `<TableRow>` "Valor Mensal" após a linha Total | Após ~671 |

A nova linha usará os totais globais (`durationValTotals` / `durationTotals`) divididos pela duração:

```typescript
<TableRow className="bg-primary/5 border-t-2">
  <TableCell className="text-xs font-bold">Valor Mensal</TableCell>
  {DURATION_COLUMNS.map(c => {
    const months = DURATION_MONTHS[c.key];
    const ticket = durationTotals[c.key] > 0 
      ? durationValTotals[c.key] / durationTotals[c.key] 
      : 0;
    return (
      <TableCell key={c.key} className="text-center text-xs font-bold tabular-nums">
        {months && ticket > 0 ? formatCurrency(ticket / months) : '-'}
      </TableCell>
    );
  })}
  <TableCell>-</TableCell> {/* Wellhub */}
  <TableCell>-</TableCell> {/* Total Pass */}
  <TableCell>-</TableCell> {/* Entuspass */}
</TableRow>
```

