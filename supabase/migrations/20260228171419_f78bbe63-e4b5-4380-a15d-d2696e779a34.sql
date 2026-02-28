
CREATE TABLE public.pagamentos_agregadores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL,
  agregador text NOT NULL,
  mes_referencia text NOT NULL,
  data_recebimento date,
  valor numeric NOT NULL DEFAULT 0,
  quantidade_clientes integer NOT NULL DEFAULT 0,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pagamentos_agregadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own empresa pagamentos_agregadores"
ON public.pagamentos_agregadores
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Super admins full access pagamentos_agregadores"
ON public.pagamentos_agregadores
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));
