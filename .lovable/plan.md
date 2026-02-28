

## Meta Anual — Nova aba em Relatórios

### Banco de dados

**Nova tabela `meta_anual`:**

| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| empresa_id | uuid NOT NULL | |
| ano | integer NOT NULL | |
| meta_total | numeric NOT NULL | 0 |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

- Unique constraint em `(empresa_id, ano)`
- RLS: admins da empresa + super_admins

**Nova tabela `meta_anual_meses`:**

| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| meta_anual_id | uuid FK → meta_anual.id | |
| mes | integer NOT NULL (1-12) | |
| peso_percent | numeric NOT NULL | 0 |
| empresa_id | uuid NOT NULL | |

- Unique constraint em `(meta_anual_id, mes)`
- RLS: admins da empresa + super_admins
- O valor distribuído por mês = `meta_total * peso_percent / 100`

### Front-end

**Novo componente `src/components/relatorios/MetaAnualTable.tsx`:**
- Recebe `ano` selecionado e `empresaId`
- Exibe header com META MÊS (meta_total / 12 média) e META ANO (meta_total) editáveis
- Tabela com 12 linhas (jan-dez):
  - `%` — peso editável inline (input numérico)
  - `mês` — nome do mês
  - `valor distribuído` — calculado: meta_total × peso / 100
  - `realizado` — soma de `lancamentos.valor` com `entra_meta = true` filtrados por `data_lancamento` no mês/ano correspondente
  - `dif` — valor distribuído − realizado (vermelho se negativo, verde se positivo)
- Linha TOTAL no rodapé com somas
- Linhas extras abaixo: valor médio mensal e % realizado do total
- Botão salvar para persistir pesos e meta total
- Cores amarelas nos headers conforme imagem de referência

**Em `src/pages/Relatorios.tsx`:**
- Adicionar a `MetaAnualTable` como nova seção/tab, com seletor de ano
- Posicionar após o Fechamento de Caixa ou como aba separada via Tabs

**Em `src/components/layout/AppSidebar.tsx`:**
- Nenhuma alteração necessária (fica dentro de Relatórios)

