
-- Enum para status da solicitação
CREATE TYPE public.ajuste_status AS ENUM ('pendente', 'aprovado', 'rejeitado');

-- Tabela de solicitações de ajuste
CREATE TABLE public.solicitacoes_ajuste (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id uuid NOT NULL REFERENCES public.lancamentos(id) ON DELETE CASCADE,
  consultora_id uuid NOT NULL REFERENCES public.consultoras(id) ON DELETE CASCADE,
  resp_recebimento_atual text,
  resp_recebimento_novo text NOT NULL,
  justificativa text NOT NULL,
  status public.ajuste_status NOT NULL DEFAULT 'pendente',
  admin_comentario text,
  admin_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_solicitacoes_ajuste_updated_at
  BEFORE UPDATE ON public.solicitacoes_ajuste
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.solicitacoes_ajuste ENABLE ROW LEVEL SECURITY;

-- Admins podem tudo
CREATE POLICY "Admins can manage solicitacoes_ajuste"
  ON public.solicitacoes_ajuste
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Consultoras podem ver suas próprias solicitações
CREATE POLICY "Consultoras can view own solicitacoes"
  ON public.solicitacoes_ajuste
  FOR SELECT
  USING (consultora_id = public.get_user_consultora_id(auth.uid()));

-- Consultoras podem criar solicitações
CREATE POLICY "Consultoras can create solicitacoes"
  ON public.solicitacoes_ajuste
  FOR INSERT
  WITH CHECK (consultora_id = public.get_user_consultora_id(auth.uid()));

-- Função segura para consultoras buscarem lançamentos para ajuste
CREATE OR REPLACE FUNCTION public.search_lancamentos_for_ajuste(
  _search text DEFAULT '',
  _limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  produto text,
  nome_cliente text,
  numero_contrato text,
  resp_venda text,
  resp_recebimento text,
  valor numeric,
  data_lancamento date,
  empresa text,
  plano text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.id,
    l.produto,
    l.nome_cliente,
    l.numero_contrato,
    l.resp_venda,
    l.resp_recebimento,
    l.valor,
    l.data_lancamento,
    l.empresa,
    l.plano
  FROM public.lancamentos l
  WHERE l.entra_meta = true
    AND (_search = '' OR
         l.numero_contrato ILIKE '%' || _search || '%' OR
         l.nome_cliente ILIKE '%' || _search || '%' OR
         l.resp_venda ILIKE '%' || _search || '%' OR
         l.resp_recebimento ILIKE '%' || _search || '%')
  ORDER BY l.data_lancamento DESC NULLS LAST
  LIMIT _limit;
$$;
