import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type CobrancaEventoTipo = 'tentativa_contato' | 'pagamento_confirmado';

function normalizeKeyPart(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeDatePart(value: string | null) {
  if (!value) return '';
  return value.split('T')[0];
}

function normalizeMoneyPart(value: number | null) {
  if (value == null || Number.isNaN(Number(value))) return '';
  return Number(value).toFixed(2);
}

function buildDevedorKey(devedor: {
  cod_empresa: string | null;
  contrato: string | null;
  codigo_parcela: string | null;
  parcela: string | null;
  nome: string | null;
  data_vencimento: string | null;
  valor_parcela: number | null;
}) {
  return [
    normalizeKeyPart(devedor.cod_empresa),
    normalizeKeyPart(devedor.contrato),
    normalizeKeyPart(devedor.codigo_parcela),
    normalizeKeyPart(devedor.parcela),
    normalizeKeyPart(devedor.nome),
    normalizeDatePart(devedor.data_vencimento),
    normalizeMoneyPart(devedor.valor_parcela),
  ].join('|');
}

function isValidEventoTipo(value: unknown): value is CobrancaEventoTipo {
  return value === 'tentativa_contato' || value === 'pagamento_confirmado';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const devedorId = typeof body?.devedorId === 'string' ? body.devedorId : '';
    const tipo = body?.tipo;
    const observacao = typeof body?.observacao === 'string' ? body.observacao.trim() : '';
    const contatoEmRaw = typeof body?.contatoEm === 'string' ? body.contatoEm : '';

    if (!devedorId) {
      return new Response(JSON.stringify({ error: 'devedorId é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isValidEventoTipo(tipo)) {
      return new Response(JSON.stringify({ error: 'Tipo de evento inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!contatoEmRaw) {
      return new Response(JSON.stringify({ error: 'Data do contato é obrigatória' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (tipo === 'tentativa_contato' && !observacao) {
      return new Response(JSON.stringify({ error: 'Preencha a observação da tentativa' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contatoDate = new Date(contatoEmRaw);
    if (Number.isNaN(contatoDate.getTime())) {
      return new Response(JSON.stringify({ error: 'Data do contato inválida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contatoEm = contatoDate.toISOString();

    const { data: userRole, error: userRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, empresa_id, consultora_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (userRoleError || !userRole) {
      return new Response(JSON.stringify({ error: 'Perfil de acesso não encontrado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: devedor, error: devedorError } = await supabaseAdmin
      .from('devedores_parcelas')
      .select('*')
      .eq('id', devedorId)
      .eq('empresa_id', userRole.empresa_id)
      .maybeSingle();

    if (devedorError || !devedor) {
      return new Response(JSON.stringify({ error: 'Cobrança não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let createdByLabel = user.email ?? 'Usuário';

    if (userRole.role === 'consultora') {
      if (!userRole.consultora_id) {
        return new Response(JSON.stringify({ error: 'Consultora não vinculada ao usuário' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: consultora, error: consultoraError } = await supabaseAdmin
        .from('consultoras')
        .select('nome')
        .eq('id', userRole.consultora_id)
        .eq('empresa_id', userRole.empresa_id)
        .maybeSingle();

      if (consultoraError || !consultora) {
        return new Response(JSON.stringify({ error: 'Consultora não encontrada' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if ((devedor.consultor ?? '').trim().toLowerCase() !== consultora.nome.trim().toLowerCase()) {
        return new Response(JSON.stringify({ error: 'Você não pode registrar eventos nessa cobrança' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      createdByLabel = consultora.nome;
    } else if (userRole.role !== 'admin' && userRole.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Perfil sem permissão para esta ação' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const chaveCobranca = devedor.chave_cobranca || buildDevedorKey(devedor);
    const resumoUpdate = tipo === 'pagamento_confirmado'
      ? {
          chave_cobranca: chaveCobranca,
          status_cobranca: 'pago' as const,
          ultimo_contato_em: contatoEm,
          ultima_observacao: observacao || devedor.ultima_observacao || null,
          pago_em: contatoEm,
        }
      : {
          chave_cobranca: chaveCobranca,
          status_cobranca: 'em_contato' as const,
          ultimo_contato_em: contatoEm,
          ultima_observacao: observacao || null,
          pago_em: devedor.pago_em,
        };

    const { data: devedorAtualizado, error: updateError } = await supabaseAdmin
      .from('devedores_parcelas')
      .update(resumoUpdate)
      .eq('id', devedor.id)
      .eq('empresa_id', userRole.empresa_id)
      .select('*')
      .single();

    if (updateError) {
      throw updateError;
    }

    const { error: historicoError } = await supabaseAdmin
      .from('devedores_cobranca_historico')
      .insert({
        empresa_id: userRole.empresa_id,
        chave_cobranca: chaveCobranca,
        devedor_parcela_id: devedor.id,
        tipo,
        contato_em: contatoEm,
        observacao: observacao || null,
        created_by: user.id,
        created_by_label: createdByLabel,
      });

    if (historicoError) {
      throw historicoError;
    }

    if (tipo === 'pagamento_confirmado') {
      try {
        await supabaseAdmin.from('audit_logs').insert({
          actor_id: user.id,
          actor_email: user.email,
          actor_role: userRole.role,
          empresa_id: userRole.empresa_id,
          action: 'cobranca_marcada_como_paga',
          target_table: 'devedores_parcelas',
          target_id: devedor.id,
          metadata: {
            chave_cobranca: chaveCobranca,
            nome: devedor.nome,
            consultor: devedor.consultor,
            contato_em: contatoEm,
            observacao: observacao || null,
          },
        });
      } catch (auditError) {
        console.error('Erro ao registrar auditoria de cobrança:', auditError);
      }
    }

    return new Response(JSON.stringify({ success: true, devedor: devedorAtualizado }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Erro registrar-cobranca-devedor:', error);
    return new Response(JSON.stringify({ error: error.message || 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
