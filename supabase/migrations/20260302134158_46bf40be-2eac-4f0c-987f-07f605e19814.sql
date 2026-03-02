
-- Create table for devedores (overdue payments report)
CREATE TABLE public.devedores_parcelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  nome text,
  data_vencimento date,
  valor_parcela numeric DEFAULT 0,
  consultor text,
  contrato text,
  codigo_parcela text,
  parcela text,
  cod_empresa text,
  convenio text,
  em_remessa text,
  arquivo_nome text,
  uploaded_by uuid,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.devedores_parcelas ENABLE ROW LEVEL SECURITY;

-- Admin full access within own empresa
CREATE POLICY "Admins manage own empresa devedores_parcelas"
  ON public.devedores_parcelas
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

-- Super admin full access
CREATE POLICY "Super admins full access devedores_parcelas"
  ON public.devedores_parcelas
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Consultora can only SELECT rows where consultor matches her name
CREATE POLICY "Consultoras view own devedores_parcelas"
  ON public.devedores_parcelas
  FOR SELECT
  USING (
    empresa_id = get_user_empresa_id(auth.uid())
    AND consultor IN (
      SELECT nome FROM public.consultoras
      WHERE id = get_user_consultora_id(auth.uid())
    )
  );
