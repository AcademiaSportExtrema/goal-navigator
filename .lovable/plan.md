

## Alinhar números à direita na tabela de Fechamento de Caixa

Trocar `text-center` por `text-right` em todas as células numéricas do componente `FechamentoCaixaTable.tsx`:

### Alterações em `src/components/relatorios/FechamentoCaixaTable.tsx`

| Local | Mudança |
|-------|---------|
| **TableHead** (linhas 219-226) | Trocar `text-center` por `text-right` nos headers das colunas numéricas (pagamentos, total, f360, dif, total pix, pix f360, dif) |
| **TableBody cells** (linhas 254, 258, 263, 266, 271) | Trocar `text-center` por `text-right` nas células de valores |
| **EditableCell** (linhas 326, 329, 341) | Trocar `text-center` por `text-right` nas células e input do f360 |
| **TableFooter cells** (linhas 283, 287-295) | Trocar `text-center` por `text-right` nas células de totais |

Apenas substituição de classes CSS, sem mudança de lógica.

