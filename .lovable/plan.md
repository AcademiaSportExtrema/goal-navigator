

## Relatório de Planos por Duração e Recorrência

### Dados disponíveis

Confirmei que o banco de dados já possui todas as informações necessárias na tabela `lancamentos`:
- `condicao_pagamento`: identifica o tipo de plano (A VISTA = mensal, EM 6 VEZES, EM 12 VEZES, Em 18 vezes, RECORRÊNCIA, etc.)
- `data_inicio`: data de início do contrato
- `data_lancamento`: data do processamento/faturamento
- `mes_competencia`: mês de referência
- `forma_pagamento`: identifica PIX, cartão, etc.

A lógica de recorrência funciona assim:
- Se `data_inicio` está no mesmo mês que `mes_competencia` → plano recorrente **novo**
- Se `data_inicio` é de mês anterior → **parcela de recorrência** processada no mês

### Onde colocar

Criar uma nova página **Relatórios** (`/relatorios`) acessível a admins, com link no sidebar. O Dashboard já está carregado de informações; uma página dedicada permite carregar dados de múltiplos meses sem pesar o Dashboard.

### Alterações

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Relatorios.tsx` | Nova página com duas tabelas: (1) Vendas por duração/mês e (2) Recorrente novo vs recorrência processada |
| `src/components/layout/AppSidebar.tsx` | Adicionar link "Relatórios" no menu para admins |
| `src/App.tsx` | Adicionar rota `/relatorios` com ProtectedRoute admin |

### Estrutura da página

**Tabela 1 – Planos por Duração** (igual à imagem, lado esquerdo):
- Linhas: meses disponíveis
- Colunas: recorrente, entuspass, mensal, pix, tres, quatro, seis, doze, dezoito, total mês
- Classificação baseada em `condicao_pagamento`:
  - `RECORRÊNCIA` → recorrente
  - `A VISTA` → mensal
  - `NULL` com `forma_pagamento ILIKE '%PIX%'` → pix
  - `EM 3` → tres, `EM 4` → quatro, `EM 6` → seis, `EM 12 VEZES` (sem recorrência) → doze, `Em 18` → dezoito
  - Planos com "ENTUSPASS" no nome → entuspass
- Linha de totais no rodapé

**Tabela 2 – Recorrência Detalhada** (lado direito da imagem):
- Linhas: meses disponíveis  
- Colunas: mês, recorrente (novos vendidos no mês), plano (parcelas de recorrências de meses anteriores), total planos
- Lógica: para lançamentos com `condicao_pagamento ILIKE '%RECORRÊNCIA%'`:
  - `to_char(data_inicio, 'YYYY-MM') = mes_competencia` → novo
  - `to_char(data_inicio, 'YYYY-MM') < mes_competencia` → recorrência anterior

### Query

Uma única query busca todos os lançamentos com `entra_meta = true`, agrupando client-side por `mes_competencia` para montar as duas tabelas. Usaremos `useMemo` para classificar e computar os totais.

