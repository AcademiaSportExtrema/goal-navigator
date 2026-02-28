
-- Create table for manual f360 values
CREATE TABLE public.fechamento_caixa_f360 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  data DATE NOT NULL,
  valor_f360 NUMERIC NOT NULL DEFAULT 0,
  valor_pix_f360 NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT uq_fechamento_empresa_data UNIQUE (empresa_id, data)
);

-- Enable RLS
ALTER TABLE public.fechamento_caixa_f360 ENABLE ROW LEVEL SECURITY;

-- Admins manage own empresa
CREATE POLICY "Admins manage own empresa fechamento_caixa_f360"
ON public.fechamento_caixa_f360
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND empresa_id = get_user_empresa_id(auth.uid()));

-- Super admins full access
CREATE POLICY "Super admins full access fechamento_caixa_f360"
ON public.fechamento_caixa_f360
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));
