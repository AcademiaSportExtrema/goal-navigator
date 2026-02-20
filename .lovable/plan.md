

## Paginacao Aprimorada no Gerencial e Consultoras

### O que falta

1. **Gerencial**: paginacao so aparece em cima da tabela, com apenas botoes de anterior/proximo
2. **Consultoras**: paginacao so aparece embaixo da tabela, tambem apenas anterior/proximo
3. Ambas as paginas precisam de: ir para primeira/ultima pagina, digitar numero da pagina, e exibir a paginacao em cima E embaixo da tabela

### Solucao

Criar um componente reutilizavel `PaginationControls` que sera usado em ambas as paginas, renderizado antes e depois da tabela.

#### Componente `PaginationControls`

**Novo arquivo:** `src/components/PaginationControls.tsx`

O componente recebe:
- `currentPage`, `totalPages`, `totalCount`, `itemsPerPage`, `onPageChange`

Exibe:
- Texto "Mostrando X-Y de Z registros"
- Botao `<<` (primeira pagina)
- Botao `<` (pagina anterior)
- Input numerico para digitar a pagina desejada (com texto "de N")
- Botao `>` (proxima pagina)
- Botao `>>` (ultima pagina)

Layout compacto em uma linha, responsivo.

#### Alteracoes no Gerencial

**Arquivo:** `src/pages/Gerencial.tsx`

- Substituir os botoes simples de paginacao no header por `<PaginationControls>` acima da tabela
- Adicionar `<PaginationControls>` tambem abaixo da tabela (apos o `</Table>`)
- Remover os botoes inline de ChevronLeft/ChevronRight que existem hoje

#### Alteracoes nas Consultoras

**Arquivo:** `src/pages/Consultoras.tsx`

- Substituir o bloco de paginacao existente (linhas 626-641) por `<PaginationControls>`
- Adicionar `<PaginationControls>` tambem acima da tabela (antes do `<Table>`)
- A paginacao deve aparecer sempre que houver mais de 1 pagina

### Detalhes tecnicos

**Componente PaginationControls:**

```text
[Mostrando 1-50 de 216]  [<<] [<] [Pagina: [1] de 5] [>] [>>]
```

- O input de pagina aceita digitacao e navega ao pressionar Enter ou ao sair do campo (onBlur)
- Valida que o numero digitado esta entre 1 e totalPages
- Botoes desabilitados quando na primeira/ultima pagina
- Icones: ChevronsLeft (<<), ChevronLeft (<), ChevronRight (>), ChevronsRight (>>)

**Arquivos alterados:**
- `src/components/PaginationControls.tsx` (novo)
- `src/pages/Gerencial.tsx` (substituir paginacao por componente, adicionar embaixo da tabela)
- `src/pages/Consultoras.tsx` (substituir paginacao por componente, adicionar em cima da tabela)
