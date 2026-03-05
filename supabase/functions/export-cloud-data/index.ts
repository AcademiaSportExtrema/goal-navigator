import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAGE_SIZE = 1000;
const AUTH_PAGE_SIZE = 200;
const EXPORTABLE_TABLES = [
  "analise_email_config",
  "analise_ia",
  "audit_logs",
  "coach_diretrizes",
  "comissao_niveis",
  "consultoras",
  "dashboard_visibilidade",
  "devedores_cobranca_historico",
  "devedores_parcelas",
  "empresas",
  "fechamento_caixa_f360",
  "lancamentos",
  "meta_anual",
  "meta_anual_meses",
  "meta_semanal",
  "metas_consultoras",
  "metas_mensais",
  "pagamentos_agregadores",
  "permissoes_perfil",
  "regras_meta",
  "solicitacoes_ajuste",
  "support_messages",
  "support_tickets",
  "system_settings",
  "uploads",
  "user_roles",
] as const;
const SQL_MODES = ["base", "secure", "complete"] as const;

const ENUM_SQL = {
  ajuste_status: `DO $$ BEGIN
  CREATE TYPE public.ajuste_status AS ENUM ('pendente', 'aprovado', 'rejeitado');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  app_role: `DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'consultora', 'super_admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  campo_alvo: `DO $$ BEGIN
  CREATE TYPE public.campo_alvo AS ENUM ('produto', 'plano', 'modalidades', 'forma_pagamento', 'condicao_pagamento', 'empresa', 'situacao_contrato', 'resp_venda', 'resp_recebimento');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  coach_diretriz_tipo: `DO $$ BEGIN
  CREATE TYPE public.coach_diretriz_tipo AS ENUM ('permitido', 'proibido');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  cobranca_evento_tipo: `DO $$ BEGIN
  CREATE TYPE public.cobranca_evento_tipo AS ENUM ('tentativa_contato', 'pagamento_confirmado');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  cobranca_status: `DO $$ BEGIN
  CREATE TYPE public.cobranca_status AS ENUM ('pendente', 'em_contato', 'pago');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  operador_regra: `DO $$ BEGIN
  CREATE TYPE public.operador_regra AS ENUM ('contem', 'igual', 'comeca_com', 'termina_com', 'regex');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  regra_mes: `DO $$ BEGIN
  CREATE TYPE public.regra_mes AS ENUM ('DATA_LANCAMENTO', 'DATA_INICIO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  responsavel_campo: `DO $$ BEGIN
  CREATE TYPE public.responsavel_campo AS ENUM ('resp_venda', 'resp_recebimento');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  ticket_prioridade: `DO $$ BEGIN
  CREATE TYPE public.ticket_prioridade AS ENUM ('baixa', 'media', 'alta', 'urgente');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  ticket_status: `DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM ('aberto', 'em_andamento', 'resolvido', 'fechado');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  upload_status: `DO $$ BEGIN
  CREATE TYPE public.upload_status AS ENUM ('enviado', 'importando', 'concluido', 'erro');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
} as const;

const TABLE_ENUM_DEPENDENCIES: Partial<Record<(typeof EXPORTABLE_TABLES)[number], (keyof typeof ENUM_SQL)[]>> = {
  analise_email_config: [],
  analise_ia: [],
  audit_logs: ["app_role"],
  coach_diretrizes: ["coach_diretriz_tipo"],
  comissao_niveis: [],
  consultoras: [],
  dashboard_visibilidade: [],
  devedores_cobranca_historico: ["cobranca_evento_tipo"],
  devedores_parcelas: ["cobranca_status"],
  empresas: [],
  fechamento_caixa_f360: [],
  lancamentos: [],
  meta_anual: [],
  meta_anual_meses: [],
  meta_semanal: [],
  metas_consultoras: [],
  metas_mensais: [],
  pagamentos_agregadores: [],
  permissoes_perfil: ["app_role"],
  regras_meta: ["campo_alvo", "operador_regra", "responsavel_campo", "regra_mes"],
  solicitacoes_ajuste: ["ajuste_status"],
  support_messages: [],
  support_tickets: ["ticket_prioridade", "ticket_status"],
  system_settings: [],
  uploads: ["upload_status"],
  user_roles: ["app_role"],
};

const TABLE_SQL: Record<(typeof EXPORTABLE_TABLES)[number], string> = {
  empresas: `CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo boolean NOT NULL DEFAULT true,
  trial_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  nome text NOT NULL,
  slug text NOT NULL,
  logo_url text,
  subscription_status text NOT NULL DEFAULT 'active'
);`,
  consultoras: `CREATE TABLE IF NOT EXISTS public.consultoras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  empresa_id uuid NOT NULL,
  nome text NOT NULL,
  email text
);`,
  user_roles: `CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  consultora_id uuid,
  created_at timestamptz DEFAULT now(),
  empresa_id uuid NOT NULL
);`,
  uploads: `CREATE TABLE IF NOT EXISTS public.uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  criado_em timestamptz DEFAULT now(),
  status public.upload_status DEFAULT 'enviado',
  resumo jsonb DEFAULT '{}'::jsonb,
  erros jsonb DEFAULT '[]'::jsonb,
  empresa_id uuid NOT NULL,
  arquivo_path text NOT NULL,
  arquivo_nome text NOT NULL
);`,
  lancamentos: `CREATE TABLE IF NOT EXISTS public.lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL,
  data_cadastro date,
  data_inicio date,
  data_termino date,
  data_lancamento date,
  valor numeric DEFAULT 0,
  entra_meta boolean DEFAULT false,
  pendente_regra boolean DEFAULT true,
  regra_aplicada_id uuid,
  created_at timestamptz DEFAULT now(),
  empresa_id uuid NOT NULL,
  condicao_pagamento text,
  empresa text,
  consultora_chave text,
  mes_competencia text,
  motivo_classificacao text,
  hash_linha text,
  produto text,
  matricula text,
  nome_cliente text,
  resp_venda text,
  resp_recebimento text,
  numero_contrato text,
  duracao text,
  modalidades text,
  turmas text,
  categoria text,
  plano text,
  situacao_contrato text,
  forma_pagamento text
);`,
  regras_meta: `CREATE TABLE IF NOT EXISTS public.regras_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo boolean DEFAULT true,
  prioridade integer NOT NULL,
  campo_alvo public.campo_alvo NOT NULL,
  operador public.operador_regra NOT NULL,
  entra_meta boolean NOT NULL,
  responsavel_campo public.responsavel_campo DEFAULT 'resp_venda',
  regra_mes public.regra_mes DEFAULT 'DATA_LANCAMENTO',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  empresa_id uuid NOT NULL,
  valor text NOT NULL,
  observacao text
);`,
  permissoes_perfil: `CREATE TABLE IF NOT EXISTS public.permissoes_perfil (
  role public.app_role NOT NULL,
  permitido boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  empresa_id uuid NOT NULL,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rota text NOT NULL
);`,
  coach_diretrizes: `CREATE TABLE IF NOT EXISTS public.coach_diretrizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  tipo public.coach_diretriz_tipo NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  texto text NOT NULL
);`,
  analise_email_config: `CREATE TABLE IF NOT EXISTS public.analise_email_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  email text NOT NULL
);`,
  analise_ia: `CREATE TABLE IF NOT EXISTS public.analise_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  upload_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  mes_referencia text NOT NULL,
  conteudo text NOT NULL
);`,
  dashboard_visibilidade: `CREATE TABLE IF NOT EXISTS public.dashboard_visibilidade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  visivel boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  componente text NOT NULL
);`,
  meta_anual: `CREATE TABLE IF NOT EXISTS public.meta_anual (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  ano integer NOT NULL,
  meta_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,
  meta_anual_meses: `CREATE TABLE IF NOT EXISTS public.meta_anual_meses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_anual_id uuid NOT NULL,
  mes integer NOT NULL,
  peso_percent numeric NOT NULL DEFAULT 0,
  empresa_id uuid NOT NULL
);`,
  metas_mensais: `CREATE TABLE IF NOT EXISTS public.metas_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_total numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  empresa_id uuid NOT NULL,
  mes_referencia text NOT NULL
);`,
  meta_semanal: `CREATE TABLE IF NOT EXISTS public.meta_semanal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_mensal_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  semana integer NOT NULL,
  peso_percent numeric NOT NULL DEFAULT 25,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  metas_consultoras: `CREATE TABLE IF NOT EXISTS public.metas_consultoras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_mensal_id uuid NOT NULL,
  consultora_id uuid NOT NULL,
  percentual numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  empresa_id uuid NOT NULL
);`,
  comissao_niveis: `CREATE TABLE IF NOT EXISTS public.comissao_niveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_mensal_id uuid NOT NULL,
  nivel integer NOT NULL,
  de_percent numeric NOT NULL,
  ate_percent numeric NOT NULL,
  comissao_percent numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  empresa_id uuid NOT NULL
);`,
  pagamentos_agregadores: `CREATE TABLE IF NOT EXISTS public.pagamentos_agregadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  data_recebimento date,
  valor numeric NOT NULL DEFAULT 0,
  quantidade_clientes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  agregador text NOT NULL,
  mes_referencia text NOT NULL,
  observacao text
);`,
  fechamento_caixa_f360: `CREATE TABLE IF NOT EXISTS public.fechamento_caixa_f360 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  data date NOT NULL,
  valor_f360 numeric NOT NULL DEFAULT 0,
  valor_pix_f360 numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  audit_logs: `CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid NOT NULL,
  actor_role public.app_role,
  empresa_id uuid,
  target_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  action text NOT NULL,
  target_table text,
  actor_email text
);`,
  support_tickets: `CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  empresa_id uuid NOT NULL,
  created_by uuid NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'aberto',
  prioridade public.ticket_prioridade NOT NULL DEFAULT 'media',
  assigned_to uuid,
  assunto text NOT NULL,
  descricao text NOT NULL
);`,
  support_messages: `CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  ticket_id uuid NOT NULL,
  user_id uuid NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  mensagem text NOT NULL
);`,
  solicitacoes_ajuste: `CREATE TABLE IF NOT EXISTS public.solicitacoes_ajuste (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id uuid NOT NULL,
  consultora_id uuid NOT NULL,
  status public.ajuste_status NOT NULL DEFAULT 'pendente',
  admin_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  empresa_id uuid NOT NULL,
  resp_recebimento_atual text,
  resp_recebimento_novo text NOT NULL,
  justificativa text NOT NULL,
  admin_comentario text,
  numero_contrato text,
  nome_cliente text
);`,
  devedores_parcelas: `CREATE TABLE IF NOT EXISTS public.devedores_parcelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  data_vencimento date,
  valor_parcela numeric DEFAULT 0,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  cobranca_enviada boolean NOT NULL DEFAULT false,
  status_cobranca public.cobranca_status NOT NULL DEFAULT 'pendente',
  ultimo_contato_em timestamptz,
  pago_em timestamptz,
  nome text,
  consultor text,
  contrato text,
  codigo_parcela text,
  parcela text,
  cod_empresa text,
  convenio text,
  em_remessa text,
  arquivo_nome text,
  chave_cobranca text,
  ultima_observacao text
);`,
  devedores_cobranca_historico: `CREATE TABLE IF NOT EXISTS public.devedores_cobranca_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  devedor_parcela_id uuid,
  tipo public.cobranca_evento_tipo NOT NULL,
  contato_em timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  created_by_label text NOT NULL,
  chave_cobranca text NOT NULL,
  observacao text
);`,
  system_settings: `CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  updated_at timestamptz NOT NULL DEFAULT now(),
  value text NOT NULL
);`,
};

