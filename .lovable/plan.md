
Objetivo
- Corrigir a Tabela 2 (“Recorrência Detalhada”) para contar no mês de processamento, não no mês de venda.

Diagnóstico confirmado
- Hoje a Tabela 2 agrupa por `mes_competencia` (`mc`), então parcelas processadas em fevereiro com `mes_competencia` antigo são exibidas em meses anteriores.
- Resultado: fevereiro fica com “Recorrência = 0” mesmo havendo parcelas processadas no mês.

Implementação (arquivo único)
- Arquivo: `src/pages/Relatorios.tsx`

1) Trocar a chave mensal da Tabela 2
- No bloco `if (isRecorrente(l))`, usar `recMonth = l.data_lancamento?.slice(0, 7)` como mês da linha da Tabela 2.
- Fallback seguro: se `data_lancamento` ausente, usar `mes_competencia`.

2) Manter a regra de classificação Novo vs Recorrência
- `diMonth = data_inicio.slice(0,7)` e `dlMonth = data_lancamento.slice(0,7)`.
- Se `diMonth === dlMonth` => `novo`.
- Caso contrário => `recorrencia`.
- Contadores e arrays de drill-down (`lrMap`) passam a ser indexados por `recMonth`.

3) Separar meses de cada tabela
- Criar `durationMonths = Object.keys(durMap).sort()`.
- Criar `recurrenceMonths = Object.keys(recMap).sort()`.
- Tabela 1 renderiza com `durationMonths`.
- Tabela 2 renderiza com `recurrenceMonths` (não usar mais `months` compartilhado).

4) Corrigir totais da Tabela 2
- `recurrenceTotals` deve iterar `recurrenceMonths` para não perder meses que existam só em `data_lancamento`.

5) Transparência no drill-down da Tabela 2
- Adicionar coluna “Data Lançamento” no modal (e no CSV exportado) para facilitar auditoria visual dos casos processados no mês.

Detalhes técnicos
- Não há alteração de banco, só front-end.
- Campos já disponíveis: `data_inicio`, `data_lancamento`, `mes_competencia`, `condicao_pagamento`.
- Resultado esperado para fevereiro: “Novos” = recorrentes com início em fevereiro; “Recorrência” = parcelas processadas em fevereiro de contratos iniciados antes.
