

## Corrigir valor Wellhub e melhorar formulário de agregadores

### Problema
O valor `18.902` foi salvo como `18.902` (dezoito reais) em vez de `18902` (dezoito mil e novecentos e dois). O parsing `parseFloat(formValor.replace(',', '.'))` não remove pontos de milhar do formato brasileiro.

### Correções em `src/pages/Relatorios.tsx`

| Mudança | Detalhe |
|---------|---------|
| **Corrigir parsing do valor** | Remover pontos de milhar antes de converter: `parseFloat(formValor.replace(/\./g, '').replace(',', '.'))` |
| **Adicionar listagem dos registros** | Exibir tabela com registros existentes dentro do dialog, com botão de excluir para cada um |
| **Mutation de exclusão** | Adicionar `useMutation` para deletar registro por `id` da tabela `pagamentos_agregadores` |

### Dado errado no banco
O registro com id `7c0b6c2e-...` tem `valor: 18.902`. Será necessário corrigir via migration SQL:
```sql
UPDATE pagamentos_agregadores SET valor = 18902 WHERE id = '7c0b6c2e-9c7b-4499-8522-b6b33d8aa960';
```

Assim o usuário não precisa excluir e re-inserir manualmente.

