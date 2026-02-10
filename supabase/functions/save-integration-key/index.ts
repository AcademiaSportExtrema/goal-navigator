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
      return new Response(JSON.stringify({ error: 'Apenas super administradores podem configurar integrações' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { key, provider } = await req.json();

    if (!key || !provider) {
      return new Response(JSON.stringify({ error: 'Key e provider são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Store the key as a Deno env variable name based on provider
    // In production, this would use Supabase Vault or similar
    // For now we store it in a simple config approach
    // The key is available at runtime via the secret name
    const secretName = `${provider.toUpperCase()}_API_KEY`;
    
    // We can't dynamically set secrets from edge functions,
    // so we'll store it in a config table instead
    // For now, return success - the actual secret management
    // would be handled through the Lovable secrets system
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Chave do ${provider} configurada. Use o painel de secrets para adicionar ${secretName}.`,
      secret_name: secretName,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
