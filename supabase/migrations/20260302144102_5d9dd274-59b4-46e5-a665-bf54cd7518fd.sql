
ALTER TABLE devedores_parcelas ADD COLUMN cobranca_enviada boolean NOT NULL DEFAULT false;

CREATE POLICY "Consultoras update cobranca own devedores"
ON devedores_parcelas FOR UPDATE TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND consultor IN (SELECT nome FROM consultoras WHERE id = get_user_consultora_id(auth.uid()))
)
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid())
  AND consultor IN (SELECT nome FROM consultoras WHERE id = get_user_consultora_id(auth.uid()))
);
