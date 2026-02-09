
-- Parte 1: Apenas adicionar super_admin ao enum e criar tabela empresas
-- (sem usar o novo valor de enum nesta transação)

-- 1.1 Criar tabela empresas
CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text UNIQUE NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  subscription_status text NOT NULL DEFAULT 'active',
  trial_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_empresas_updated_at
BEFORE UPDATE ON public.empresas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 1.2 Adicionar super_admin ao enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 1.3 Adicionar empresa_id em todas as tabelas
ALTER TABLE public.consultoras ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.lancamentos ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.uploads ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.regras_meta ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.metas_mensais ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.metas_consultoras ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.comissao_niveis ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.permissoes_perfil ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.solicitacoes_ajuste ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
ALTER TABLE public.user_roles ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);

-- 1.4 Empresa padrão e migração de dados
INSERT INTO public.empresas (id, nome, slug, ativo, subscription_status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Empresa Principal', 'principal', true, 'active');

UPDATE public.consultoras SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.lancamentos SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.uploads SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.regras_meta SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.metas_mensais SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.metas_consultoras SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.comissao_niveis SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.permissoes_perfil SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.solicitacoes_ajuste SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.user_roles SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Tornar NOT NULL
ALTER TABLE public.consultoras ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.lancamentos ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.uploads ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.regras_meta ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.metas_mensais ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.metas_consultoras ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.comissao_niveis ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.permissoes_perfil ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.solicitacoes_ajuste ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.user_roles ALTER COLUMN empresa_id SET NOT NULL;

-- 1.5 Funções de segurança
CREATE OR REPLACE FUNCTION public.get_user_empresa_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_empresa_active(_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.empresas
    WHERE id = _empresa_id AND ativo = true
      AND (subscription_status = 'active' OR (trial_ends_at IS NOT NULL AND trial_ends_at > now()))
  )
$$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_consultoras_empresa ON public.consultoras(empresa_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_empresa ON public.lancamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_uploads_empresa ON public.uploads(empresa_id);
CREATE INDEX IF NOT EXISTS idx_regras_meta_empresa ON public.regras_meta(empresa_id);
CREATE INDEX IF NOT EXISTS idx_metas_mensais_empresa ON public.metas_mensais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_empresa ON public.user_roles(empresa_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_perfil_empresa ON public.permissoes_perfil(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_ajuste_empresa ON public.solicitacoes_ajuste(empresa_id);

-- Atualizar search_lancamentos_for_ajuste com filtro empresa
CREATE OR REPLACE FUNCTION public.search_lancamentos_for_ajuste(_search text DEFAULT ''::text, _limit integer DEFAULT 20)
RETURNS TABLE(id uuid, produto text, nome_cliente text, numero_contrato text, resp_venda text, resp_recebimento text, valor numeric, data_lancamento date, empresa text, plano text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT l.id, l.produto, l.nome_cliente, l.numero_contrato,
    l.resp_venda, l.resp_recebimento, l.valor, l.data_lancamento, l.empresa, l.plano
  FROM public.lancamentos l
  WHERE l.entra_meta = true
    AND l.empresa_id = get_user_empresa_id(auth.uid())
    AND (_search = '' OR
         l.numero_contrato ILIKE '%' || _search || '%' OR
         l.nome_cliente ILIKE '%' || _search || '%' OR
         l.resp_venda ILIKE '%' || _search || '%' OR
         l.resp_recebimento ILIKE '%' || _search || '%')
  ORDER BY l.data_lancamento DESC NULLS LAST
  LIMIT _limit;
$$;
