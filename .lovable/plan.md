

## Tabela de Auditoria do Fechamento de Caixa

### Objetivo
Criar uma tabela diária que cruza os valores do sistema (lancamentos) por forma de pagamento com os valores do f360 (lançados manualmente), exibindo as diferenças.

### Estrutura da tabela (baseada na imagem)
```text
DIAS | Dia Semana | INICIO | FIM | CARTÃO RECORRENTE | PIX INTER | CARTÃO DE CRÉDITO | PIX SICRED CNPJ | DINHEIRO | CARTÃO DE DÉBITO | total | f360 | dif | total pix | pix f360 | dif
```

- Cada linha = 1 dia do mês selecionado
- Colunas de pagamento: soma dos `lancamentos.valor` agrupados por `data_lancamento` e `forma_pagamento`
- `total`: soma de todas as formas de pagamento do dia
- `f360` e `pix f360`: valores manuais inseridos pelo admin
- `dif`: diferença entre total do sistema e f360
- Linha final: totais do mês

### Alterações no banco de dados

**Nova tabela `fechamento_caixa_f360`** para armazenar valores manuais do f360:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| empresa_id | uuid FK | |
| data | date | Dia específico |
| valor_f360 | numeric | Valor total f360 |
| valor_pix_f360 | numeric | Valor PIX f360 |
| created_at | timestamptz | |

- RLS: admins gerenciam da própria empresa, super_admins acesso total
- Constraint unique em (empresa_id, data)

### Alterações no front-end

**Novo componente `src/components/relatorios/FechamentoCaixaTable.tsx`**:
- Recebe mês selecionado, empresaId
- Query de lancamentos filtrados por `data_lancamento` no mês, agrupados por dia e `forma_pagamento`
- Query de `fechamento_caixa_f360` para o mês
- Colunas de pagamento fixas baseadas nos valores existentes no banco
- Células f360 editáveis inline (input que salva com blur/enter via upsert)
- Linha de totais no rodapé
- Exportação CSV

**Em `src/pages/Relatorios.tsx`**:
- Adicionar seletor de mês para a nova tabela
- Renderizar o componente abaixo das tabelas existentes

### Detalhes técnicos
- PIX columns: PIX INTER + PIX SICRED CNPJ somados na coluna "total pix"
- Dias sem lançamentos aparecem com zeros
- Domingos e feriados aparecem normalmente (como na imagem)
- Formatação monetária BRL consistente com o resto do sistema

