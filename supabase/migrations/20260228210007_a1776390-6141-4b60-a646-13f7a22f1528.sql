CREATE OR REPLACE FUNCTION public.get_realizado_por_mes(p_empresa_id uuid, p_ano integer)
RETURNS TABLE(mes integer, total numeric)
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT 
    extract(month from data_lancamento::date)::integer as mes,
    coalesce(sum(valor), 0) as total
  FROM public.lancamentos
  WHERE empresa_id = p_empresa_id
    AND entra_meta = true
    AND data_lancamento >= (p_ano || '-01-01')::date
    AND data_lancamento <= (p_ano || '-12-31')::date
  GROUP BY mes
  ORDER BY mes;
$$;