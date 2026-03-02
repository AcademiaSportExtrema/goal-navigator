

## Correção dos dados importados

### Problema
Os valores na tabela `devedores_parcelas` estão 100x maiores que o correto (ex: `14900` em vez de `149.00`) porque o parser antigo removia o ponto decimal.

### Solução
Executar um UPDATE simples dividindo `valor_parcela` por 100 em todos os registros existentes.

```sql
UPDATE devedores_parcelas SET valor_parcela = valor_parcela / 100;
```

### Sobre "manter apenas o último arquivo"
Isso já é o comportamento atual — a Edge Function faz `DELETE FROM devedores_parcelas WHERE empresa_id = ?` antes de inserir os novos registros. Não precisa de alteração.

### Alteração
- Uma única operação de UPDATE nos dados existentes. Nenhum arquivo de código modificado.

