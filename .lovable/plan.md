

## Mudanças no Relatórios

### Resumo
1. Substituir coluna única "Agregadores" por 3 colunas separadas: **Wellhub**, **Total Pass**, **Entuspass**
2. Numerar todas as tabelas (Tabela 1, Tabela 2, etc.)
3. Reorganizar layout: tabelas de quantidade e receita por duração em largura total; recorrência deslocada para baixo

### Dados do Entuspass
O Entuspass já existe nos `lancamentos` com `entra_meta=false`. Vou buscar esses dados automaticamente (sem lançamento manual), fazendo uma segunda query sem o filtro `entra_meta` para pegar os planos "ENTUSPASS RECORRENTE" e "SPORT PASS CÂMARA".

**Wellhub e Total Pass** continuam vindo da tabela `pagamentos_agregadores` (lançamento manual).
**Entuspass** vem automaticamente dos `lancamentos` com `entra_meta=false` e plano contendo "ENTUSPASS".

### Novo layout

```text
┌─────────────────────────────────────────────────────┐
│ Tabela 1 — Quantidade por Duração (full width)      │
│ Colunas: Mês | Loja | Mensal | Rec | 4m | 6m |     │
│          12m | 18m | Outros | Wellhub | TotalPass | │
│          Entuspass | Total                           │
├─────────────────────────────────────────────────────┤
│ Tabela 2 — Receita por Duração (full width)         │
│ Mesmas colunas, com valores em R$                   │
├──────────────────────────┬──────────────────────────┤
│ Tabela 3 — Recorrência   │ Tabela 4 — Receita      │
│ Detalhada (qty)           │ Recorrência (R$)        │
├──────────────────────────┴──────────────────────────┤
│ Tabela 5 — Detalhamento Mensal por Plano            │
└─────────────────────────────────────────────────────┘
```

### Alterações em `src/pages/Relatorios.tsx`

| Mudança | Detalhe |
|---------|---------|
| Nova query | Buscar lancamentos com `entra_meta=false` e plano ILIKE '%ENTUSPASS%' para popular coluna Entuspass automaticamente |
| Agregação por agregador | `agregadorByMonth` passa a ter chaves por agregador (wellhub, totalpass) separadamente, vindo de `pagamentos_agregadores` |
| Agregação Entuspass | Nova agregação dos lancamentos entra_meta=false agrupados por mês, com qty e valor |
| Tabelas 1 e 2 | Remover coluna "Agregadores" genérica; adicionar 3 colunas: Wellhub, Total Pass, Entuspass |
| Títulos | Adicionar numeração: "Tabela 1 — Quantidade por Duração", "Tabela 2 — Receita por Duração", etc. |
| Layout | Tabelas 1 e 2 em full width (sem grid 2/3+1/3); Tabelas 3 e 4 de recorrência ficam abaixo em grid lado a lado |

### Pergunta pendente
"SPORT PASS CÂMARA" aparece nos lancamentos com `entra_meta=false`. Isso deve entrar na coluna Entuspass junto, ou deve ser ignorado/ter coluna própria?

