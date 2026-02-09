
# Melhorias na Pagina Gerencial - Filtros, Ordenacao e Totais

## Resumo das Alteracoes

Arquivo unico a ser modificado: `src/pages/Gerencial.tsx`

## 1. Filtros Avancados Sempre Visiveis (Acima da Pesquisa)

- Remover o botao toggle de filtros
- Mover a area de filtros avancados para **acima** do campo de pesquisa, sempre visivel
- Adicionar filtro de **periodo** com datas pre-configuradas:
  - Hoje
  - Ultimos 7 dias
  - Ultimos 30 dias
  - Este mes
  - Mes passado
  - Personalizado (com date pickers de/ate)
- O campo de pesquisa fica abaixo dos filtros

## 2. Ordenacao nas Colunas da Tabela

- Adicionar icones de seta (ArrowUpDown) em cada cabecalho de coluna
- Ao clicar no cabecalho, alterna entre:
  - Crescente (seta para cima)
  - Decrescente (seta para baixo)
  - Sem ordenacao (icone neutro)
- Estado controlado por `sortColumn` e `sortDirection`

## 3. Linha de Totais na Tabela

- Adicionar um `TableFooter` com totalizadores para:
  - **Valor**: soma formatada em R$ de todos os registros filtrados
  - **Duracao**: contagem total de itens
- As demais colunas exibem "-" no rodape
- A linha de totais reflete sempre os dados filtrados (nao paginados)

## Detalhes Tecnicos

### Novos estados:
```typescript
const [sortColumn, setSortColumn] = useState<string | null>(null);
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
const [dateRange, setDateRange] = useState<string>('all'); // periodo pre-configurado
const [dateFrom, setDateFrom] = useState<Date | undefined>();
const [dateTo, setDateTo] = useState<Date | undefined>();
```

### Filtro de periodo:
- Select com opcoes pre-definidas (hoje, 7 dias, 30 dias, este mes, mes passado, personalizado)
- Quando "personalizado", exibir dois date pickers (de/ate) usando o componente Calendar/Popover
- Filtra pelo campo `data_lancamento`

### Ordenacao:
- `useMemo` para ordenar `filteredData` antes de paginar
- Cabecalhos clicaveis com cursor pointer e icones indicativos

### Totais:
- `useMemo` para calcular soma de `valor` e contagem de registros filtrados
- Exibido em `TableFooter` com formatacao monetaria

### Layout reorganizado:
```
+------------------------------------------+
| Filtros Avancados (sempre visivel)       |
| [Empresa] [Produto] [Plano] [Resp.Venda]|
| [Situacao] [Forma Pgto] [Periodo: v]    |
| [Data De] [Data Ate] (se personalizado)  |
|          [X Limpar filtros]              |
+------------------------------------------+
| [🔍 Buscar...]        [Exportar CSV]    |
+------------------------------------------+
| Tabela com cabecalhos ordenáveis         |
| ...                                      |
| TOTAIS | - | - | ... | R$ X.XXX | ...   |
+------------------------------------------+
```
