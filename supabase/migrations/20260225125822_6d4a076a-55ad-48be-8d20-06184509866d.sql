
-- Tabela para persistir análises IA geradas para gestores
CREATE TABLE public.analise_ia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  mes_referencia TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  upload_id UUID REFERENCES public.uploads(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, mes_referencia)
);

ALTER TABLE public.analise_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own empresa analise_ia"
  ON public.analise_ia FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Super admins full access analise_ia"
  ON public.analise_ia FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Tabela para configurar emails destinatários da análise
CREATE TABLE public.analise_email_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  email TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, email)
);

ALTER TABLE public.analise_email_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own empresa analise_email_config"
  ON public.analise_email_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Super admins full access analise_email_config"
  ON public.analise_email_config FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));
