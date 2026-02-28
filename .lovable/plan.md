

## Tabela `pagamentos_agregadores` com quantidade de clientes e ticket médio

### O que será feito
Expandir a tabela `pagamentos_agregadores` para incluir o campo `quantidade_clientes`, e calcular o ticket médio automaticamente (valor / quantidade_clientes) na exibição.

### Alterações

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | Criar tabela `pagamentos_agregadores` com colunas: `id`, `empresa_id`, `agregador`, `mes_referencia`, `data_recebimento`, `valor`, `quantidade_clientes` (integer), `observacao`, `created_at`. RLS para admin + super_admin |
| `src/pages/Relatorios.tsx` | Query da tabela agregadores; coluna "Agregadores" nas Tabelas 1 (qty = soma `quantidade_clientes`) e 3 (valor = soma `valor`); exibir ticket médio (valor/clientes) nas tabelas; Tabela 5 detalhamento mensal por plano; formulário de lançamento com campo extra "Qtd Clientes" |

### Detalhes

1. **Tabela no banco** — `pagamentos_agregadores`:
   - `quantidade_clientes integer NOT NULL DEFAULT 0` — quantos clientes entraram naquele mês
   - Ticket médio = `valor / quantidade_clientes` (calculado no front, sem coluna extra)
   - RLS: admin da empresa (ALL) + super_admin (ALL)

2. **Coluna "Agregadores" nas Tabelas 1 e 3**:
   - Tabela 1: exibe soma de `quantidade_clientes` por mês
   - Tabela 3: exibe soma de `valor` por mês + ticket médio entre parênteses

3. **Formulário de lançamento** — Dialog com campos:
   - Agregador (Wellhub / Total Pass)
   - Mês referência (YYYY-MM)
   - Data recebimento
   - Valor (R$)
   - Quantidade de clientes
   - Observação (opcional)

4. **Tabela 5 — Detalhamento Mensal por Plano**: planos com `duracao=1`, venda nova, agrupados por nome do plano, com qty e valor por mês

