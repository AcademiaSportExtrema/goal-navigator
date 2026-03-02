-- Drop existing case-sensitive policy
DROP POLICY IF EXISTS "Consultoras view own lancamentos" ON public.lancamentos;

-- Recreate with LOWER() for case-insensitive matching
CREATE POLICY "Consultoras view own lancamentos"
ON public.lancamentos
FOR SELECT
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND LOWER(consultora_chave) IN (
    SELECT LOWER(consultoras.nome)
    FROM consultoras
    WHERE consultoras.id = get_user_consultora_id(auth.uid())
  )
);