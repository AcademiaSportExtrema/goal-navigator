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

const ENUM_SQL = {
  ajuste_status: `DO $$ BEGIN
  CREATE TYPE public.ajuste_status AS ENUM ('pendente', 'aprovado', 'rejeitado');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  app_role: `DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'consultora', 'super_admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  campo_alvo: `DO $$ BEGIN
  CREATE TYPE public.campo_alvo AS ENUM ('produto', 'plano', 'modalidades', 'forma_pagamento', 'condicao_pagamento', 'empresa', 'situacao_contrato', 'resp_venda', 'resp_recebimento');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  coach_diretriz_tipo: `DO $$ BEGIN
  CREATE TYPE public.coach_diretriz_tipo AS ENUM ('permitido', 'proibido');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  cobranca_evento_tipo: `DO $$ BEGIN
  CREATE TYPE public.cobranca_evento_tipo AS ENUM ('tentativa_contato', 'pagamento_confirmado');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  cobranca_status: `DO $$ BEGIN
  CREATE TYPE public.cobranca_status AS ENUM ('pendente', 'em_contato', 'pago');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  operador_regra: `DO $$ BEGIN
  CREATE TYPE public.operador_regra AS ENUM ('contem', 'igual', 'comeca_com', 'termina_com', 'regex');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  regra_mes: `DO $$ BEGIN
  CREATE TYPE public.regra_mes AS ENUM ('DATA_LANCAMENTO', 'DATA_INICIO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  responsavel_campo: `DO $$ BEGIN
  CREATE TYPE public.responsavel_campo AS ENUM ('resp_venda', 'resp_recebimento');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  ticket_prioridade: `DO $$ BEGIN
  CREATE TYPE public.ticket_prioridade AS ENUM ('baixa', 'media', 'alta', 'urgente');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  ticket_status: `DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM ('aberto', 'em_andamento', 'resolvido', 'fechado');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
  upload_status: `DO $$ BEGIN
  CREATE TYPE public.upload_status AS ENUM ('enviado', 'importando', 'concluido', 'erro');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`,
} as const;

const TABLE_ENUM_DEPENDENCIES: Partial<Record<(typeof EXPORTABLE_TABLES)[number], (keyof typeof ENUM_SQL)[]>> = {
  analise_email_config: [],
  analise_ia: [],
  audit_logs: ["app_role"],
  coach_diretrizes: ["coach_diretriz_tipo"],
  comissao_niveis: [],
  consultoras: [],
  dashboard_visibilidade: [],
  devedores_cobranca_historico: ["cobranca_evento_tipo"],
  devedores_parcelas: ["cobranca_status"],
  empresas: [],
  fechamento_caixa_f360: [],
  lancamentos: [],
  meta_anual: [],
  meta_anual_meses: [],
  meta_semanal: [],
  metas_consultoras: [],
  metas_mensais: [],
  pagamentos_agregadores: [],
  permissoes_perfil: ["app_role"],
  regras_meta: ["campo_alvo", "operador_regra", "responsavel_campo", "regra_mes"],
  solicitacoes_ajuste: ["ajuste_status"],
  support_messages: [],
  support_tickets: ["ticket_prioridade", "ticket_status"],
  system_settings: [],
  uploads: ["upload_status"],
  user_roles: ["app_role"],
};

