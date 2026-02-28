

## Tabela 3 — Ticket Médio por Duração

### O que será feito
Adicionar uma nova tabela (renumerando as existentes) entre a Tabela 2 (Receita) e as tabelas de Recorrência, mostrando o **ticket médio** de cada categoria de duração por mês. O cálculo é simples: `valor / quantidade` para cada célula.

### Alterações em `src/pages/Relatorios.tsx`

| Mudança | Detalhe |
|---------|---------|
| Nova tabela | "Tabela 3 — Ticket Médio por Duração" com mesmas colunas de duração + Wellhub, Total Pass, Entuspass |
| Cálculo | Para cada mês e coluna: `durationValByMonth[mc][key] / durationByMonth[mc][key]`. Se qty = 0, mostra "-" |
| Linha Total | Ticket médio global por coluna: soma total valor / soma total qty |
| Renumeração | Recorrência qty passa a ser Tabela 4, Receita recorrência = Tabela 5, Detalhamento mensal = Tabela 6 |

### Layout atualizado

```text
Tabela 1 — Quantidade por Duração (full width)
Tabela 2 — Receita por Duração (full width)
Tabela 3 — Ticket Médio por Duração (full width) ← NOVA
Tabela 4 — Recorrência Detalhada (qty)  |  Tabela 5 — Receita Recorrência
Tabela 6 — Detalhamento Mensal por Plano
```

