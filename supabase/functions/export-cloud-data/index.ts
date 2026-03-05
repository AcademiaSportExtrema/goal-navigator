import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAGE_SIZE = 1000;
const AUTH_PAGE_SIZE = 200;
const EXPORTABLE_TABLES = [
  "analise_email_config",
  "analise_ia",
  "audit_logs",
  "coach_diretrizes",
  "comissao_niveis",
  "consultoras",
  "dashboard_visibilidade",
  "devedores_cobranca_historico",
  "devedores_parcelas",
  "empresas",
  "fechamento_caixa_f360",
  "lancamentos",
  "meta_anual",
  "meta_anual_meses",
  "meta_semanal",
  "metas_consultoras",
  "metas_mensais",
  "pagamentos_agregadores",
  "permissoes_perfil",
  "regras_meta",
  "solicitacoes_ajuste",
  "support_messages",
  "support_tickets",
  "system_settings",
  "uploads",
  "user_roles",
] as const;

type ExportAction = "bundle" | "database-all" | "database-table" | "users" | "storages" | "logs";
type ExportTable = (typeof EXPORTABLE_TABLES)[number];
type JsonRow = Record<string, unknown>;

const tableHasEmpresaId = (table: ExportTable) =>
  !["empresas", "support_messages", "system_settings"].includes(table);

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const sanitizeFilenamePart = (value: string | null) =>
  (value || "all")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "all";

