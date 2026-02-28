

## Adicionar botão Exportar CSV no modal drill-down

### Alteração

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Relatorios.tsx` | Importar `exportToCSV` de `@/lib/csv`, importar `Download` do lucide-react, adicionar botão "Exportar" no rodapé do Dialog ao lado do total |

### Detalhes
- Botão com ícone de download no rodapé do dialog (linha ~476), ao lado do contador de lançamentos
- Ao clicar, chama `exportToCSV` com os itens do drill-down mapeados para colunas legíveis (Cliente, Produto, Plano, Condição Pgto, Duração, Valor, Data Início)
- Nome do arquivo: título do drill-down sanitizado + `.csv`

