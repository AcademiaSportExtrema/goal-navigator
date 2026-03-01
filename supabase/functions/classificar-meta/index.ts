import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Auth: verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Auth: verify admin or super_admin role
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    const { data: isSuperAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'super_admin' });
    if (!isAdmin && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem reclassificar' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user's empresa_id for scoping
    const { data: userEmpresaId } = await supabase.rpc('get_user_empresa_id', { _user_id: user.id });
    if (!userEmpresaId && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Empresa não encontrada' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { reprocessar_todos, mes_competencia, lancamento_ids } = body;

    // Buscar lançamentos a processar (scoped by empresa)
    let query = supabase.from('lancamentos').select('*');
    
    // Always filter by empresa_id for tenant isolation
    const targetEmpresaId = userEmpresaId || body.empresa_id;
    
    if (!targetEmpresaId) {
      return new Response(JSON.stringify({ error: 'empresa_id é obrigatório para reprocessamento' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    query = query.eq('empresa_id', targetEmpresaId);

    if (lancamento_ids?.length) {
      query = query.in('id', lancamento_ids);
    } else if (mes_competencia) {
      query = query.eq('mes_competencia', mes_competencia);
    } else if (reprocessar_todos) {
      // Processa lançamentos (scoped by empresa filter above)
    }

    const { data: lancamentos, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    // Buscar regras ativas - FILTRADO por empresa_id para isolamento multi-tenant
    const { data: regras } = await supabase
      .from('regras_meta')
      .select('*')
      .eq('ativo', true)
      .eq('empresa_id', targetEmpresaId)
      .order('prioridade', { ascending: true });

    let processados = 0;

    for (const lancamento of lancamentos || []) {
      let matched = false;

      if (regras) {
        for (const regra of regras) {
          const campoValor = lancamento[regra.campo_alvo];
          if (!campoValor) continue;

          let match = false;
          const valorStr = String(campoValor).toLowerCase();
          const regraValor = regra.valor.toLowerCase();

          switch (regra.operador) {
            case 'contem': match = valorStr.includes(regraValor); break;
            case 'igual': match = valorStr === regraValor; break;
            case 'comeca_com': match = valorStr.startsWith(regraValor); break;
            case 'termina_com': match = valorStr.endsWith(regraValor); break;
            case 'regex':
              try {
                if (valorStr.length > 1000) break;
                match = new RegExp(regra.valor, 'i').test(valorStr);
              } catch (e) {
                console.error('Regex error:', e);
                match = false;
              }
              break;
          }

          if (match) {
            const consultora_chave = lancamento[regra.responsavel_campo] || null;
            
            let dataRef = null;
            if (regra.regra_mes === 'DATA_LANCAMENTO') {
              dataRef = lancamento.data_lancamento;
            } else if (regra.regra_mes === 'DATA_INICIO') {
              dataRef = lancamento.data_inicio || lancamento.data_lancamento;
            }

            await supabase.from('lancamentos').update({
              entra_meta: regra.entra_meta,
              pendente_regra: false,
              consultora_chave,
              mes_competencia: dataRef ? dataRef.substring(0, 7) : null,
              regra_aplicada_id: regra.id,
              motivo_classificacao: `Regra #${regra.prioridade}: ${regra.campo_alvo} ${regra.operador} "${regra.valor}"`,
            }).eq('id', lancamento.id);

            matched = true;
            processados++;
            break;
          }
        }
      }

      if (!matched && !lancamento.pendente_regra) {
        // Se não bateu com nenhuma regra e não estava pendente, marca como pendente
        await supabase.from('lancamentos').update({
          entra_meta: false,
          pendente_regra: true,
          regra_aplicada_id: null,
          motivo_classificacao: 'Sem regra correspondente',
        }).eq('id', lancamento.id);
        processados++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processados }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erro na classificação:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
