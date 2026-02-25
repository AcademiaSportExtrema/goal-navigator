import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: isSuperAdmin } = await supabaseAdmin.rpc('has_role', { _user_id: caller.id, _role: 'super_admin' });
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas super administradores podem validar integrações' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { api_key } = await req.json();
    if (!api_key || typeof api_key !== 'string' || api_key.trim().length === 0) {
      return new Response(JSON.stringify({ valid: false, error: 'Chave da API é obrigatória' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test the key against Resend's API
    const resendRes = await fetch('https://api.resend.com/domains', {
      headers: { 'Authorization': `Bearer ${api_key.trim()}` }
    });

    if (resendRes.ok) {
      const body = await resendRes.json();
      const domains = (body.data || []).map((d: any) => ({
        name: d.name,
        status: d.status,
      }));
      return new Response(JSON.stringify({ valid: true, domains }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ valid: false, error: 'Chave do Resend inválida ou sem permissão' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Erro ao validar chave Resend:', error);
    return new Response(JSON.stringify({ valid: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
