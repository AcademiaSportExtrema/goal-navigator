

## Igualar "Realizado" da Meta Anual à Tabela 2

### Problema identificado
A função RPC `get_realizado_por_mes` soma apenas `entra_meta=true` por `data_lancamento`, sem aplicar os filtros da Tabela 2 nem incluir agregadores. Diferença de ~R$ 35.752 em Fevereiro.

### Solução: Reescrever a RPC para replicar a lógica da Tabela 2

**Migração SQL** — recriar `get_realizado_por_mes` com:

1. **Vendas normais (entra_meta=true)**:
   - Recorrente: agrupar por mês de `data_lancamento`, contar todos
   - Loja (duracao=0 ou null, sem recorrência): agrupar por `mes_competencia`
   - Mensal/Parcelado (1,4,6,12,18m): agrupar por `mes_competencia`, **somente vendas novas** (mês de `data_inicio` = mês de `data_lancamento`)
   - Outros: agrupar por `mes_competencia`

2. **Agregadores manuais** (tabela `pagamentos_agregadores`):
   - Wellhub e Total Pass: somar `valor` agrupado pelo mês de `data_recebimento`

3. **Entuspass/Sport Pass** (lancamentos `entra_meta=false`):
   - Filtrar plano ILIKE `%ENTUSPASS%` ou `%SPORT PASS%`
   - Somar por mês de `data_lancamento`

A nova RPC usará `UNION ALL` para combinar as três fontes e retornar a soma por mês.

### Arquivo alterado
- Migração SQL (nova) — `CREATE OR REPLACE FUNCTION get_realizado_por_mes`
- Nenhuma alteração no front-end (a interface `MetaAnualTable.tsx` já consome o RPC corretamente)

