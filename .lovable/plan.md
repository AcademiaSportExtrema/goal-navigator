

## Filtros e ordenação para admin + devedores na Visão Consultora

### 1. Devedores — Filtros e ordenação para admin

**No `src/pages/Devedores.tsx`:**
- Adicionar filtros dropdown acima da tabela:
  - **Consultor**: Select com lista única de consultores extraída dos dados (ou da tabela `consultoras`)
  - **Status Cobrança**: Select com opções "Todos", "Enviada", "Não enviada"
- Adicionar ordenação clicável nos cabeçalhos da tabela (Nome, Data Vencimento, Valor Parcela, Consultor) — alternar asc/desc ao clicar
- Os filtros são aplicados na query Supabase (server-side) para manter a paginação correta
- Manter o filtro de busca textual existente

### 2. Visão Consultora — Seção de devedores

**No `src/pages/VisaoConsultora.tsx`:**
- Após selecionar uma consultora, adicionar uma seção "Devedores" abaixo dos lançamentos
- Buscar `devedores_parcelas` filtrando por `empresa_id` e `LOWER(consultor) = LOWER(consultora.nome)` usando `.ilike('consultor', consultoraSelecionada.nome)`
- Exibir tabela simples com: Nome, Data Vencimento, Valor Parcela, Status Cobrança
- Mostrar contagem total e indicador visual (badge) de quantos têm cobrança pendente

### Detalhes técnicos
- Nenhuma migração de banco necessária — os dados e RLS já existem
- Admin já tem acesso ALL na tabela `devedores_parcelas`, então a query na Visão Consultora funciona normalmente
- Filtros no Devedores: adicionar estados `filterConsultor`, `filterCobranca`, `sortField`, `sortDir` e aplicá-los na query Supabase
- Na Visão Consultora, usar `.ilike('consultor', consultoraSelecionada.nome)` para matching case-insensitive