const SECURITY_FUNCTIONS_SQL = [
  `CREATE OR REPLACE FUNCTION public.get_user_empresa_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;`,
  `CREATE OR REPLACE FUNCTION public.get_user_consultora_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT consultora_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;`,
  `CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;`,
  `CREATE OR REPLACE FUNCTION public.is_empresa_active(_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.empresas
    WHERE id = _empresa_id
      AND ativo = true
      AND (
        subscription_status = 'active'
        OR (trial_ends_at IS NOT NULL AND trial_ends_at > now())
      )
  )
$$;`,
];

const FULL_FUNCTIONS_SQL = [
  `CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;`,
  `CREATE OR REPLACE FUNCTION public.build_devedor_chave(
  _cod_empresa text,
  _contrato text,
  _codigo_parcela text,
  _parcela text,
  _nome text,
  _data_vencimento date,
  _valor_parcela numeric
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT md5(
    concat_ws(
      '|',
      lower(trim(coalesce(_cod_empresa, ''))),
      lower(trim(coalesce(_contrato, ''))),
      lower(trim(coalesce(_codigo_parcela, ''))),
      lower(trim(coalesce(_parcela, ''))),
      lower(trim(coalesce(_nome, ''))),
      coalesce(to_char(_data_vencimento, 'YYYY-MM-DD'), ''),
      coalesce(trim(to_char(_valor_parcela, 'FM999999999999990D00')), '')
    )
  )
$$;`,
  `CREATE OR REPLACE FUNCTION public.sync_devedores_cobranca_resumo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status_cobranca IS NULL THEN
    NEW.status_cobranca := 'pendente';
  END IF;

  IF NEW.pago_em IS NOT NULL THEN
    NEW.status_cobranca := 'pago';
  ELSIF NEW.ultimo_contato_em IS NOT NULL AND NEW.status_cobranca = 'pendente' THEN
    NEW.status_cobranca := 'em_contato';
  END IF;

  NEW.cobranca_enviada := (
    NEW.status_cobranca IN ('em_contato', 'pago')
    OR NEW.ultimo_contato_em IS NOT NULL
    OR NEW.pago_em IS NOT NULL
  );

  RETURN NEW;
END;
$$;`,
];

