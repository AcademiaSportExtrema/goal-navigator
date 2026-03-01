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

    // Verify caller is admin
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

    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', { _user_id: caller.id, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem gerenciar acessos' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Derive empresa_id from the caller's server-side data (never trust the body)
    const { data: callerEmpresaId } = await supabaseAdmin.rpc('get_user_empresa_id', { _user_id: caller.id });
    if (!callerEmpresaId) {
      return new Response(JSON.stringify({ error: 'Empresa do administrador não encontrada' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, email, consultora_id, password } = await req.json();

    if (action === 'check') {
      if (!email) {
        return new Response(JSON.stringify({ error: 'Email é obrigatório' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const targetUser = users.find(u => u.email === email);
      if (!targetUser) {
        return new Response(JSON.stringify({ exists: false, has_role: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('id, role, consultora_id')
        .eq('user_id', targetUser.id)
        .maybeSingle();

      return new Response(JSON.stringify({
        exists: true,
        has_role: !!existingRole,
        role: existingRole?.role || null,
        consultora_id: existingRole?.consultora_id || null,
        user_id: targetUser.id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'create_and_link') {
      if (!email || !consultora_id || !password) {
        return new Response(JSON.stringify({ error: 'Email, password e consultora_id são obrigatórios' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate consultora belongs to caller's empresa
      const { data: consultoraData } = await supabaseAdmin
        .from('consultoras')
        .select('id')
        .eq('id', consultora_id)
        .eq('empresa_id', callerEmpresaId)
        .maybeSingle();
      if (!consultoraData) {
        return new Response(JSON.stringify({ error: 'Consultora não encontrada nesta empresa' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (password.length < 6) {
        return new Response(JSON.stringify({ error: 'A senha deve ter no mínimo 6 caracteres' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Try to create the user
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      let userId: string;

      if (createError) {
        // If user already exists, try to find and link
        if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
          const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          if (listError) throw listError;
          const existingUser = users.find(u => u.email === email);
          if (!existingUser) {
            return new Response(JSON.stringify({ error: 'Erro ao localizar usuário existente' }), {
              status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          userId = existingUser.id;
        } else {
          throw createError;
        }
      } else {
        userId = createData.user.id;
      }

      // Check if already has a role
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        const { error: updateError } = await supabaseAdmin
          .from('user_roles')
          .update({ role: 'consultora', consultora_id, empresa_id: callerEmpresaId })
          .eq('id', existingRole.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: userId, role: 'consultora', consultora_id, empresa_id: callerEmpresaId });
        if (insertError) throw insertError;
      }

      // Audit log
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: caller.id,
        actor_email: caller.email,
        actor_role: 'admin',
        empresa_id: callerEmpresaId,
        action: 'consultora.create_and_link',
        target_table: 'user_roles',
        metadata: { email, consultora_id },
      });

      return new Response(JSON.stringify({ success: true, message: 'Conta criada e acesso vinculado com sucesso' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'link') {
      if (!email || !consultora_id) {
        return new Response(JSON.stringify({ error: 'Email e consultora_id são obrigatórios' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate consultora belongs to caller's empresa
      const { data: consultoraData } = await supabaseAdmin
        .from('consultoras')
        .select('id')
        .eq('id', consultora_id)
        .eq('empresa_id', callerEmpresaId)
        .maybeSingle();
      if (!consultoraData) {
        return new Response(JSON.stringify({ error: 'Consultora não encontrada nesta empresa' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const targetUser = users.find(u => u.email === email);
      if (!targetUser) {
        return new Response(JSON.stringify({ error: 'Nenhum usuário cadastrado com este email' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', targetUser.id)
        .maybeSingle();

      if (existingRole) {
        const { error: updateError } = await supabaseAdmin
          .from('user_roles')
          .update({ role: 'consultora', consultora_id, empresa_id: callerEmpresaId })
          .eq('id', existingRole.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: targetUser.id, role: 'consultora', consultora_id, empresa_id: callerEmpresaId });
        if (insertError) throw insertError;
      }

      // Audit log
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: caller.id,
        actor_email: caller.email,
        actor_role: 'admin',
        empresa_id: callerEmpresaId,
        action: 'consultora.link',
        target_table: 'user_roles',
        metadata: { email, consultora_id },
      });

      return new Response(JSON.stringify({ success: true, message: 'Acesso vinculado com sucesso' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'unlink') {
      if (!consultora_id) {
        return new Response(JSON.stringify({ error: 'consultora_id é obrigatório' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate consultora belongs to caller's empresa
      const { data: consultoraData } = await supabaseAdmin
        .from('consultoras')
        .select('id')
        .eq('id', consultora_id)
        .eq('empresa_id', callerEmpresaId)
        .maybeSingle();
      if (!consultoraData) {
        return new Response(JSON.stringify({ error: 'Consultora não encontrada nesta empresa' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error: deleteError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('consultora_id', consultora_id)
        .eq('role', 'consultora');

      if (deleteError) throw deleteError;

      // Audit log
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: caller.id,
        actor_email: caller.email,
        actor_role: 'admin',
        empresa_id: callerEmpresaId,
        action: 'consultora.unlink',
        target_table: 'user_roles',
        metadata: { consultora_id },
      });

      return new Response(JSON.stringify({ success: true, message: 'Acesso removido com sucesso' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida. Use: create_and_link, link, unlink, check' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
