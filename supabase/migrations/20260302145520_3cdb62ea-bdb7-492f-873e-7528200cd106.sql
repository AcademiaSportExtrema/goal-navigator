
DROP POLICY "Consultoras view own devedores_parcelas" ON devedores_parcelas;
DROP POLICY "Consultoras update cobranca own devedores" ON devedores_parcelas;

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
