
CREATE OR REPLACE FUNCTION public.get_realizado_por_mes(p_empresa_id uuid, p_ano integer)
 RETURNS TABLE(mes integer, total numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
WITH vendas AS (
  -- 1a) Recorrente (condicao_pagamento contém 'RECORRÊNCIA'): agrupar por data_lancamento, todas
  SELECT
    extract(month FROM l.data_lancamento)::integer AS mes,
    coalesce(l.valor, 0) AS valor
  FROM public.lancamentos l
  WHERE l.empresa_id = p_empresa_id
    AND l.entra_meta = true
    AND l.data_lancamento >= (p_ano || '-01-01')::date
    AND l.data_lancamento <= (p_ano || '-12-31')::date
    AND l.condicao_pagamento ILIKE '%RECORRÊNCIA%'

  UNION ALL

  -- 1b) Loja (duracao 0 ou null, sem recorrência): agrupar por mes_competencia
  SELECT
    extract(month FROM (l.mes_competencia || '-01')::date)::integer AS mes,
    coalesce(l.valor, 0) AS valor
  FROM public.lancamentos l
  WHERE l.empresa_id = p_empresa_id
    AND l.entra_meta = true
    AND l.mes_competencia IS NOT NULL
    AND (l.mes_competencia || '-01')::date >= (p_ano || '-01-01')::date
    AND (l.mes_competencia || '-01')::date <= (p_ano || '-12-31')::date
    AND (l.duracao IS NULL OR l.duracao = '0' OR l.duracao = '')
    AND (l.condicao_pagamento IS NULL OR l.condicao_pagamento NOT ILIKE '%RECORRÊNCIA%')

  UNION ALL

  -- 1c) Mensal/Parcelado (duracao in 1,4,6,12,18): mes_competencia, somente vendas novas
  SELECT
    extract(month FROM (l.mes_competencia || '-01')::date)::integer AS mes,
    coalesce(l.valor, 0) AS valor
  FROM public.lancamentos l
  WHERE l.empresa_id = p_empresa_id
    AND l.entra_meta = true
    AND l.mes_competencia IS NOT NULL
    AND (l.mes_competencia || '-01')::date >= (p_ano || '-01-01')::date
    AND (l.mes_competencia || '-01')::date <= (p_ano || '-12-31')::date
    AND l.duracao IN ('1','4','6','12','18')
    AND (l.condicao_pagamento IS NULL OR l.condicao_pagamento NOT ILIKE '%RECORRÊNCIA%')
    AND l.data_inicio IS NOT NULL
    AND l.data_lancamento IS NOT NULL
    AND to_char(l.data_inicio, 'YYYY-MM') = to_char(l.data_lancamento, 'YYYY-MM')

  UNION ALL

  -- 1d) Outros (duracao não é 0/null/1/4/6/12/18 e não é recorrente): mes_competencia
  SELECT
    extract(month FROM (l.mes_competencia || '-01')::date)::integer AS mes,
    coalesce(l.valor, 0) AS valor
  FROM public.lancamentos l
  WHERE l.empresa_id = p_empresa_id
    AND l.entra_meta = true
    AND l.mes_competencia IS NOT NULL
    AND (l.mes_competencia || '-01')::date >= (p_ano || '-01-01')::date
    AND (l.mes_competencia || '-01')::date <= (p_ano || '-12-31')::date
    AND l.duracao IS NOT NULL AND l.duracao <> '' AND l.duracao <> '0'
    AND l.duracao NOT IN ('1','4','6','12','18')
    AND (l.condicao_pagamento IS NULL OR l.condicao_pagamento NOT ILIKE '%RECORRÊNCIA%')
),

-- 2) Agregadores manuais (Wellhub, Total Pass) por data_recebimento
agregadores AS (
  SELECT
    extract(month FROM pa.data_recebimento)::integer AS mes,
    coalesce(pa.valor, 0) AS valor
  FROM public.pagamentos_agregadores pa
  WHERE pa.empresa_id = p_empresa_id
    AND pa.data_recebimento IS NOT NULL
    AND pa.data_recebimento >= (p_ano || '-01-01')::date
    AND pa.data_recebimento <= (p_ano || '-12-31')::date
    AND (pa.agregador ILIKE '%Wellhub%' OR pa.agregador ILIKE '%Total Pass%')
),

-- 3) Entuspass / Sport Pass (entra_meta=false, plano ILIKE) por data_lancamento
entuspass AS (
  SELECT
    extract(month FROM l.data_lancamento)::integer AS mes,
    coalesce(l.valor, 0) AS valor
  FROM public.lancamentos l
  WHERE l.empresa_id = p_empresa_id
    AND l.entra_meta = false
    AND l.data_lancamento >= (p_ano || '-01-01')::date
    AND l.data_lancamento <= (p_ano || '-12-31')::date
    AND (l.plano ILIKE '%ENTUSPASS%' OR l.plano ILIKE '%SPORT PASS%')
),

combined AS (
  SELECT mes, valor FROM vendas
  UNION ALL
  SELECT mes, valor FROM agregadores
  UNION ALL
  SELECT mes, valor FROM entuspass
)

SELECT c.mes, coalesce(sum(c.valor), 0) AS total
FROM combined c
GROUP BY c.mes
ORDER BY c.mes;
$function$;
