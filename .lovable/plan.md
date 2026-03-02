
## Correção: Comparação case-insensitive nas políticas RLS de `devedores_parcelas`

### Problema
O campo `consultor` em `devedores_parcelas` tem nomes em formato capitalizado (ex: "Livia Maysa Honorato Martins"), mas o campo `nome` em `consultoras` está em maiúsculas ("LIVIA MAYSA HONORATO MARTINS"). As RLS policies usam `IN` que é case-sensitive, causando falha na correspondência.

### Solução
Atualizar as duas RLS policies da consultora (`SELECT` e `UPDATE`) para usar `LOWER()` em ambos os lados da comparação.

**Migração SQL:**
```sql
-- Drop existing policies
DROP POLICY "Consultoras view own devedores_parcelas" ON devedores_parcelas;
DROP POLICY "Consultoras update cobranca own devedores" ON devedores_parcelas;

-- Recreate with case-insensitive comparison
CREATE POLICY "Consultoras view own devedores_parcelas"
ON devedores_parcelas FOR SELECT TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND LOWER(consultor) IN (
    SELECT LOWER(nome) FROM consultoras WHERE id = get_user_consultora_id(auth.uid())
  )
);

CREATE POLICY "Consultoras update cobranca own devedores"
ON devedores_parcelas FOR UPDATE TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND LOWER(consultor) IN (
    SELECT LOWER(nome) FROM consultoras WHERE id = get_user_consultora_id(auth.uid())
  )
)
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid())
  AND LOWER(consultor) IN (
    SELECT LOWER(nome) FROM consultoras WHERE id = get_user_consultora_id(auth.uid())
  )
);
```

### Impacto
- Nenhuma alteração de código frontend
- Apenas uma migração de banco de dados
- Corrige o acesso para todas as consultoras, não apenas Livia
