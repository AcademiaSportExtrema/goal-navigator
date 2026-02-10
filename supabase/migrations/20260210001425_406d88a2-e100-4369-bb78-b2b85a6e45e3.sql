
-- Parte 2: RLS policies usando super_admin (agora já commitado)

-- == EMPRESAS ==
CREATE POLICY "Super admins can manage empresas"
ON public.empresas FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own empresa"
ON public.empresas FOR SELECT
USING (id = get_user_empresa_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));

-- == CONSULTORAS ==
DROP POLICY IF EXISTS "Admins can manage consultoras" ON public.consultoras;
DROP POLICY IF EXISTS "Everyone can view consultoras" ON public.consultoras;

CREATE POLICY "Super admins full access consultoras"
ON public.consultoras FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage own empresa consultoras"
ON public.consultoras FOR ALL
USING (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Users view own empresa consultoras"
ON public.consultoras FOR SELECT
USING (empresa_id = get_user_empresa_id(auth.uid()));

-- == LANCAMENTOS ==
DROP POLICY IF EXISTS "Admins can manage lancamentos" ON public.lancamentos;
DROP POLICY IF EXISTS "Admins can view all lancamentos" ON public.lancamentos;
DROP POLICY IF EXISTS "Consultoras can view their lancamentos" ON public.lancamentos;

CREATE POLICY "Super admins full access lancamentos"
ON public.lancamentos FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage own empresa lancamentos"
ON public.lancamentos FOR ALL
USING (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Consultoras view own lancamentos"
ON public.lancamentos FOR SELECT
USING (empresa_id = get_user_empresa_id(auth.uid()) AND consultora_chave IN (
  SELECT nome FROM public.consultoras WHERE id = get_user_consultora_id(auth.uid())
));

-- == UPLOADS ==
DROP POLICY IF EXISTS "Admins can manage uploads" ON public.uploads;
DROP POLICY IF EXISTS "Admins can view all uploads" ON public.uploads;
DROP POLICY IF EXISTS "Authenticated users can create uploads" ON public.uploads;

CREATE POLICY "Super admins full access uploads"
ON public.uploads FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage own empresa uploads"
ON public.uploads FOR ALL
USING (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can create uploads in own empresa"
ON public.uploads FOR INSERT
WITH CHECK (auth.uid() = user_id AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Users view own empresa uploads"
ON public.uploads FOR SELECT
USING (empresa_id = get_user_empresa_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));

-- == REGRAS_META ==
DROP POLICY IF EXISTS "Admins can manage regras" ON public.regras_meta;
DROP POLICY IF EXISTS "Admins can view regras" ON public.regras_meta;

CREATE POLICY "Super admins full access regras"
ON public.regras_meta FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage own empresa regras"
ON public.regras_meta FOR ALL
USING (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()));

-- == METAS_MENSAIS ==
DROP POLICY IF EXISTS "Admins can manage metas_mensais" ON public.metas_mensais;
DROP POLICY IF EXISTS "Everyone can view metas_mensais" ON public.metas_mensais;

CREATE POLICY "Super admins full access metas_mensais"
ON public.metas_mensais FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage own empresa metas_mensais"
ON public.metas_mensais FOR ALL
USING (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Users view own empresa metas_mensais"
ON public.metas_mensais FOR SELECT
USING (empresa_id = get_user_empresa_id(auth.uid()));

-- == METAS_CONSULTORAS ==
DROP POLICY IF EXISTS "Admins can manage metas_consultoras" ON public.metas_consultoras;
DROP POLICY IF EXISTS "Users can view relevant metas_consultoras" ON public.metas_consultoras;

CREATE POLICY "Super admins full access metas_consultoras"
ON public.metas_consultoras FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage own empresa metas_consultoras"
ON public.metas_consultoras FOR ALL
USING (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Users view own empresa metas_consultoras"
ON public.metas_consultoras FOR SELECT
USING (empresa_id = get_user_empresa_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));

-- == COMISSAO_NIVEIS ==
DROP POLICY IF EXISTS "Admins can manage comissao_niveis" ON public.comissao_niveis;
DROP POLICY IF EXISTS "Everyone can view comissao_niveis" ON public.comissao_niveis;

CREATE POLICY "Super admins full access comissao_niveis"
ON public.comissao_niveis FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage own empresa comissao_niveis"
ON public.comissao_niveis FOR ALL
USING (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Users view own empresa comissao_niveis"
ON public.comissao_niveis FOR SELECT
USING (empresa_id = get_user_empresa_id(auth.uid()));

-- == PERMISSOES_PERFIL ==
DROP POLICY IF EXISTS "Admins can manage permissoes" ON public.permissoes_perfil;
DROP POLICY IF EXISTS "Authenticated users can read permissoes" ON public.permissoes_perfil;

CREATE POLICY "Super admins full access permissoes"
ON public.permissoes_perfil FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage own empresa permissoes"
ON public.permissoes_perfil FOR ALL
USING (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Users read own empresa permissoes"
ON public.permissoes_perfil FOR SELECT
USING (empresa_id = get_user_empresa_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'));

-- == SOLICITACOES_AJUSTE ==
DROP POLICY IF EXISTS "Admins can manage solicitacoes_ajuste" ON public.solicitacoes_ajuste;
DROP POLICY IF EXISTS "Consultoras can create solicitacoes" ON public.solicitacoes_ajuste;
DROP POLICY IF EXISTS "Consultoras can view own solicitacoes" ON public.solicitacoes_ajuste;

CREATE POLICY "Super admins full access solicitacoes"
ON public.solicitacoes_ajuste FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage own empresa solicitacoes"
ON public.solicitacoes_ajuste FOR ALL
USING (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Consultoras create own solicitacoes"
ON public.solicitacoes_ajuste FOR INSERT
WITH CHECK (consultora_id = get_user_consultora_id(auth.uid()) AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Consultoras view own solicitacoes"
ON public.solicitacoes_ajuste FOR SELECT
USING (consultora_id = get_user_consultora_id(auth.uid()) AND empresa_id = get_user_empresa_id(auth.uid()));

-- == USER_ROLES ==
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Super admins full access user_roles"
ON public.user_roles FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage own empresa roles"
ON public.user_roles FOR ALL
USING (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Users view own role"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'super_admin'));
