
-- Tabela meta_anual
CREATE TABLE public.meta_anual (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  ano integer NOT NULL,
  meta_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, ano)
);

ALTER TABLE public.meta_anual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own empresa meta_anual"
  ON public.meta_anual FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Super admins full access meta_anual"
  ON public.meta_anual FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_meta_anual_updated_at
  BEFORE UPDATE ON public.meta_anual
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela meta_anual_meses
CREATE TABLE public.meta_anual_meses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meta_anual_id uuid NOT NULL REFERENCES public.meta_anual(id) ON DELETE CASCADE,
  mes integer NOT NULL,
  peso_percent numeric NOT NULL DEFAULT 0,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  UNIQUE (meta_anual_id, mes)
);

ALTER TABLE public.meta_anual_meses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own empresa meta_anual_meses"
  ON public.meta_anual_meses FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Super admins full access meta_anual_meses"
  ON public.meta_anual_meses FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));
