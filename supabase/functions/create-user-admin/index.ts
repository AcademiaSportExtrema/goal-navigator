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
      return new Response(JSON.stringify({ error: 'Apenas super administradores podem criar usuários' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { email, password, role, empresa_id } = await req.json();

    if (!email || !password || !role || !empresa_id) {
      return new Response(JSON.stringify({ error: 'Todos os campos são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!['admin', 'consultora'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Role inválido. Use admin ou consultora.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'A senha deve ter no mínimo 6 caracteres' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify empresa exists
    const { data: empresa, error: empresaErr } = await supabaseAdmin
      .from('empresas')
      .select('id, nome')
      .eq('id', empresa_id)
      .single();

    if (empresaErr || !empresa) {
      return new Response(JSON.stringify({ error: 'Empresa não encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create user
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      if (createError.message?.includes('already been registered')) {
        return new Response(JSON.stringify({ error: 'Este email já está cadastrado' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw createError;
    }

    // Create user_role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: createData.user.id,
        role,
        empresa_id,
      });

    if (roleError) throw roleError;

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: caller.id,
      actor_email: caller.email,
      actor_role: 'super_admin',
      empresa_id,
      action: 'user.create',
      target_table: 'user_roles',
      target_id: createData.user.id,
      metadata: { email, role, empresa_nome: empresa.nome },
    });

    return new Response(JSON.stringify({ success: true, user_id: createData.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
