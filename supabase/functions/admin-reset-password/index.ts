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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user: caller } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: caller.id, _role: 'admin' });
    const { data: isSuperAdmin } = await supabase.rpc('has_role', { _user_id: caller.id, _role: 'super_admin' });
    if (!isAdmin && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem redefinir senhas' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { email, password } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email e senha são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find user by email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const targetUser = users.find(u => u.email === email);
    if (!targetUser) {
      return new Response(JSON.stringify({ error: 'Usuário com este email não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Enforce empresa isolation: admin can only reset passwords within their own empresa
    if (!isSuperAdmin) {
      const { data: callerEmpresaId } = await supabase.rpc('get_user_empresa_id', { _user_id: caller.id });
      const { data: targetRole } = await supabase
        .from('user_roles')
        .select('empresa_id')
        .eq('user_id', targetUser.id)
        .single();

      if (!targetRole || targetRole.empresa_id !== callerEmpresaId) {
        return new Response(JSON.stringify({ error: 'Você só pode redefinir senhas de usuários da sua empresa' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(targetUser.id, { password });
    if (updateError) throw updateError;

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: caller.id,
      actor_email: caller.email,
      actor_role: 'admin',
      action: 'user.reset_password',
      target_table: 'auth.users',
      target_id: targetUser.id,
      metadata: { target_email: email },
    });

    return new Response(
      JSON.stringify({ success: true, message: `Senha redefinida com sucesso para ${email}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erro ao redefinir senha:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
