

## Adicionar Paginacao na tabela "Vendas do Mes" da Visao Consultora

### Problema

A tabela "Vendas do Mes" na pagina Visao Consultora exibe todos os lancamentos sem paginacao. Com muitas vendas, a lista fica longa e dificil de navegar.

### Solucao

Adicionar paginacao frontend usando o componente `PaginationControls` ja existente, renderizado acima e abaixo da tabela de vendas. Como os dados ja sao carregados todos de uma vez (filtrados por consultora e mes), a paginacao sera apenas no frontend com 20 itens por pagina.

### Detalhes tecnicos

**Arquivo:** `src/pages/VisaoConsultora.tsx`

1. Importar `PaginationControls` de `@/components/PaginationControls`
2. Adicionar estado `currentPage` (resetar para 1 ao trocar de consultora)
3. Definir constante `ITEMS_PER_PAGE = 20`
4. Calcular `totalPages` e fatiar o array `lancamentos` com `.slice()` para exibir apenas a pagina atual
5. Renderizar `<PaginationControls>` antes e depois da `<Table>` dentro do CardContent
6. O titulo do card continua mostrando o total geral: "Vendas do Mes (61)"

**Logica:**
```text
const totalPages = Math.ceil(lancamentos.length / ITEMS_PER_PAGE);
const paginatedLancamentos = lancamentos.slice((currentPage-1)*20, currentPage*20);
```

**Nenhum outro arquivo precisa ser alterado.**