const TABLE_SQL: Record<(typeof EXPORTABLE_TABLES)[number], string> = {
  empresas: `CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo boolean NOT NULL DEFAULT true,
  trial_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  nome text NOT NULL,
  slug text NOT NULL,
  logo_url text,
  subscription_status text NOT NULL DEFAULT 'active'
);`,
  consultoras: `CREATE TABLE IF NOT EXISTS public.consultoras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  empresa_id uuid NOT NULL,
  nome text NOT NULL,
  email text
);`,
  user_roles: `CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  consultora_id uuid,
  created_at timestamptz DEFAULT now(),
  empresa_id uuid NOT NULL
);`,
  uploads: `CREATE TABLE IF NOT EXISTS public.uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  criado_em timestamptz DEFAULT now(),
  status public.upload_status DEFAULT 'enviado',
  resumo jsonb DEFAULT '{}'::jsonb,
  erros jsonb DEFAULT '[]'::jsonb,
  empresa_id uuid NOT NULL,
  arquivo_path text NOT NULL,
  arquivo_nome text NOT NULL
);`,
  lancamentos: `CREATE TABLE IF NOT EXISTS public.lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL,
  data_cadastro date,
  data_inicio date,
  data_termino date,
  data_lancamento date,
  valor numeric DEFAULT 0,
  entra_meta boolean DEFAULT false,
  pendente_regra boolean DEFAULT true,
  regra_aplicada_id uuid,
  created_at timestamptz DEFAULT now(),
  empresa_id uuid NOT NULL,
  condicao_pagamento text,
  empresa text,
  consultora_chave text,
  mes_competencia text,
  motivo_classificacao text,
  hash_linha text,
  produto text,
  matricula text,
  nome_cliente text,
  resp_venda text,
  resp_recebimento text,
  numero_contrato text,
  duracao text,
  modalidades text,
  turmas text,
  categoria text,
  plano text,
  situacao_contrato text,
  forma_pagamento text
);`,
  regras_meta: `CREATE TABLE IF NOT EXISTS public.regras_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo boolean DEFAULT true,
  prioridade integer NOT NULL,
  campo_alvo public.campo_alvo NOT NULL,
  operador public.operador_regra NOT NULL,
  entra_meta boolean NOT NULL,
  responsavel_campo public.responsavel_campo DEFAULT 'resp_venda',
  regra_mes public.regra_mes DEFAULT 'DATA_LANCAMENTO',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  empresa_id uuid NOT NULL,
  valor text NOT NULL,
  observacao text
);`,
  permissoes_perfil: `CREATE TABLE IF NOT EXISTS public.permissoes_perfil (
  role public.app_role NOT NULL,
  permitido boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  empresa_id uuid NOT NULL,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rota text NOT NULL
);`,
  coach_diretrizes: `CREATE TABLE IF NOT EXISTS public.coach_diretrizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  tipo public.coach_diretriz_tipo NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  texto text NOT NULL
);`,
  analise_email_config: `CREATE TABLE IF NOT EXISTS public.analise_email_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  email text NOT NULL
);`,
  analise_ia: `CREATE TABLE IF NOT EXISTS public.analise_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  upload_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  mes_referencia text NOT NULL,
  conteudo text NOT NULL
);`,
  dashboard_visibilidade: `CREATE TABLE IF NOT EXISTS public.dashboard_visibilidade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  visivel boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  componente text NOT NULL
);`,
  meta_anual: `CREATE TABLE IF NOT EXISTS public.meta_anual (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  ano integer NOT NULL,
  meta_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,
  meta_anual_meses: `CREATE TABLE IF NOT EXISTS public.meta_anual_meses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_anual_id uuid NOT NULL,
  mes integer NOT NULL,
  peso_percent numeric NOT NULL DEFAULT 0,
  empresa_id uuid NOT NULL
);`,
  metas_mensais: `CREATE TABLE IF NOT EXISTS public.metas_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_total numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  empresa_id uuid NOT NULL,
  mes_referencia text NOT NULL
);`,
  meta_semanal: `CREATE TABLE IF NOT EXISTS public.meta_semanal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_mensal_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  semana integer NOT NULL,
  peso_percent numeric NOT NULL DEFAULT 25,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  metas_consultoras: `CREATE TABLE IF NOT EXISTS public.metas_consultoras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_mensal_id uuid NOT NULL,
  consultora_id uuid NOT NULL,
  percentual numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  empresa_id uuid NOT NULL
);`,
  comissao_niveis: `CREATE TABLE IF NOT EXISTS public.comissao_niveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_mensal_id uuid NOT NULL,
  nivel integer NOT NULL,
  de_percent numeric NOT NULL,
  ate_percent numeric NOT NULL,
  comissao_percent numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  empresa_id uuid NOT NULL
);`,
  pagamentos_agregadores: `CREATE TABLE IF NOT EXISTS public.pagamentos_agregadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  data_recebimento date,
  valor numeric NOT NULL DEFAULT 0,
  quantidade_clientes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  agregador text NOT NULL,
  mes_referencia text NOT NULL,
  observacao text
);`,
  fechamento_caixa_f360: `CREATE TABLE IF NOT EXISTS public.fechamento_caixa_f360 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  data date NOT NULL,
  valor_f360 numeric NOT NULL DEFAULT 0,
  valor_pix_f360 numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  audit_logs: `CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid NOT NULL,
  actor_role public.app_role,
  empresa_id uuid,
  target_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  action text NOT NULL,
  target_table text,
  actor_email text
);`,
  support_tickets: `CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  empresa_id uuid NOT NULL,
  created_by uuid NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'aberto',
  prioridade public.ticket_prioridade NOT NULL DEFAULT 'media',
  assigned_to uuid,
  assunto text NOT NULL,
  descricao text NOT NULL
);`,
  support_messages: `CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  ticket_id uuid NOT NULL,
  user_id uuid NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  mensagem text NOT NULL
);`,
  solicitacoes_ajuste: `CREATE TABLE IF NOT EXISTS public.solicitacoes_ajuste (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id uuid NOT NULL,
  consultora_id uuid NOT NULL,
  status public.ajuste_status NOT NULL DEFAULT 'pendente',
  admin_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  empresa_id uuid NOT NULL,
  resp_recebimento_atual text,
  resp_recebimento_novo text NOT NULL,
  justificativa text NOT NULL,
  admin_comentario text,
  numero_contrato text,
  nome_cliente text
);`,
  devedores_parcelas: `CREATE TABLE IF NOT EXISTS public.devedores_parcelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  data_vencimento date,
  valor_parcela numeric DEFAULT 0,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  cobranca_enviada boolean NOT NULL DEFAULT false,
  status_cobranca public.cobranca_status NOT NULL DEFAULT 'pendente',
  ultimo_contato_em timestamptz,
  pago_em timestamptz,
  nome text,
  consultor text,
  contrato text,
  codigo_parcela text,
  parcela text,
  cod_empresa text,
  convenio text,
  em_remessa text,
  arquivo_nome text,
  chave_cobranca text,
  ultima_observacao text
);`,
  devedores_cobranca_historico: `CREATE TABLE IF NOT EXISTS public.devedores_cobranca_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  devedor_parcela_id uuid,
  tipo public.cobranca_evento_tipo NOT NULL,
  contato_em timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  created_by_label text NOT NULL,
  chave_cobranca text NOT NULL,
  observacao text
);`,
  system_settings: `CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  updated_at timestamptz NOT NULL DEFAULT now(),
  value text NOT NULL
);`,
};

type ExportAction =
  | "bundle"
  | "database-all"
  | "database-table"
  | "users"
  | "storages"
  | "logs"
  | "schema-table"
  | "schema-all";
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

const buildSchemaSql = (table?: ExportTable) => {
  const tables = table ? [table] : [...EXPORTABLE_TABLES];
  const enumNames = [...new Set(tables.flatMap((tableName) => TABLE_ENUM_DEPENDENCIES[tableName] || []))];
  const enumSql = enumNames.map((enumName) => ENUM_SQL[enumName]).join("\n\n");
  const tableSql = tables.map((tableName) => TABLE_SQL[tableName]).join("\n\n");

  return [
    "-- SQL base das tabelas públicas do sistema",
    "-- Inclui enums e CREATE TABLE.",
    "-- Não inclui RLS, policies, funções, triggers ou chaves estrangeiras.",
    'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
    enumSql,
    tableSql,
  ]
    .filter(Boolean)
    .join("\n\n");
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

    if ((action === "schema-table" || action === "schema-all") && requestedTable && !EXPORTABLE_TABLES.includes(requestedTable)) {
      return new Response(JSON.stringify({ error: "Tabela inválida para SQL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "schema-table") {
      if (!requestedTable) {
        return new Response(JSON.stringify({ error: "Tabela obrigatória para gerar SQL" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          filename: `${requestedTable}.sql`,
          sql: buildSchemaSql(requestedTable),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "schema-all") {
      return new Response(
        JSON.stringify({
          filename: "schema_public.sql",
          sql: buildSchemaSql(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        return fetchPaginated((from, to) => supabaseAdmin.from("support_messages").select("*").range(from, to));
      }

      const ticketRows = await fetchPaginated((from, to) =>
        supabaseAdmin.from("support_tickets").select("id").eq("empresa_id", empresaId).range(from, to)
      );

      const ticketIds = ticketRows.map((row) => row.id).filter(Boolean) as string[];
      if (ticketIds.length === 0) return [];

      const messageRows: JsonRow[] = [];
      for (const ticketChunk of chunk(ticketIds, 100)) {
        const rows = await fetchPaginated((from, to) =>
          supabaseAdmin.from("support_messages").select("*").in("ticket_id", ticketChunk).range(from, to)
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
