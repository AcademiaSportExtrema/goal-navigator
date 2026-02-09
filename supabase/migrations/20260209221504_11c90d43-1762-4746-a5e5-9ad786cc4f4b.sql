
-- Criar tabela de permissões por perfil
CREATE TABLE public.permissoes_perfil (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  rota text NOT NULL,
  permitido boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (role, rota)
);

-- Enable RLS
ALTER TABLE public.permissoes_perfil ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar permissões
CREATE POLICY "Admins can manage permissoes"
ON public.permissoes_perfil
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Todos autenticados podem ler permissões
CREATE POLICY "Authenticated users can read permissoes"
ON public.permissoes_perfil
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at
CREATE TRIGGER update_permissoes_perfil_updated_at
BEFORE UPDATE ON public.permissoes_perfil
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir permissões padrão para Admin (todas ativas)
INSERT INTO public.permissoes_perfil (role, rota, permitido) VALUES
  ('admin', '/dashboard', true),
  ('admin', '/upload', true),
  ('admin', '/gerencial', true),
  ('admin', '/pendencias', true),
  ('admin', '/ajustes', true),
  ('admin', '/regras', true),
  ('admin', '/configuracao-mes', true),
  ('admin', '/configuracao', true);

-- Inserir permissões padrão para Consultora
INSERT INTO public.permissoes_perfil (role, rota, permitido) VALUES
  ('consultora', '/minha-performance', true),
  ('consultora', '/solicitar-ajuste', true),
  ('consultora', '/dashboard', false);
