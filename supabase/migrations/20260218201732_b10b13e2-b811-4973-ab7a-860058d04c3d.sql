CREATE OR REPLACE FUNCTION public.search_lancamentos_for_ajuste(_search text DEFAULT ''::text, _limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, produto text, nome_cliente text, numero_contrato text, resp_venda text, resp_recebimento text, valor numeric, data_lancamento date, empresa text, plano text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT l.id, l.produto, l.nome_cliente, l.numero_contrato,
    l.resp_venda, l.resp_recebimento, l.valor, l.data_lancamento, l.empresa, l.plano
  FROM public.lancamentos l
  WHERE auth.uid() IS NOT NULL
    AND l.entra_meta = true
    AND l.empresa_id = get_user_empresa_id(auth.uid())
    AND (_search = '' OR
         l.numero_contrato ILIKE '%' || _search || '%' OR
         l.nome_cliente ILIKE '%' || _search || '%' OR
         l.resp_venda ILIKE '%' || _search || '%' OR
         l.resp_recebimento ILIKE '%' || _search || '%')
  ORDER BY l.data_lancamento DESC NULLS LAST
  LIMIT _limit;
$function$;