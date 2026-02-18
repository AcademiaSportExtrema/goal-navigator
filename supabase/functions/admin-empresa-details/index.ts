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

    // Validate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: isSuperAdmin } = await supabaseAdmin.rpc('has_role', { _user_id: caller.id, _role: 'super_admin' });
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas super administradores' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const empresaId = url.searchParams.get('empresa_id');

    if (!empresaId) {
      return new Response(JSON.stringify({ error: 'empresa_id é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get empresa data
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .select('*')
      .eq('id', empresaId)
      .single();

    if (empresaError) throw empresaError;

    // Get users with roles for this empresa
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role, consultora_id')
      .eq('empresa_id', empresaId);

    // Get user emails from auth
    const usersWithEmail = [];
    if (userRoles && userRoles.length > 0) {
      for (const ur of userRoles) {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(ur.user_id);
        usersWithEmail.push({
          user_id: ur.user_id,
          email: user?.email || 'N/A',
          role: ur.role,
          consultora_id: ur.consultora_id,
          created_at: user?.created_at,
          last_sign_in_at: user?.last_sign_in_at,
        });
      }
    }

    // Counts
    const { count: totalConsultoras } = await supabaseAdmin
      .from('consultoras')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId);

    const { count: totalLancamentos } = await supabaseAdmin
      .from('lancamentos')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId);

    const { count: totalUploads } = await supabaseAdmin
      .from('uploads')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId);

    // Recent audit logs
    const { data: recentLogs } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(20);

    return new Response(JSON.stringify({
      empresa,
      users: usersWithEmail,
      counts: {
        consultoras: totalConsultoras || 0,
        lancamentos: totalLancamentos || 0,
        uploads: totalUploads || 0,
      },
      recent_logs: recentLogs || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Erro admin-empresa-details:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
