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

    // Validate caller is super_admin
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

    // Verify super_admin role
    const { data: callerRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'super_admin')
      .limit(1)
      .single();

    if (!callerRole) {
      return new Response(JSON.stringify({ error: 'Apenas super_admin pode impersonar' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { target_user_id, motivo } = await req.json();

    if (!target_user_id || !motivo || motivo.trim().length < 5) {
      return new Response(JSON.stringify({ error: 'target_user_id e motivo (min 5 chars) são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Prevent impersonating another super_admin
    const { data: targetRole } = await supabaseAdmin
      .from('user_roles')
      .select('role, empresa_id')
      .eq('user_id', target_user_id)
      .limit(1)
      .single();

    if (!targetRole) {
      return new Response(JSON.stringify({ error: 'Usuário alvo não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (targetRole.role === 'super_admin') {
      return new Response(JSON.stringify({ error: 'Não é possível impersonar outro super_admin' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get target user details
    const { data: { user: targetUser } } = await supabaseAdmin.auth.admin.getUserById(target_user_id);
    if (!targetUser) {
      return new Response(JSON.stringify({ error: 'Usuário alvo não encontrado no auth' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate a magic link (acts as temp token, expires in 1h by default)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email!,
    });

    if (linkError || !linkData) {
      throw new Error(linkError?.message || 'Erro ao gerar link de impersonação');
    }

    // Log the impersonation in audit_logs (mandatory)
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: caller.id,
      actor_email: caller.email,
      actor_role: 'super_admin',
      empresa_id: targetRole.empresa_id,
      action: 'user.impersonate',
      target_table: 'auth.users',
      target_id: target_user_id,
      metadata: {
        target_email: targetUser.email,
        target_role: targetRole.role,
        motivo: motivo.trim(),
      },
    });

    // Extract the hashed_token from the generated link
    const actionLink = linkData.properties?.action_link;
    // We return the token hash so the frontend can use verifyOtp
    const url = new URL(actionLink);
    const token_hash = url.searchParams.get('token') || linkData.properties?.hashed_token;

    return new Response(JSON.stringify({
      success: true,
      token_hash,
      email: targetUser.email,
      target_role: targetRole.role,
      empresa_id: targetRole.empresa_id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Erro impersonate-user:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
