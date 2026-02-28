

## Corrigir classificação do relatório: usar `duracao` em vez de `condicao_pagamento`

### Problema
A classificação atual usa `condicao_pagamento` para determinar a duração do plano, mas esse campo indica a **forma de parcelamento**, não a duração. "A VISTA" significa pagamento à vista, não necessariamente mensal. O campo correto é `duracao`.

### Nova lógica de classificação

**Tabela 1 — Planos por Duração** (baseado no campo `duracao`):

| Coluna | Regra |
|--------|-------|
| Loja | `duracao = 0` ou `duracao IS NULL` (sem plano) |
| Mensal | `duracao = 1` |
| 4 meses | `duracao = 4` |
| 6 meses | `duracao = 6` |
| 12 meses | `duracao = 12` |
| 18 meses | `duracao = 18` |
| Total | soma |

**Tabela 2 — Recorrência Detalhada** (mantém lógica atual baseada em `condicao_pagamento` contendo "RECORRÊNCIA" + comparação `data_inicio` vs `mes_competencia`):
- Novos: `data_inicio` no mesmo mês que `mes_competencia`
- Recorrência: `data_inicio` em mês anterior

**Tabela 3 — Parcelado vs Recorrência** (nova, complementar):
- Parcelados: `duracao > 1` e `condicao_pagamento` SEM "RECORRÊNCIA"
- Recorrentes processados: `condicao_pagamento` COM "RECORRÊNCIA" e `data_inicio < mes_competencia`

### Drill-down clicável
- Cada número vira botão clicável
- Abre Dialog com tabela dos lançamentos: Cliente, Produto, Plano, Condição Pgto, Valor, Data Início
- Dados já em memória, filtro client-side
- Buscar campos extras na query: `nome_cliente, produto, valor, numero_contrato, duracao`

### Alterações

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Relatorios.tsx` | Refatorar classificação para usar `duracao`; remover PIX; adicionar Loja; adicionar Dialog drill-down; buscar campos extras |

