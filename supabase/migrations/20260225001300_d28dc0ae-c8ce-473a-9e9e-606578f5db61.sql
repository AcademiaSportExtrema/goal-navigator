
-- Tabela de visibilidade do dashboard para consultoras
CREATE TABLE public.dashboard_visibilidade (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  componente text NOT NULL,
  visivel boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, componente)
);

ALTER TABLE public.dashboard_visibilidade ENABLE ROW LEVEL SECURITY;

-- Admins gerenciam da própria empresa
CREATE POLICY "Admins manage own empresa dashboard_visibilidade"
  ON public.dashboard_visibilidade FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND empresa_id = get_user_empresa_id(auth.uid()));

-- Super admins acesso total
CREATE POLICY "Super admins full access dashboard_visibilidade"
  ON public.dashboard_visibilidade FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Consultoras podem ler
CREATE POLICY "Users read own empresa dashboard_visibilidade"
  ON public.dashboard_visibilidade FOR SELECT
  USING (empresa_id = get_user_empresa_id(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_dashboard_visibilidade_updated_at
  BEFORE UPDATE ON public.dashboard_visibilidade
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
