
-- Create enum for diretriz type
CREATE TYPE public.coach_diretriz_tipo AS ENUM ('permitido', 'proibido');

-- Create coach_diretrizes table
CREATE TABLE public.coach_diretrizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo public.coach_diretriz_tipo NOT NULL,
  texto TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coach_diretrizes ENABLE ROW LEVEL SECURITY;

-- Admins manage own empresa
CREATE POLICY "Admins manage own empresa coach_diretrizes"
ON public.coach_diretrizes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND empresa_id = get_user_empresa_id(auth.uid()));

-- Super admins full access
CREATE POLICY "Super admins full access coach_diretrizes"
ON public.coach_diretrizes
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Consultoras can read (needed for edge function with their token)
CREATE POLICY "Users read own empresa coach_diretrizes"
ON public.coach_diretrizes
FOR SELECT
USING (empresa_id = get_user_empresa_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_coach_diretrizes_updated_at
BEFORE UPDATE ON public.coach_diretrizes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
