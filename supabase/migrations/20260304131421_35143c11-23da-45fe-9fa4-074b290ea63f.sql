CREATE TYPE public.cobranca_status AS ENUM ('pendente', 'em_contato', 'pago');

CREATE TYPE public.cobranca_evento_tipo AS ENUM ('tentativa_contato', 'pagamento_confirmado');

CREATE OR REPLACE FUNCTION public.build_devedor_chave(
  _cod_empresa text,
  _contrato text,
  _codigo_parcela text,
  _parcela text,
  _nome text,
  _data_vencimento date,
  _valor_parcela numeric
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT md5(
    concat_ws(
      '|',
      lower(trim(coalesce(_cod_empresa, ''))),
      lower(trim(coalesce(_contrato, ''))),
      lower(trim(coalesce(_codigo_parcela, ''))),
      lower(trim(coalesce(_parcela, ''))),
      lower(trim(coalesce(_nome, ''))),
      coalesce(to_char(_data_vencimento, 'YYYY-MM-DD'), ''),
      coalesce(trim(to_char(_valor_parcela, 'FM999999999999990D00')), '')
    )
  );
$$;

ALTER TABLE public.devedores_parcelas
  ADD COLUMN chave_cobranca text,
  ADD COLUMN status_cobranca public.cobranca_status NOT NULL DEFAULT 'pendente',
  ADD COLUMN ultimo_contato_em timestamp with time zone,
  ADD COLUMN ultima_observacao text,
  ADD COLUMN pago_em timestamp with time zone;

CREATE TABLE public.devedores_cobranca_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  chave_cobranca text NOT NULL,
  devedor_parcela_id uuid NULL REFERENCES public.devedores_parcelas(id) ON DELETE SET NULL,
  tipo public.cobranca_evento_tipo NOT NULL,
  contato_em timestamp with time zone NOT NULL,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  created_by_label text NOT NULL
);

ALTER TABLE public.devedores_cobranca_historico ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_devedores_parcelas_empresa_status
  ON public.devedores_parcelas (empresa_id, status_cobranca);

CREATE INDEX idx_devedores_parcelas_empresa_chave
  ON public.devedores_parcelas (empresa_id, chave_cobranca);

CREATE INDEX idx_devedores_cobranca_hist_empresa_chave
  ON public.devedores_cobranca_historico (empresa_id, chave_cobranca, contato_em DESC);

CREATE INDEX idx_devedores_cobranca_hist_parcela
  ON public.devedores_cobranca_historico (devedor_parcela_id);

CREATE OR REPLACE FUNCTION public.sync_devedores_cobranca_resumo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status_cobranca IS NULL THEN
    NEW.status_cobranca := 'pendente';
  END IF;

  IF NEW.pago_em IS NOT NULL THEN
    NEW.status_cobranca := 'pago';
  ELSIF NEW.ultimo_contato_em IS NOT NULL AND NEW.status_cobranca = 'pendente' THEN
    NEW.status_cobranca := 'em_contato';
  END IF;

  NEW.cobranca_enviada := (
    NEW.status_cobranca IN ('em_contato', 'pago')
    OR NEW.ultimo_contato_em IS NOT NULL
    OR NEW.pago_em IS NOT NULL
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_devedores_cobranca_resumo
BEFORE INSERT OR UPDATE ON public.devedores_parcelas
FOR EACH ROW
EXECUTE FUNCTION public.sync_devedores_cobranca_resumo();

DROP POLICY IF EXISTS "Consultoras update cobranca own devedores" ON public.devedores_parcelas;

CREATE POLICY "Admins read own empresa historico cobranca"
ON public.devedores_cobranca_historico
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND empresa_id = public.get_user_empresa_id(auth.uid())
);

CREATE POLICY "Admins insert own empresa historico cobranca"
ON public.devedores_cobranca_historico
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND empresa_id = public.get_user_empresa_id(auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Consultoras read own historico cobranca"
ON public.devedores_cobranca_historico
FOR SELECT
USING (
  empresa_id = public.get_user_empresa_id(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.devedores_parcelas dp
    JOIN public.consultoras c
      ON c.id = public.get_user_consultora_id(auth.uid())
     AND c.empresa_id = public.get_user_empresa_id(auth.uid())
    WHERE dp.empresa_id = devedores_cobranca_historico.empresa_id
      AND dp.chave_cobranca = devedores_cobranca_historico.chave_cobranca
      AND lower(dp.consultor) = lower(c.nome)
  )
);

CREATE POLICY "Consultoras insert own historico cobranca"
ON public.devedores_cobranca_historico
FOR INSERT
WITH CHECK (
  empresa_id = public.get_user_empresa_id(auth.uid())
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.devedores_parcelas dp
    JOIN public.consultoras c
      ON c.id = public.get_user_consultora_id(auth.uid())
     AND c.empresa_id = public.get_user_empresa_id(auth.uid())
    WHERE dp.empresa_id = devedores_cobranca_historico.empresa_id
      AND dp.chave_cobranca = devedores_cobranca_historico.chave_cobranca
      AND lower(dp.consultor) = lower(c.nome)
  )
);

CREATE POLICY "Super admins full access historico cobranca"
ON public.devedores_cobranca_historico
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));