const extractLogoPath = (logoUrl: string | null) => {
  if (!logoUrl) return "";

  try {
    const url = new URL(logoUrl);
    const marker = "/object/public/logos/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex >= 0) {
      return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    }
    return decodeURIComponent(url.pathname.split("/").slice(-2).join("/"));
  } catch {
    return logoUrl;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Configuração do backend incompleta");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
      error: callerError,
    } = await supabaseAdmin.auth.getUser(token);

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as ExportAction | undefined;
    const requestedTable = body.table as ExportTable | undefined;
    const requestedEmpresaId = typeof body.empresa_id === "string" && body.empresa_id.trim() ? body.empresa_id : null;

    if (!action) {
      return new Response(JSON.stringify({ error: "Ação de exportação obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: isSuperAdmin }, { data: isAdmin }] = await Promise.all([
      supabaseAdmin.rpc("has_role", { _user_id: caller.id, _role: "super_admin" }),
      supabaseAdmin.rpc("has_role", { _user_id: caller.id, _role: "admin" }),
    ]);

    if (!isSuperAdmin && !isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso restrito a administradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ownEmpresaId } = await supabaseAdmin.rpc("get_user_empresa_id", { _user_id: caller.id });
    if (!isSuperAdmin && !ownEmpresaId) {
      return new Response(JSON.stringify({ error: "Administrador sem empresa vinculada" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scopeEmpresaId = isSuperAdmin ? requestedEmpresaId : ownEmpresaId;
    const filenameScope = sanitizeFilenamePart(scopeEmpresaId);

    const fetchPaginated = async (buildQuery: (from: number, to: number) => any) => {
      const rows: JsonRow[] = [];
      let from = 0;

      while (true) {
        const to = from + PAGE_SIZE - 1;
        const { data, error } = await buildQuery(from, to);

        if (error) throw error;

        const pageRows = (data || []) as JsonRow[];
        rows.push(...pageRows);

        if (pageRows.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      return rows;
    };

    const fetchSupportMessageRows = async (empresaId: string | null) => {
      if (!empresaId) {
        return fetchPaginated((from, to) =>
          supabaseAdmin.from("support_messages").select("*").range(from, to)
        );
      }

      const ticketRows = await fetchPaginated((from, to) =>
        supabaseAdmin
          .from("support_tickets")
          .select("id")
          .eq("empresa_id", empresaId)
          .range(from, to)
      );

      const ticketIds = ticketRows.map((row) => row.id).filter(Boolean) as string[];
      if (ticketIds.length === 0) return [];

      const messageRows: JsonRow[] = [];
      for (const ticketChunk of chunk(ticketIds, 100)) {
        const rows = await fetchPaginated((from, to) =>
          supabaseAdmin
            .from("support_messages")
            .select("*")
            .in("ticket_id", ticketChunk)
            .range(from, to)
        );
        messageRows.push(...rows);
      }

      return messageRows;
    };

    const fetchTableRows = async (table: ExportTable, empresaId: string | null): Promise<JsonRow[]> => {
      if (table === "system_settings" && empresaId) {
        return [];
      }

      if (table === "support_messages") {
        return fetchSupportMessageRows(empresaId);
      }

      return fetchPaginated((from, to) => {
        let query = supabaseAdmin.from(table).select("*").range(from, to);

        if (empresaId) {
          if (table === "empresas") {
            query = query.eq("id", empresaId);
          } else if (tableHasEmpresaId(table)) {
            query = query.eq("empresa_id", empresaId);
          }
        }

        return query;
      });
    };

    const buildDatabaseFiles = async () => {
      const tablesToExport = requestedTable ? [requestedTable] : [...EXPORTABLE_TABLES];
      const files: { filename: string; rows: JsonRow[] }[] = [];

      for (const table of tablesToExport) {
        const rows = await fetchTableRows(table, scopeEmpresaId);
        if (rows.length === 0) continue;

        files.push({
          filename: `${table}_${filenameScope}.csv`,
          rows,
        });
      }

      return files;
    };

    const buildUsersFile = async () => {
      const roleRows = await fetchTableRows("user_roles", scopeEmpresaId);
      const empresaRows = await fetchTableRows("empresas", scopeEmpresaId);
      const empresaMap = new Map(empresaRows.map((row) => [row.id, row]));

      const roleMap = new Map<string, JsonRow[]>();
      for (const row of roleRows) {
        const userId = String(row.user_id || "");
        if (!userId) continue;
        const current = roleMap.get(userId) || [];
        current.push(row);
        roleMap.set(userId, current);
      }

      const users: JsonRow[] = [];
      let page = 1;

      while (true) {
        const {
          data: { users: authUsers },
          error,
        } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: AUTH_PAGE_SIZE });

        if (error) throw error;

        const filteredUsers = authUsers.filter((authUser) => {
          if (!scopeEmpresaId) return true;
          return roleMap.has(authUser.id);
        });

        for (const authUser of filteredUsers) {
          const roles = roleMap.get(authUser.id) || [];
          const empresaIds = [...new Set(roles.map((row) => row.empresa_id).filter(Boolean))] as string[];
          const empresas = empresaIds
            .map((empresaId) => empresaMap.get(empresaId))
            .filter(Boolean)
            .map((empresa) => String(empresa?.nome || empresa?.slug || ""))
            .filter(Boolean);

          users.push({
            id: authUser.id,
            email: authUser.email || "",
            roles: roles.map((row) => row.role).filter(Boolean).join(", "),
            empresa_ids: empresaIds.join(", "),
            empresas: empresas.join(", "),
            consultora_ids: roles.map((row) => row.consultora_id).filter(Boolean).join(", "),
            created_at: authUser.created_at,
            last_sign_in_at: authUser.last_sign_in_at,
            email_confirmed_at: authUser.email_confirmed_at,
            phone: authUser.phone || "",
            is_anonymous: authUser.is_anonymous,
          });
        }

        if (authUsers.length < AUTH_PAGE_SIZE) break;
        page += 1;
      }

      return {
        filename: `users_${filenameScope}.csv`,
        rows: users,
      };
    };

    const buildStoragesFile = async () => {
      const uploadRows = await fetchTableRows("uploads", scopeEmpresaId);
      const empresaRows = await fetchTableRows("empresas", scopeEmpresaId);

      const rows: JsonRow[] = [
        ...uploadRows.map((row) => ({
          source: "uploads_table",
          bucket: "uploads",
          empresa_id: row.empresa_id,
          object_path: row.arquivo_path,
          file_name: row.arquivo_nome,
          linked_record_id: row.id,
          user_id: row.user_id,
          status: row.status,
          created_at: row.criado_em,
        })),
        ...empresaRows
          .filter((row) => row.logo_url)
          .map((row) => ({
            source: "empresas.logo_url",
            bucket: "logos",
            empresa_id: row.id,
            object_path: extractLogoPath(String(row.logo_url || "")),
            file_name: extractLogoPath(String(row.logo_url || "")).split("/").pop() || "",
            linked_record_id: row.id,
            public_url: row.logo_url,
            created_at: row.created_at,
          })),
      ];

      return {
        filename: `storages_${filenameScope}.csv`,
        rows,
      };
    };

    const buildLogsFile = async () => ({
      filename: `audit_logs_${filenameScope}.csv`,
      rows: await fetchTableRows("audit_logs", scopeEmpresaId),
    });

    const files: { filename: string; rows: JsonRow[] }[] = [];

    if (action === "database-all") {
      files.push(...await buildDatabaseFiles());
    } else if (action === "database-table") {
      if (!requestedTable || !EXPORTABLE_TABLES.includes(requestedTable)) {
        return new Response(JSON.stringify({ error: "Tabela inválida para exportação" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      files.push(...await buildDatabaseFiles());
    } else if (action === "users") {
      files.push(await buildUsersFile());
    } else if (action === "storages") {
      files.push(await buildStoragesFile());
    } else if (action === "logs") {
      files.push(await buildLogsFile());
    } else if (action === "bundle") {
      files.push(...await buildDatabaseFiles());
      files.push(await buildUsersFile());
      files.push(await buildStoragesFile());
    } else {
      return new Response(JSON.stringify({ error: "Ação inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nonEmptyFiles = files.filter((file) => Array.isArray(file.rows) && file.rows.length > 0);

    return new Response(JSON.stringify({ files: nonEmptyFiles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao exportar dados";
    console.error("Erro export-cloud-data:", message, error);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
