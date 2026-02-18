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
    const search = url.searchParams.get('search') || '';
    const empresaFilter = url.searchParams.get('empresa_id') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = 20;

    // Get all users from auth
    const { data: { users: allUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (listError) throw listError;

    // Get all user_roles
    const { data: allRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role, empresa_id, consultora_id');

    // Get all empresas for mapping
    const { data: empresas } = await supabaseAdmin
      .from('empresas')
      .select('id, nome, slug');

    const empresaMap = new Map(empresas?.map(e => [e.id, e]) || []);
    const roleMap = new Map<string, any>();
    allRoles?.forEach(r => {
      roleMap.set(r.user_id, r);
    });

    // Build user list with role info
    let users = allUsers.map(u => {
      const role = roleMap.get(u.id);
      const empresa = role ? empresaMap.get(role.empresa_id) : null;
      return {
        id: u.id,
        email: u.email || '',
        role: role?.role || null,
        empresa_id: role?.empresa_id || null,
        empresa_nome: empresa?.nome || null,
        empresa_slug: empresa?.slug || null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      };
    });

    // Apply filters
    if (search) {
      const s = search.toLowerCase();
      users = users.filter(u => u.email.toLowerCase().includes(s));
    }
    if (empresaFilter) {
      users = users.filter(u => u.empresa_id === empresaFilter);
    }

    return new Response(JSON.stringify({
      users,
      total: users.length,
      page,
      per_page: perPage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Erro list-users-admin:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
