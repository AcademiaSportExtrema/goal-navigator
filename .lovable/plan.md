

## Separar Recorrente de Parcelado na Tabela 1

### Problema atual
A Tabela 1 classifica apenas por `duracao`, então um plano recorrente de 12 meses e um parcelado de 12 meses caem na mesma coluna "12 meses". São coisas diferentes: recorrente é cobrado mês a mês pelo sistema, parcelado é pago de uma vez em parcelas no cartão.

### Nova lógica de classificação

A classificação agora usa **dois campos**: `duracao` + `condicao_pagamento`.

| Coluna | Regra |
|--------|-------|
| Loja | `duracao = 0` ou `NULL` |
| Mensal | `duracao = 1` e SEM "RECORRÊNCIA" |
| Recorrente | `condicao_pagamento` contém "RECORRÊNCIA" (qualquer duração) |
| 4 meses | `duracao = 4` e SEM "RECORRÊNCIA" |
| 6 meses | `duracao = 6` e SEM "RECORRÊNCIA" |
| 12 meses | `duracao = 12` e SEM "RECORRÊNCIA" |
| 18 meses | `duracao = 18` e SEM "RECORRÊNCIA" |

Exemplo da imagem do usuário:
- "SPORT ASSINATURA OFF" com "EM 12 VEZES - CARTÃO RECORRÊNCIA" → **Recorrente**
- "SPORT 12 OFF" com "EM 12 VEZES" → **12 meses** (parcelado)

### Alterações

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Relatorios.tsx` | Adicionar key `recorrente` ao `DurationKey`; reordenar colunas; `classifyDuration` passa a checar `condicao_pagamento` antes de classificar por duração |

### Impacto nas Tabelas 2 e 3
- Tabela 2 (Recorrência Detalhada: Novos vs Processados) — sem mudança, já usa `condicao_pagamento`
- Tabela 3 (Parcelado vs Recorrente) — pode ser removida ou simplificada, já que a Tabela 1 agora separa corretamente