const TABLE_POLICY_SQL: Partial<Record<(typeof EXPORTABLE_TABLES)[number], string[]>> = {
  analise_email_config: [
    `DROP POLICY IF EXISTS "Admins manage own empresa analise_email_config" ON public.analise_email_config;
CREATE POLICY "Admins manage own empresa analise_email_config"
ON public.analise_email_config
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Super admins full access analise_email_config" ON public.analise_email_config;
CREATE POLICY "Super admins full access analise_email_config"
ON public.analise_email_config
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  analise_ia: [
    `DROP POLICY IF EXISTS "Admins manage own empresa analise_ia" ON public.analise_ia;
CREATE POLICY "Admins manage own empresa analise_ia"
ON public.analise_ia
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Super admins full access analise_ia" ON public.analise_ia;
CREATE POLICY "Super admins full access analise_ia"
ON public.analise_ia
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  audit_logs: [
    `DROP POLICY IF EXISTS "Admins read own empresa audit_logs" ON public.audit_logs;
CREATE POLICY "Admins read own empresa audit_logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Authenticated insert audit_logs" ON public.audit_logs;
CREATE POLICY "Authenticated insert audit_logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);`,
    `DROP POLICY IF EXISTS "Super admins read all audit_logs" ON public.audit_logs;
CREATE POLICY "Super admins read all audit_logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  coach_diretrizes: [
    `DROP POLICY IF EXISTS "Admins manage own empresa coach_diretrizes" ON public.coach_diretrizes;
CREATE POLICY "Admins manage own empresa coach_diretrizes"
ON public.coach_diretrizes
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Super admins full access coach_diretrizes" ON public.coach_diretrizes;
CREATE POLICY "Super admins full access coach_diretrizes"
ON public.coach_diretrizes
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
    `DROP POLICY IF EXISTS "Users read own empresa coach_diretrizes" ON public.coach_diretrizes;
CREATE POLICY "Users read own empresa coach_diretrizes"
ON public.coach_diretrizes
FOR SELECT
USING (empresa_id = public.get_user_empresa_id(auth.uid()));`,
  ],
  comissao_niveis: [
    `DROP POLICY IF EXISTS "Admins manage own empresa comissao_niveis" ON public.comissao_niveis;
CREATE POLICY "Admins manage own empresa comissao_niveis"
ON public.comissao_niveis
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Super admins full access comissao_niveis" ON public.comissao_niveis;
CREATE POLICY "Super admins full access comissao_niveis"
ON public.comissao_niveis
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
    `DROP POLICY IF EXISTS "Users view own empresa comissao_niveis" ON public.comissao_niveis;
CREATE POLICY "Users view own empresa comissao_niveis"
ON public.comissao_niveis
FOR SELECT
USING (empresa_id = public.get_user_empresa_id(auth.uid()));`,
  ],
  consultoras: [
    `DROP POLICY IF EXISTS "Admins manage own empresa consultoras" ON public.consultoras;
CREATE POLICY "Admins manage own empresa consultoras"
ON public.consultoras
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Admins view empresa consultoras" ON public.consultoras;
CREATE POLICY "Admins view empresa consultoras"
ON public.consultoras
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Consultoras view own record" ON public.consultoras;
CREATE POLICY "Consultoras view own record"
ON public.consultoras
FOR SELECT
USING ((id = public.get_user_consultora_id(auth.uid())) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Super admins full access consultoras" ON public.consultoras;
CREATE POLICY "Super admins full access consultoras"
ON public.consultoras
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  dashboard_visibilidade: [
    `DROP POLICY IF EXISTS "Admins manage own empresa dashboard_visibilidade" ON public.dashboard_visibilidade;
CREATE POLICY "Admins manage own empresa dashboard_visibilidade"
ON public.dashboard_visibilidade
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Super admins full access dashboard_visibilidade" ON public.dashboard_visibilidade;
CREATE POLICY "Super admins full access dashboard_visibilidade"
ON public.dashboard_visibilidade
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
    `DROP POLICY IF EXISTS "Users read own empresa dashboard_visibilidade" ON public.dashboard_visibilidade;
CREATE POLICY "Users read own empresa dashboard_visibilidade"
ON public.dashboard_visibilidade
FOR SELECT
USING (empresa_id = public.get_user_empresa_id(auth.uid()));`,
  ],
  devedores_cobranca_historico: [
    `DROP POLICY IF EXISTS "Admins insert own empresa historico cobranca" ON public.devedores_cobranca_historico;
CREATE POLICY "Admins insert own empresa historico cobranca"
ON public.devedores_cobranca_historico
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND (empresa_id = public.get_user_empresa_id(auth.uid()))
  AND (created_by = auth.uid())
);`,
    `DROP POLICY IF EXISTS "Admins read own empresa historico cobranca" ON public.devedores_cobranca_historico;
CREATE POLICY "Admins read own empresa historico cobranca"
ON public.devedores_cobranca_historico
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND (empresa_id = public.get_user_empresa_id(auth.uid()))
);`,
    `DROP POLICY IF EXISTS "Consultoras insert own historico cobranca" ON public.devedores_cobranca_historico;
CREATE POLICY "Consultoras insert own historico cobranca"
ON public.devedores_cobranca_historico
FOR INSERT
WITH CHECK (
  (empresa_id = public.get_user_empresa_id(auth.uid()))
  AND (created_by = auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.devedores_parcelas dp
    JOIN public.consultoras c
      ON c.id = public.get_user_consultora_id(auth.uid())
     AND c.empresa_id = public.get_user_empresa_id(auth.uid())
    WHERE dp.empresa_id = public.devedores_cobranca_historico.empresa_id
      AND dp.chave_cobranca = public.devedores_cobranca_historico.chave_cobranca
      AND lower(dp.consultor) = lower(c.nome)
  )
);`,
    `DROP POLICY IF EXISTS "Consultoras read own historico cobranca" ON public.devedores_cobranca_historico;
CREATE POLICY "Consultoras read own historico cobranca"
ON public.devedores_cobranca_historico
FOR SELECT
USING (
  (empresa_id = public.get_user_empresa_id(auth.uid()))
  AND EXISTS (
    SELECT 1
    FROM public.devedores_parcelas dp
    JOIN public.consultoras c
      ON c.id = public.get_user_consultora_id(auth.uid())
     AND c.empresa_id = public.get_user_empresa_id(auth.uid())
    WHERE dp.empresa_id = public.devedores_cobranca_historico.empresa_id
      AND dp.chave_cobranca = public.devedores_cobranca_historico.chave_cobranca
      AND lower(dp.consultor) = lower(c.nome)
  )
);`,
    `DROP POLICY IF EXISTS "Super admins full access historico cobranca" ON public.devedores_cobranca_historico;
CREATE POLICY "Super admins full access historico cobranca"
ON public.devedores_cobranca_historico
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  devedores_parcelas: [
    `DROP POLICY IF EXISTS "Admins manage own empresa devedores_parcelas" ON public.devedores_parcelas;
CREATE POLICY "Admins manage own empresa devedores_parcelas"
ON public.devedores_parcelas
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Consultoras view own devedores_parcelas" ON public.devedores_parcelas;
CREATE POLICY "Consultoras view own devedores_parcelas"
ON public.devedores_parcelas
FOR SELECT
USING (
  (empresa_id = public.get_user_empresa_id(auth.uid()))
  AND lower(consultor) IN (
    SELECT lower(c.nome)
    FROM public.consultoras c
    WHERE c.id = public.get_user_consultora_id(auth.uid())
  )
);`,
    `DROP POLICY IF EXISTS "Super admins full access devedores_parcelas" ON public.devedores_parcelas;
CREATE POLICY "Super admins full access devedores_parcelas"
ON public.devedores_parcelas
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  empresas: [
    `DROP POLICY IF EXISTS "Super admins can manage empresas" ON public.empresas;
CREATE POLICY "Super admins can manage empresas"
ON public.empresas
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
    `DROP POLICY IF EXISTS "Users can view own empresa" ON public.empresas;
CREATE POLICY "Users can view own empresa"
ON public.empresas
FOR SELECT
USING ((id = public.get_user_empresa_id(auth.uid())) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  fechamento_caixa_f360: [
    `DROP POLICY IF EXISTS "Admins manage own empresa fechamento_caixa_f360" ON public.fechamento_caixa_f360;
CREATE POLICY "Admins manage own empresa fechamento_caixa_f360"
ON public.fechamento_caixa_f360
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Super admins full access fechamento_caixa_f360" ON public.fechamento_caixa_f360;
CREATE POLICY "Super admins full access fechamento_caixa_f360"
ON public.fechamento_caixa_f360
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  lancamentos: [
    `DROP POLICY IF EXISTS "Admins manage own empresa lancamentos" ON public.lancamentos;
CREATE POLICY "Admins manage own empresa lancamentos"
ON public.lancamentos
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Consultoras view own lancamentos" ON public.lancamentos;
CREATE POLICY "Consultoras view own lancamentos"
ON public.lancamentos
FOR SELECT
USING (
  (empresa_id = public.get_user_empresa_id(auth.uid()))
  AND lower(consultora_chave) IN (
    SELECT lower(c.nome)
    FROM public.consultoras c
    WHERE c.id = public.get_user_consultora_id(auth.uid())
  )
);`,
    `DROP POLICY IF EXISTS "Super admins full access lancamentos" ON public.lancamentos;
CREATE POLICY "Super admins full access lancamentos"
ON public.lancamentos
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  meta_anual: [
    `DROP POLICY IF EXISTS "Admins manage own empresa meta_anual" ON public.meta_anual;
CREATE POLICY "Admins manage own empresa meta_anual"
ON public.meta_anual
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Super admins full access meta_anual" ON public.meta_anual;
CREATE POLICY "Super admins full access meta_anual"
ON public.meta_anual
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  meta_anual_meses: [
    `DROP POLICY IF EXISTS "Admins manage own empresa meta_anual_meses" ON public.meta_anual_meses;
CREATE POLICY "Admins manage own empresa meta_anual_meses"
ON public.meta_anual_meses
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Super admins full access meta_anual_meses" ON public.meta_anual_meses;
CREATE POLICY "Super admins full access meta_anual_meses"
ON public.meta_anual_meses
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  meta_semanal: [
    `DROP POLICY IF EXISTS "Admins manage own empresa meta_semanal" ON public.meta_semanal;
CREATE POLICY "Admins manage own empresa meta_semanal"
ON public.meta_semanal
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Super admins full access meta_semanal" ON public.meta_semanal;
CREATE POLICY "Super admins full access meta_semanal"
ON public.meta_semanal
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
    `DROP POLICY IF EXISTS "Users view own empresa meta_semanal" ON public.meta_semanal;
CREATE POLICY "Users view own empresa meta_semanal"
ON public.meta_semanal
FOR SELECT
USING (empresa_id = public.get_user_empresa_id(auth.uid()));`,
  ],
  metas_consultoras: [
    `DROP POLICY IF EXISTS "Admins manage own empresa metas_consultoras" ON public.metas_consultoras;
CREATE POLICY "Admins manage own empresa metas_consultoras"
ON public.metas_consultoras
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Super admins full access metas_consultoras" ON public.metas_consultoras;
CREATE POLICY "Super admins full access metas_consultoras"
ON public.metas_consultoras
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
    `DROP POLICY IF EXISTS "Users view own empresa metas_consultoras" ON public.metas_consultoras;
CREATE POLICY "Users view own empresa metas_consultoras"
ON public.metas_consultoras
FOR SELECT
USING ((empresa_id = public.get_user_empresa_id(auth.uid())) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  metas_mensais: [
    `DROP POLICY IF EXISTS "Admins manage own empresa metas_mensais" ON public.metas_mensais;
CREATE POLICY "Admins manage own empresa metas_mensais"
ON public.metas_mensais
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Super admins full access metas_mensais" ON public.metas_mensais;
CREATE POLICY "Super admins full access metas_mensais"
ON public.metas_mensais
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
    `DROP POLICY IF EXISTS "Users view own empresa metas_mensais" ON public.metas_mensais;
CREATE POLICY "Users view own empresa metas_mensais"
ON public.metas_mensais
FOR SELECT
USING (empresa_id = public.get_user_empresa_id(auth.uid()));`,
  ],
  pagamentos_agregadores: [
    `DROP POLICY IF EXISTS "Admins manage own empresa pagamentos_agregadores" ON public.pagamentos_agregadores;
CREATE POLICY "Admins manage own empresa pagamentos_agregadores"
ON public.pagamentos_agregadores
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Super admins full access pagamentos_agregadores" ON public.pagamentos_agregadores;
CREATE POLICY "Super admins full access pagamentos_agregadores"
ON public.pagamentos_agregadores
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  permissoes_perfil: [
    `DROP POLICY IF EXISTS "Admins manage own empresa permissoes" ON public.permissoes_perfil;
CREATE POLICY "Admins manage own empresa permissoes"
ON public.permissoes_perfil
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Super admins full access permissoes" ON public.permissoes_perfil;
CREATE POLICY "Super admins full access permissoes"
ON public.permissoes_perfil
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
    `DROP POLICY IF EXISTS "Users read own empresa permissoes" ON public.permissoes_perfil;
CREATE POLICY "Users read own empresa permissoes"
ON public.permissoes_perfil
FOR SELECT
USING ((empresa_id = public.get_user_empresa_id(auth.uid())) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  regras_meta: [
    `DROP POLICY IF EXISTS "Admins manage own empresa regras" ON public.regras_meta;
CREATE POLICY "Admins manage own empresa regras"
ON public.regras_meta
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Super admins full access regras" ON public.regras_meta;
CREATE POLICY "Super admins full access regras"
ON public.regras_meta
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  solicitacoes_ajuste: [
    `DROP POLICY IF EXISTS "Admins manage own empresa solicitacoes" ON public.solicitacoes_ajuste;
CREATE POLICY "Admins manage own empresa solicitacoes"
ON public.solicitacoes_ajuste
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Consultoras create own solicitacoes" ON public.solicitacoes_ajuste;
CREATE POLICY "Consultoras create own solicitacoes"
ON public.solicitacoes_ajuste
FOR INSERT
WITH CHECK ((consultora_id = public.get_user_consultora_id(auth.uid())) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Consultoras view own solicitacoes" ON public.solicitacoes_ajuste;
CREATE POLICY "Consultoras view own solicitacoes"
ON public.solicitacoes_ajuste
FOR SELECT
USING ((consultora_id = public.get_user_consultora_id(auth.uid())) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Super admins full access solicitacoes" ON public.solicitacoes_ajuste;
CREATE POLICY "Super admins full access solicitacoes"
ON public.solicitacoes_ajuste
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  support_messages: [
    `DROP POLICY IF EXISTS "Admins create messages on own tickets" ON public.support_messages;
CREATE POLICY "Admins create messages on own tickets"
ON public.support_messages
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND (user_id = auth.uid())
  AND (is_internal = false)
  AND EXISTS (
    SELECT 1
    FROM public.support_tickets t
    WHERE t.id = public.support_messages.ticket_id
      AND t.empresa_id = public.get_user_empresa_id(auth.uid())
  )
);`,
    `DROP POLICY IF EXISTS "Admins read own empresa messages" ON public.support_messages;
CREATE POLICY "Admins read own empresa messages"
ON public.support_messages
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND (is_internal = false)
  AND EXISTS (
    SELECT 1
    FROM public.support_tickets t
    WHERE t.id = public.support_messages.ticket_id
      AND t.empresa_id = public.get_user_empresa_id(auth.uid())
  )
);`,
    `DROP POLICY IF EXISTS "Super admins full access support_messages" ON public.support_messages;
CREATE POLICY "Super admins full access support_messages"
ON public.support_messages
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  support_tickets: [
    `DROP POLICY IF EXISTS "Admins create own empresa tickets" ON public.support_tickets;
CREATE POLICY "Admins create own empresa tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND (empresa_id = public.get_user_empresa_id(auth.uid()))
  AND (created_by = auth.uid())
);`,
    `DROP POLICY IF EXISTS "Admins read own empresa tickets" ON public.support_tickets;
CREATE POLICY "Admins read own empresa tickets"
ON public.support_tickets
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Admins update own empresa tickets" ON public.support_tickets;
CREATE POLICY "Admins update own empresa tickets"
ON public.support_tickets
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Super admins full access support_tickets" ON public.support_tickets;
CREATE POLICY "Super admins full access support_tickets"
ON public.support_tickets
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  system_settings: [
    `DROP POLICY IF EXISTS "Super admins full access" ON public.system_settings;
CREATE POLICY "Super admins full access"
ON public.system_settings
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  uploads: [
    `DROP POLICY IF EXISTS "Admins manage own empresa uploads" ON public.uploads;
CREATE POLICY "Admins manage own empresa uploads"
ON public.uploads
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Super admins full access uploads" ON public.uploads;
CREATE POLICY "Super admins full access uploads"
ON public.uploads
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
    `DROP POLICY IF EXISTS "Users can create uploads in own empresa" ON public.uploads;
CREATE POLICY "Users can create uploads in own empresa"
ON public.uploads
FOR INSERT
WITH CHECK ((auth.uid() = user_id) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Users view own empresa uploads" ON public.uploads;
CREATE POLICY "Users view own empresa uploads"
ON public.uploads
FOR SELECT
USING ((empresa_id = public.get_user_empresa_id(auth.uid())) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
  user_roles: [
    `DROP POLICY IF EXISTS "Admins manage own empresa roles" ON public.user_roles;
CREATE POLICY "Admins manage own empresa roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND (empresa_id = public.get_user_empresa_id(auth.uid())));`,
    `DROP POLICY IF EXISTS "Super admins full access user_roles" ON public.user_roles;
CREATE POLICY "Super admins full access user_roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
    `DROP POLICY IF EXISTS "Users view own role" ON public.user_roles;
CREATE POLICY "Users view own role"
ON public.user_roles
FOR SELECT
USING ((user_id = auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));`,
  ],
};

const TABLE_FK_SQL: Partial<Record<(typeof EXPORTABLE_TABLES)[number], string[]>> = {
  analise_email_config: [
    `ALTER TABLE public.analise_email_config DROP CONSTRAINT IF EXISTS analise_email_config_empresa_id_fkey;
ALTER TABLE public.analise_email_config ADD CONSTRAINT analise_email_config_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
  ],
  analise_ia: [
    `ALTER TABLE public.analise_ia DROP CONSTRAINT IF EXISTS analise_ia_empresa_id_fkey;
ALTER TABLE public.analise_ia ADD CONSTRAINT analise_ia_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
    `ALTER TABLE public.analise_ia DROP CONSTRAINT IF EXISTS analise_ia_upload_id_fkey;
ALTER TABLE public.analise_ia ADD CONSTRAINT analise_ia_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES public.uploads(id);`,
  ],
  audit_logs: [
    `ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_empresa_id_fkey;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
  ],
  coach_diretrizes: [
    `ALTER TABLE public.coach_diretrizes DROP CONSTRAINT IF EXISTS coach_diretrizes_empresa_id_fkey;
ALTER TABLE public.coach_diretrizes ADD CONSTRAINT coach_diretrizes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
  ],
  comissao_niveis: [
    `ALTER TABLE public.comissao_niveis DROP CONSTRAINT IF EXISTS comissao_niveis_empresa_id_fkey;
ALTER TABLE public.comissao_niveis ADD CONSTRAINT comissao_niveis_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
    `ALTER TABLE public.comissao_niveis DROP CONSTRAINT IF EXISTS comissao_niveis_meta_mensal_id_fkey;
ALTER TABLE public.comissao_niveis ADD CONSTRAINT comissao_niveis_meta_mensal_id_fkey FOREIGN KEY (meta_mensal_id) REFERENCES public.metas_mensais(id);`,
  ],
  consultoras: [
    `ALTER TABLE public.consultoras DROP CONSTRAINT IF EXISTS consultoras_empresa_id_fkey;
ALTER TABLE public.consultoras ADD CONSTRAINT consultoras_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
  ],
  dashboard_visibilidade: [
    `ALTER TABLE public.dashboard_visibilidade DROP CONSTRAINT IF EXISTS dashboard_visibilidade_empresa_id_fkey;
ALTER TABLE public.dashboard_visibilidade ADD CONSTRAINT dashboard_visibilidade_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
  ],
  devedores_cobranca_historico: [
    `ALTER TABLE public.devedores_cobranca_historico DROP CONSTRAINT IF EXISTS devedores_cobranca_historico_devedor_parcela_id_fkey;
ALTER TABLE public.devedores_cobranca_historico ADD CONSTRAINT devedores_cobranca_historico_devedor_parcela_id_fkey FOREIGN KEY (devedor_parcela_id) REFERENCES public.devedores_parcelas(id);`,
    `ALTER TABLE public.devedores_cobranca_historico DROP CONSTRAINT IF EXISTS devedores_cobranca_historico_empresa_id_fkey;
ALTER TABLE public.devedores_cobranca_historico ADD CONSTRAINT devedores_cobranca_historico_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
  ],
  devedores_parcelas: [
    `ALTER TABLE public.devedores_parcelas DROP CONSTRAINT IF EXISTS devedores_parcelas_empresa_id_fkey;
ALTER TABLE public.devedores_parcelas ADD CONSTRAINT devedores_parcelas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
  ],
  fechamento_caixa_f360: [
    `ALTER TABLE public.fechamento_caixa_f360 DROP CONSTRAINT IF EXISTS fechamento_caixa_f360_empresa_id_fkey;
ALTER TABLE public.fechamento_caixa_f360 ADD CONSTRAINT fechamento_caixa_f360_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
  ],
  lancamentos: [
    `ALTER TABLE public.lancamentos DROP CONSTRAINT IF EXISTS fk_lancamentos_regra;
ALTER TABLE public.lancamentos ADD CONSTRAINT fk_lancamentos_regra FOREIGN KEY (regra_aplicada_id) REFERENCES public.regras_meta(id);`,
    `ALTER TABLE public.lancamentos DROP CONSTRAINT IF EXISTS lancamentos_empresa_id_fkey;
ALTER TABLE public.lancamentos ADD CONSTRAINT lancamentos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
    `ALTER TABLE public.lancamentos DROP CONSTRAINT IF EXISTS lancamentos_upload_id_fkey;
ALTER TABLE public.lancamentos ADD CONSTRAINT lancamentos_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES public.uploads(id);`,
  ],
  meta_anual: [
    `ALTER TABLE public.meta_anual DROP CONSTRAINT IF EXISTS meta_anual_empresa_id_fkey;
ALTER TABLE public.meta_anual ADD CONSTRAINT meta_anual_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
  ],
  meta_anual_meses: [
    `ALTER TABLE public.meta_anual_meses DROP CONSTRAINT IF EXISTS meta_anual_meses_empresa_id_fkey;
ALTER TABLE public.meta_anual_meses ADD CONSTRAINT meta_anual_meses_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
    `ALTER TABLE public.meta_anual_meses DROP CONSTRAINT IF EXISTS meta_anual_meses_meta_anual_id_fkey;
ALTER TABLE public.meta_anual_meses ADD CONSTRAINT meta_anual_meses_meta_anual_id_fkey FOREIGN KEY (meta_anual_id) REFERENCES public.meta_anual(id);`,
  ],
  meta_semanal: [
    `ALTER TABLE public.meta_semanal DROP CONSTRAINT IF EXISTS meta_semanal_meta_mensal_id_fkey;
ALTER TABLE public.meta_semanal ADD CONSTRAINT meta_semanal_meta_mensal_id_fkey FOREIGN KEY (meta_mensal_id) REFERENCES public.metas_mensais(id);`,
  ],
  metas_consultoras: [
    `ALTER TABLE public.metas_consultoras DROP CONSTRAINT IF EXISTS metas_consultoras_consultora_id_fkey;
ALTER TABLE public.metas_consultoras ADD CONSTRAINT metas_consultoras_consultora_id_fkey FOREIGN KEY (consultora_id) REFERENCES public.consultoras(id);`,
    `ALTER TABLE public.metas_consultoras DROP CONSTRAINT IF EXISTS metas_consultoras_empresa_id_fkey;
ALTER TABLE public.metas_consultoras ADD CONSTRAINT metas_consultoras_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
    `ALTER TABLE public.metas_consultoras DROP CONSTRAINT IF EXISTS metas_consultoras_meta_mensal_id_fkey;
ALTER TABLE public.metas_consultoras ADD CONSTRAINT metas_consultoras_meta_mensal_id_fkey FOREIGN KEY (meta_mensal_id) REFERENCES public.metas_mensais(id);`,
  ],
  metas_mensais: [
    `ALTER TABLE public.metas_mensais DROP CONSTRAINT IF EXISTS metas_mensais_empresa_id_fkey;
ALTER TABLE public.metas_mensais ADD CONSTRAINT metas_mensais_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
  ],
  permissoes_perfil: [
    `ALTER TABLE public.permissoes_perfil DROP CONSTRAINT IF EXISTS permissoes_perfil_empresa_id_fkey;
ALTER TABLE public.permissoes_perfil ADD CONSTRAINT permissoes_perfil_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
  ],
  regras_meta: [
    `ALTER TABLE public.regras_meta DROP CONSTRAINT IF EXISTS regras_meta_empresa_id_fkey;
ALTER TABLE public.regras_meta ADD CONSTRAINT regras_meta_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
  ],
  solicitacoes_ajuste: [
    `ALTER TABLE public.solicitacoes_ajuste DROP CONSTRAINT IF EXISTS solicitacoes_ajuste_consultora_id_fkey;
ALTER TABLE public.solicitacoes_ajuste ADD CONSTRAINT solicitacoes_ajuste_consultora_id_fkey FOREIGN KEY (consultora_id) REFERENCES public.consultoras(id);`,
    `ALTER TABLE public.solicitacoes_ajuste DROP CONSTRAINT IF EXISTS solicitacoes_ajuste_empresa_id_fkey;
ALTER TABLE public.solicitacoes_ajuste ADD CONSTRAINT solicitacoes_ajuste_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
    `ALTER TABLE public.solicitacoes_ajuste DROP CONSTRAINT IF EXISTS solicitacoes_ajuste_lancamento_id_fkey;
ALTER TABLE public.solicitacoes_ajuste ADD CONSTRAINT solicitacoes_ajuste_lancamento_id_fkey FOREIGN KEY (lancamento_id) REFERENCES public.lancamentos(id);`,
  ],
  support_messages: [
    `ALTER TABLE public.support_messages DROP CONSTRAINT IF EXISTS support_messages_ticket_id_fkey;
ALTER TABLE public.support_messages ADD CONSTRAINT support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id);`,
  ],
  support_tickets: [
    `ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_empresa_id_fkey;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
  ],
  uploads: [
    `ALTER TABLE public.uploads DROP CONSTRAINT IF EXISTS uploads_empresa_id_fkey;
ALTER TABLE public.uploads ADD CONSTRAINT uploads_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
  ],
  user_roles: [
    `ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS fk_user_roles_consultora;
ALTER TABLE public.user_roles ADD CONSTRAINT fk_user_roles_consultora FOREIGN KEY (consultora_id) REFERENCES public.consultoras(id);`,
    `ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_empresa_id_fkey;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);`,
  ],
};

const TABLE_INDEX_SQL: Partial<Record<(typeof EXPORTABLE_TABLES)[number], string[]>> = {
  analise_email_config: [
    `CREATE INDEX IF NOT EXISTS idx_analise_email_config_empresa_id ON public.analise_email_config (empresa_id);`,
  ],
  analise_ia: [
    `CREATE INDEX IF NOT EXISTS idx_analise_ia_empresa_id ON public.analise_ia (empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_analise_ia_upload_id ON public.analise_ia (upload_id);`,
  ],
  audit_logs: [
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_empresa_id ON public.audit_logs (empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs (actor_id);`,
  ],
  coach_diretrizes: [
    `CREATE INDEX IF NOT EXISTS idx_coach_diretrizes_empresa_id ON public.coach_diretrizes (empresa_id);`,
  ],
  comissao_niveis: [
    `CREATE INDEX IF NOT EXISTS idx_comissao_niveis_empresa_id ON public.comissao_niveis (empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_comissao_niveis_meta_mensal_id ON public.comissao_niveis (meta_mensal_id);`,
  ],
  consultoras: [
    `CREATE INDEX IF NOT EXISTS idx_consultoras_empresa_id ON public.consultoras (empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_consultoras_email ON public.consultoras (email);`,
  ],
  dashboard_visibilidade: [
    `CREATE INDEX IF NOT EXISTS idx_dashboard_visibilidade_empresa_id ON public.dashboard_visibilidade (empresa_id);`,
  ],
  devedores_cobranca_historico: [
    `CREATE INDEX IF NOT EXISTS idx_devedores_cobranca_historico_empresa_id ON public.devedores_cobranca_historico (empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_devedores_cobranca_historico_chave ON public.devedores_cobranca_historico (chave_cobranca);`,
  ],
  devedores_parcelas: [
    `CREATE INDEX IF NOT EXISTS idx_devedores_parcelas_empresa_id ON public.devedores_parcelas (empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_devedores_parcelas_chave ON public.devedores_parcelas (chave_cobranca);`,
  ],
  fechamento_caixa_f360: [
    `CREATE INDEX IF NOT EXISTS idx_fechamento_caixa_f360_empresa_id ON public.fechamento_caixa_f360 (empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_fechamento_caixa_f360_data ON public.fechamento_caixa_f360 (data);`,
  ],
  lancamentos: [
    `CREATE INDEX IF NOT EXISTS idx_lancamentos_empresa_id ON public.lancamentos (empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_lancamentos_upload_id ON public.lancamentos (upload_id);`,
    `CREATE INDEX IF NOT EXISTS idx_lancamentos_data_lancamento ON public.lancamentos (data_lancamento);`,
    `CREATE INDEX IF NOT EXISTS idx_lancamentos_consultora_chave ON public.lancamentos (consultora_chave);`,
  ],
  meta_anual: [
    `CREATE INDEX IF NOT EXISTS idx_meta_anual_empresa_id ON public.meta_anual (empresa_id);`,
  ],
  meta_anual_meses: [
    `CREATE INDEX IF NOT EXISTS idx_meta_anual_meses_empresa_id ON public.meta_anual_meses (empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_meta_anual_meses_meta_anual_id ON public.meta_anual_meses (meta_anual_id);`,
  ],
  meta_semanal: [
    `CREATE INDEX IF NOT EXISTS idx_meta_semanal_empresa_id ON public.meta_semanal (empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_meta_semanal_meta_mensal_id ON public.meta_semanal (meta_mensal_id);`,
  ],
  metas_consultoras: [
    `CREATE INDEX IF NOT EXISTS idx_metas_consultoras_empresa_id ON public.metas_consultoras (empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_metas_consultoras_meta_mensal_id ON public.metas_consultoras (meta_mensal_id);`,
    `CREATE INDEX IF NOT EXISTS idx_metas_consultoras_consultora_id ON public.metas_consultoras (consultora_id);`,
  ],
  metas_mensais: [
    `CREATE INDEX IF NOT EXISTS idx_metas_mensais_empresa_id ON public.metas_mensais (empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_metas_mensais_mes_referencia ON public.metas_mensais (mes_referencia);`,
  ],
  pagamentos_agregadores: [
    `CREATE INDEX IF NOT EXISTS idx_pagamentos_agregadores_empresa_id ON public.pagamentos_agregadores (empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_pagamentos_agregadores_mes_referencia ON public.pagamentos_agregadores (mes_referencia);`,
  ],
  permissoes_perfil: [
    `CREATE INDEX IF NOT EXISTS idx_permissoes_perfil_empresa_id ON public.permissoes_perfil (empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_permissoes_perfil_role ON public.permissoes_perfil (role);`,
  ],
  regras_meta: [
    `CREATE INDEX IF NOT EXISTS idx_regras_meta_empresa_id ON public.regras_meta (empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_regras_meta_prioridade ON public.regras_meta (prioridade);`,
  ],
  solicitacoes_ajuste: [
    `CREATE INDEX IF NOT EXISTS idx_solicitacoes_ajuste_empresa_id ON public.solicitacoes_ajuste (empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_solicitacoes_ajuste_consultora_id ON public.solicitacoes_ajuste (consultora_id);`,
    `CREATE INDEX IF NOT EXISTS idx_solicitacoes_ajuste_lancamento_id ON public.solicitacoes_ajuste (lancamento_id);`,
  ],
  support_messages: [
    `CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages (ticket_id);`,
    `CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON public.support_messages (user_id);`,
  ],
  support_tickets: [
    `CREATE INDEX IF NOT EXISTS idx_support_tickets_empresa_id ON public.support_tickets (empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by ON public.support_tickets (created_by);`,
  ],
  uploads: [
    `CREATE INDEX IF NOT EXISTS idx_uploads_empresa_id ON public.uploads (empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON public.uploads (user_id);`,
  ],
  user_roles: [
    `CREATE INDEX IF NOT EXISTS idx_user_roles_empresa_id ON public.user_roles (empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_role_unique ON public.user_roles (user_id, role);`,
  ],
};

type SchemaAction = "schema-table" | "schema-all";
type ExportAction =
  | "bundle"
  | "database-all"
  | "database-table"
  | "users"
  | "storages"
  | "logs"
  | SchemaAction;
type ExportTable = (typeof EXPORTABLE_TABLES)[number];
type SqlMode = (typeof SQL_MODES)[number];
type JsonRow = Record<string, unknown>;

const tableHasEmpresaId = (table: ExportTable) =>
  !["empresas", "support_messages", "system_settings"].includes(table);

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const sanitizeFilenamePart = (value: string | null) =>
  (value || "all")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "all";

const extractLogoPath = (logoUrl: string | null) => {
  if (!logoUrl) return "";

  try {
    const url = new URL(logoUrl);
    const marker = "/object/public/logos/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex >= 0) {
      return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    }
    return decodeURIComponent(url.pathname.split("/").slice(-2).join("/"));
  } catch {
    return logoUrl;
  }
};

const getSchemaTables = (table?: ExportTable) => (table ? [table] : [...EXPORTABLE_TABLES]);

const buildEnumSql = (tables: ExportTable[]) => {
  const enumNames = [...new Set(tables.flatMap((tableName) => TABLE_ENUM_DEPENDENCIES[tableName] || []))];
  return enumNames.map((enumName) => ENUM_SQL[enumName]).join("\n\n");
};

const buildTableSql = (tables: ExportTable[]) => tables.map((tableName) => TABLE_SQL[tableName]).join("\n\n");

const buildRlsSql = (tables: ExportTable[]) =>
  tables.map((tableName) => `ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;`).join("\n");

const buildPoliciesSql = (tables: ExportTable[]) =>
  tables.flatMap((tableName) => TABLE_POLICY_SQL[tableName] || []).join("\n\n");

const buildForeignKeysSql = (tables: ExportTable[]) =>
  tables.flatMap((tableName) => TABLE_FK_SQL[tableName] || []).join("\n\n");

const buildIndexesSql = (tables: ExportTable[]) =>
  tables.flatMap((tableName) => TABLE_INDEX_SQL[tableName] || []).join("\n\n");

const buildBaseSchemaSql = (table?: ExportTable) => {
  const tables = getSchemaTables(table);
  const enumSql = buildEnumSql(tables);
  const tableSql = buildTableSql(tables);

  return [
    "-- SQL base das tabelas públicas do sistema",
    "-- Inclui extensões, enums e CREATE TABLE.",
    "-- Não inclui RLS, policies, funções auxiliares, índices ou chaves estrangeiras.",
    'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
    enumSql,
    tableSql,
  ]
    .filter(Boolean)
    .join("\n\n");
};

const buildSecureSchemaSql = (table?: ExportTable) => {
  const tables = getSchemaTables(table);
  const enumSql = buildEnumSql(tables);
  const tableSql = buildTableSql(tables);
  const rlsSql = buildRlsSql(tables);
  const policiesSql = buildPoliciesSql(tables);

  return [
    "-- SQL seguro das tabelas públicas do sistema",
    "-- Inclui extensões, enums, CREATE TABLE, funções auxiliares de auth/RLS, ENABLE ROW LEVEL SECURITY e policies.",
    "-- Recomendado para migrar a estrutura sem deixar as tabelas expostas via Data API.",
    'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
    "-- 1. Enums",
    enumSql,
    "-- 2. Tabelas",
    tableSql,
    "-- 3. Funções auxiliares de segurança",
    SECURITY_FUNCTIONS_SQL.join("\n\n"),
    "-- 4. Row Level Security",
    rlsSql,
    "-- 5. Policies",
    policiesSql,
  ]
    .filter(Boolean)
    .join("\n\n");
};

const buildCompleteSchemaSql = (table?: ExportTable) => {
  const tables = getSchemaTables(table);
  const enumSql = buildEnumSql(tables);
  const tableSql = buildTableSql(tables);
  const rlsSql = buildRlsSql(tables);
  const policiesSql = buildPoliciesSql(tables);
  const foreignKeysSql = buildForeignKeysSql(tables);
  const indexesSql = buildIndexesSql(tables);

  return [
    "-- SQL completo das tabelas públicas do sistema",
    "-- Inclui extensões, enums, CREATE TABLE, funções auxiliares, RLS, policies, índices recomendados e FKs mapeadas.",
    "-- Observação: ao exportar uma única tabela, as FKs podem depender da existência prévia das tabelas relacionadas.",
    'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
    "-- 1. Enums",
    enumSql,
    "-- 2. Tabelas",
    tableSql,
    "-- 3. Funções auxiliares de segurança",
    SECURITY_FUNCTIONS_SQL.join("\n\n"),
    "-- 4. Funções utilitárias adicionais",
    FULL_FUNCTIONS_SQL.join("\n\n"),
    "-- 5. Row Level Security",
    rlsSql,
    "-- 6. Policies",
    policiesSql,
    "-- 7. Índices recomendados",
    indexesSql,
    "-- 8. Chaves estrangeiras mapeadas",
    foreignKeysSql,
  ]
    .filter(Boolean)
    .join("\n\n");
};

const buildSchemaSql = (mode: SqlMode, table?: ExportTable) => {
  if (mode === "base") return buildBaseSchemaSql(table);
  if (mode === "complete") return buildCompleteSchemaSql(table);
  return buildSecureSchemaSql(table);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Configuração do backend incompleta");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
      error: callerError,
    } = await supabaseAdmin.auth.getUser(token);

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as ExportAction | undefined;
    const requestedTable = body.table as ExportTable | undefined;
    const requestedEmpresaId = typeof body.empresa_id === "string" && body.empresa_id.trim() ? body.empresa_id : null;
    const requestedMode = typeof body.mode === "string" ? body.mode : "secure";
    const schemaMode = SQL_MODES.includes(requestedMode as SqlMode) ? (requestedMode as SqlMode) : "secure";

    if (!action) {
      return new Response(JSON.stringify({ error: "Ação de exportação obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: isSuperAdmin }, { data: isAdmin }] = await Promise.all([
      supabaseAdmin.rpc("has_role", { _user_id: caller.id, _role: "super_admin" }),
      supabaseAdmin.rpc("has_role", { _user_id: caller.id, _role: "admin" }),
    ]);

    if (!isSuperAdmin && !isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso restrito a administradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((action === "schema-table" || action === "schema-all") && requestedTable && !EXPORTABLE_TABLES.includes(requestedTable)) {
      return new Response(JSON.stringify({ error: "Tabela inválida para SQL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "schema-table") {
      if (!requestedTable) {
        return new Response(JSON.stringify({ error: "Tabela obrigatória para gerar SQL" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          filename: `${requestedTable}_${schemaMode}.sql`,
          sql: buildSchemaSql(schemaMode, requestedTable),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "schema-all") {
      return new Response(
        JSON.stringify({
          filename: `schema_public_${schemaMode}.sql`,
          sql: buildSchemaSql(schemaMode),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: ownEmpresaId } = await supabaseAdmin.rpc("get_user_empresa_id", { _user_id: caller.id });
    if (!isSuperAdmin && !ownEmpresaId) {
      return new Response(JSON.stringify({ error: "Administrador sem empresa vinculada" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scopeEmpresaId = isSuperAdmin ? requestedEmpresaId : ownEmpresaId;
    const filenameScope = sanitizeFilenamePart(scopeEmpresaId);

    const fetchPaginated = async (buildQuery: (from: number, to: number) => any) => {
      const rows: JsonRow[] = [];
      let from = 0;

      while (true) {
        const to = from + PAGE_SIZE - 1;
        const { data, error } = await buildQuery(from, to);

        if (error) throw error;

        const pageRows = (data || []) as JsonRow[];
        rows.push(...pageRows);

        if (pageRows.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      return rows;
    };

    const fetchSupportMessageRows = async (empresaId: string | null) => {
      if (!empresaId) {
        return fetchPaginated((from, to) => supabaseAdmin.from("support_messages").select("*").range(from, to));
      }

      const ticketRows = await fetchPaginated((from, to) =>
        supabaseAdmin.from("support_tickets").select("id").eq("empresa_id", empresaId).range(from, to)
      );

      const ticketIds = ticketRows.map((row) => row.id).filter(Boolean) as string[];
      if (ticketIds.length === 0) return [];

      const messageRows: JsonRow[] = [];
      for (const ticketChunk of chunk(ticketIds, 100)) {
        const rows = await fetchPaginated((from, to) =>
          supabaseAdmin.from("support_messages").select("*").in("ticket_id", ticketChunk).range(from, to)
        );
        messageRows.push(...rows);
      }

      return messageRows;
    };

    const fetchTableRows = async (table: ExportTable, empresaId: string | null): Promise<JsonRow[]> => {
      if (table === "system_settings" && empresaId) {
        return [];
      }

      if (table === "support_messages") {
        return fetchSupportMessageRows(empresaId);
      }

      return fetchPaginated((from, to) => {
        let query = supabaseAdmin.from(table).select("*").range(from, to);

        if (empresaId) {
          if (table === "empresas") {
            query = query.eq("id", empresaId);
          } else if (tableHasEmpresaId(table)) {
            query = query.eq("empresa_id", empresaId);
          }
        }

        return query;
      });
    };

    const buildDatabaseFiles = async () => {
      const tablesToExport = requestedTable ? [requestedTable] : [...EXPORTABLE_TABLES];
      const files: { filename: string; rows: JsonRow[] }[] = [];

      for (const table of tablesToExport) {
        const rows = await fetchTableRows(table, scopeEmpresaId);
        if (rows.length === 0) continue;

        files.push({
          filename: `${table}_${filenameScope}.csv`,
          rows,
        });
      }

      return files;
    };

    const buildUsersFile = async () => {
      const roleRows = await fetchTableRows("user_roles", scopeEmpresaId);
      const empresaRows = await fetchTableRows("empresas", scopeEmpresaId);
      const empresaMap = new Map(empresaRows.map((row) => [row.id, row]));

      const roleMap = new Map<string, JsonRow[]>();
      for (const row of roleRows) {
        const userId = String(row.user_id || "");
        if (!userId) continue;
        const current = roleMap.get(userId) || [];
        current.push(row);
        roleMap.set(userId, current);
      }

      const users: JsonRow[] = [];
      let page = 1;

      while (true) {
        const {
          data: { users: authUsers },
          error,
        } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: AUTH_PAGE_SIZE });

        if (error) throw error;

        const filteredUsers = authUsers.filter((authUser) => {
          if (!scopeEmpresaId) return true;
          return roleMap.has(authUser.id);
        });

        for (const authUser of filteredUsers) {
          const roles = roleMap.get(authUser.id) || [];
          const empresaIds = [...new Set(roles.map((row) => row.empresa_id).filter(Boolean))] as string[];
          const empresas = empresaIds
            .map((empresaId) => empresaMap.get(empresaId))
            .filter(Boolean)
            .map((empresa) => String(empresa?.nome || empresa?.slug || ""))
            .filter(Boolean);

          users.push({
            id: authUser.id,
            email: authUser.email || "",
            roles: roles.map((row) => row.role).filter(Boolean).join(", "),
            empresa_ids: empresaIds.join(", "),
            empresas: empresas.join(", "),
            consultora_ids: roles.map((row) => row.consultora_id).filter(Boolean).join(", "),
            created_at: authUser.created_at,
            last_sign_in_at: authUser.last_sign_in_at,
            email_confirmed_at: authUser.email_confirmed_at,
            phone: authUser.phone || "",
            is_anonymous: authUser.is_anonymous,
          });
        }

        if (authUsers.length < AUTH_PAGE_SIZE) break;
        page += 1;
      }

      return {
        filename: `users_${filenameScope}.csv`,
        rows: users,
      };
    };

    const buildStoragesFile = async () => {
      const uploadRows = await fetchTableRows("uploads", scopeEmpresaId);
      const empresaRows = await fetchTableRows("empresas", scopeEmpresaId);

      const rows: JsonRow[] = [
        ...uploadRows.map((row) => ({
          source: "uploads_table",
          bucket: "uploads",
          empresa_id: row.empresa_id,
          object_path: row.arquivo_path,
          file_name: row.arquivo_nome,
          linked_record_id: row.id,
          user_id: row.user_id,
          status: row.status,
          created_at: row.criado_em,
        })),
        ...empresaRows
          .filter((row) => row.logo_url)
          .map((row) => ({
            source: "empresas.logo_url",
            bucket: "logos",
            empresa_id: row.id,
            object_path: extractLogoPath(String(row.logo_url || "")),
            file_name: extractLogoPath(String(row.logo_url || "")).split("/").pop() || "",
            linked_record_id: row.id,
            public_url: row.logo_url,
            created_at: row.created_at,
          })),
      ];

      return {
        filename: `storages_${filenameScope}.csv`,
        rows,
      };
    };

    const buildLogsFile = async () => ({
      filename: `audit_logs_${filenameScope}.csv`,
      rows: await fetchTableRows("audit_logs", scopeEmpresaId),
    });

    const files: { filename: string; rows: JsonRow[] }[] = [];

    if (action === "database-all") {
      files.push(...await buildDatabaseFiles());
    } else if (action === "database-table") {
      if (!requestedTable || !EXPORTABLE_TABLES.includes(requestedTable)) {
        return new Response(JSON.stringify({ error: "Tabela inválida para exportação" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      files.push(...await buildDatabaseFiles());
    } else if (action === "users") {
      files.push(await buildUsersFile());
    } else if (action === "storages") {
      files.push(await buildStoragesFile());
    } else if (action === "logs") {
      files.push(await buildLogsFile());
    } else if (action === "bundle") {
      files.push(...await buildDatabaseFiles());
      files.push(await buildUsersFile());
      files.push(await buildStoragesFile());
    } else {
      return new Response(JSON.stringify({ error: "Ação inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nonEmptyFiles = files.filter((file) => Array.isArray(file.rows) && file.rows.length > 0);

    return new Response(JSON.stringify({ files: nonEmptyFiles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao exportar dados";
    console.error("Erro export-cloud-data:", message, error);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
