

## Remover Tabela 6 — Detalhamento Mensal por Plano

### Justificativa
A Tabela 6 detalha planos mensais individualmente (por nome), mas as Tabelas 1, 2 e 3 já cobrem quantidade, receita e ticket médio por duração. O detalhamento por nome de plano é redundante.

### Alterações em `src/pages/Relatorios.tsx`

| Mudança | Detalhe |
|---------|---------|
| Remover bloco da Tabela 6 | Remover todo o JSX do card "Tabela 6 — Detalhamento Mensal por Plano" (~linhas 774-860) |
| Remover dados associados | Remover variáveis `allMensalPlans`, `mensalPlanByMonth`, `mensalPlanMonths` e sua lógica de cálculo |
| Sem renumeração | As tabelas 1-5 permanecem como estão |

### Resultado
Relatório final com 5 tabelas:
```text
Tabela 1 — Quantidade por Duração
Tabela 2 — Receita por Duração
Tabela 3 — Ticket Médio por Duração
Tabela 4 — Recorrência Detalhada (qty)  |  Tabela 5 — Receita Recorrência
```

