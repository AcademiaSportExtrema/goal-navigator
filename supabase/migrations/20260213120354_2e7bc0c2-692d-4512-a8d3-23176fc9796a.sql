
-- Remover politica atual
DROP POLICY "Users view own empresa consultoras" ON public.consultoras;

-- Admins veem todas da empresa
CREATE POLICY "Admins view empresa consultoras"
ON public.consultoras FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND empresa_id = get_user_empresa_id(auth.uid())
);

-- Consultoras veem apenas seu proprio registro
CREATE POLICY "Consultoras view own record"
ON public.consultoras FOR SELECT
USING (
  id = get_user_consultora_id(auth.uid())
  AND empresa_id = get_user_empresa_id(auth.uid())
);
