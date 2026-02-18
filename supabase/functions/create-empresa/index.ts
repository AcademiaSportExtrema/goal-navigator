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

    // Verify caller is super_admin
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
      return new Response(JSON.stringify({ error: 'Apenas super administradores podem criar empresas' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { nome, slug, email_admin, senha_admin } = await req.json();

    if (!nome || !slug || !email_admin || !senha_admin) {
      return new Response(JSON.stringify({ error: 'Todos os campos são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1. Create empresa
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .insert({ nome, slug, ativo: true, subscription_status: 'active' })
      .select()
      .single();

    if (empresaError) {
      if (empresaError.code === '23505') {
        return new Response(JSON.stringify({ error: 'Já existe uma empresa com este slug' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw empresaError;
    }

    // 2. Create admin user
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email_admin,
      password: senha_admin,
      email_confirm: true,
    });

    if (createError) throw createError;

    // 3. Create user_role with empresa_id
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: createData.user.id,
        role: 'admin',
        empresa_id: empresa.id,
      });

    if (roleError) throw roleError;

    // 4. Create default permissions for the empresa
    const defaultRoutes = [
      '/dashboard', '/upload', '/gerencial', '/pendencias', '/ajustes',
      '/regras', '/configuracao-mes', '/configuracao',
      '/minha-performance', '/solicitar-ajuste',
    ];

    const permissoes = [];
    for (const rota of defaultRoutes) {
      permissoes.push({ role: 'admin' as const, rota, permitido: true, empresa_id: empresa.id });
      permissoes.push({ role: 'consultora' as const, rota, permitido: rota === '/minha-performance' || rota === '/solicitar-ajuste' || rota === '/dashboard', empresa_id: empresa.id });
    }

    await supabaseAdmin.from('permissoes_perfil').insert(permissoes);

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: caller.id,
      actor_email: caller.email,
      actor_role: 'super_admin',
      empresa_id: empresa.id,
      action: 'empresa.create',
      target_table: 'empresas',
      target_id: empresa.id,
      metadata: { nome, slug, email_admin },
    });

    return new Response(JSON.stringify({ success: true, empresa_id: empresa.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Erro ao criar empresa:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
