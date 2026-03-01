
CREATE TABLE public.meta_semanal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_mensal_id uuid NOT NULL REFERENCES metas_mensais(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL,
  semana integer NOT NULL CHECK (semana BETWEEN 1 AND 5),
  peso_percent numeric NOT NULL DEFAULT 25,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meta_mensal_id, semana)
);

ALTER TABLE public.meta_semanal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own empresa meta_semanal"
  ON public.meta_semanal FOR ALL
  USING (has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Super admins full access meta_semanal"
  ON public.meta_semanal FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users view own empresa meta_semanal"
  ON public.meta_semanal FOR SELECT
  USING (empresa_id = get_user_empresa_id(auth.uid()));
