

# Consolidacao Multi-Tenant e Console Superadmin

## Diagnostico (ETAPA A) -- O que ja existe

### Arquitetura Multi-Tenant
- Isolamento via `empresa_id` em TODAS as tabelas principais (lancamentos, consultoras, uploads, regras_meta, metas_mensais, metas_consultoras, permissoes_perfil, solicitacoes_ajuste, comissao_niveis, user_roles)
- RLS ativo em todas as tabelas com policies usando `get_user_empresa_id(auth.uid())`
- Funcoes security definer: `has_role()`, `get_user_empresa_id()`, `get_user_consultora_id()`, `is_empresa_active()`

### Sistema de Roles
- Enum `app_role`: `admin`, `consultora`, `super_admin`
- Tabela `user_roles` funciona como membership (user_id + empresa_id + role + consultora_id)
- Nao existe tabela `memberships` separada -- `user_roles` cumpre este papel

### Super Admin
- Identificado via `has_role(uid, 'super_admin')` na tabela `user_roles`
- Telas existentes: `/super-admin/empresas`, `/super-admin/empresa/nova`, `/super-admin/financeiro`, `/super-admin/integracoes`
- `ProtectedRoute` com `requiredRole="super_admin"` protege as rotas
- Super admin tem bypass de todas as restricoes no frontend

### Edge Functions (7 existentes)
- `create-empresa`: valida super_admin via `has_role()` + service_role_key
- `manage-consultora-access`: valida admin via `has_role()`
- `admin-reset-password`: valida admin via `has_role()`
- `upload-importar-xls`, `classificar-meta`, `ai-coach`, `save-integration-key`

### O que NAO existe
- Tabela `audit_logs` (nenhuma acao admin e auditada)
- Sistema de suporte/tickets
- Visao de usuarios por empresa no console super admin
- Impersonation

---

## Plano de Implementacao (Incremental, sem quebrar nada)

### FASE 1 -- Audit Logs (Fundacao de seguranca)

**Migration SQL:**
Criar tabela `audit_logs`:

```text
audit_logs
  id: uuid (PK)
  created_at: timestamptz
  actor_id: uuid (quem fez a acao)
  actor_email: text
  actor_role: app_role
  empresa_id: uuid (nullable, para acoes cross-tenant do superadmin)
  action: text (ex: 'empresa.toggle_ativo', 'consultora.create', 'lancamento.delete')
  target_table: text
  target_id: uuid (nullable)
  metadata: jsonb (detalhes da acao, ex: valores antes/depois)
```

- RLS: super_admin ve tudo; admin ve apenas logs da sua empresa; consultora nao ve
- INSERT policy aberta para authenticated (para edge functions poderem inserir)

**Edge Function `audit-log`:**
- Endpoint simples que recebe acao, target, metadata
- Valida JWT, extrai actor_id/email/role automaticamente
- Grava na tabela

**Integracao nos fluxos existentes:**
- Deletar lancamento (Gerencial.tsx) -> registra log
- Toggle ativo empresa (Empresas.tsx) -> registra log
- Todas as edge functions existentes adicionam chamada de audit log apos cada operacao critica

### FASE 2 -- Console Superadmin Aprimorado

**Rota `/super-admin/empresas/:id` (Visao 360 da empresa):**
- Dados da empresa (nome, slug, status, trial, created_at)
- Lista de usuarios/roles vinculados (query em user_roles + auth metadata via edge function)
- Contadores: total consultoras, total lancamentos, total uploads
- Acoes: ativar/desativar, alterar status assinatura
- Historico de audit_logs filtrado pela empresa

**Rota `/super-admin/usuarios` (Busca global de usuarios):**
- Edge function `list-users-admin` que usa service_role para listar usuarios
- Tabela: email, role, empresa vinculada, status
- Busca por email
- Acao: resetar senha (ja existe edge function)

**Edge function `admin-empresa-details`:**
- Valida super_admin
- Retorna: dados empresa + contagem usuarios + contagem lancamentos + logs recentes
- Usa service_role para acessar dados cross-tenant

**Edge function `list-users-admin`:**
- Valida super_admin
- Lista usuarios do auth com seus roles e empresas
- Suporta busca por email e filtro por empresa

### FASE 3 -- Sistema de Suporte (Tickets)

**Migration SQL:**
Criar tabelas:

```text
support_tickets
  id: uuid (PK)
  created_at: timestamptz
  updated_at: timestamptz
  empresa_id: uuid
  created_by: uuid (user_id)
  assunto: text
  descricao: text
  status: enum (aberto, em_andamento, resolvido, fechado)
  prioridade: enum (baixa, media, alta, urgente)
  assigned_to: uuid (nullable, super_admin responsavel)

support_messages
  id: uuid (PK)
  created_at: timestamptz
  ticket_id: uuid (FK -> support_tickets)
  user_id: uuid
  mensagem: text
  is_internal: boolean (nota interna, visivel so para super_admin)
```

- RLS: admin da empresa ve/cria tickets da sua empresa; super_admin ve todos
- Consultoras NAO tem acesso a tickets

**Rotas:**
- `/super-admin/tickets`: fila geral com filtros (status, prioridade, empresa)
- Dentro da visao 360 da empresa: tickets daquela empresa
- Admins de empresa: link no sidebar para abrir ticket (futuro, opcional)

### FASE 4 -- Impersonation (Opcional, com seguranca maxima)

**Edge function `impersonate-user`:**
- Valida super_admin
- Gera token temporario (via `auth.admin.generateLink` ou custom JWT com TTL de 30min)
- Registra em audit_logs: actor, target_user, empresa, motivo (obrigatorio)
- Retorna URL com token

**Frontend:**
- Banner fixo no topo "Voce esta impersonando [email] - [empresa]" com botao "Encerrar"
- Estado de impersonation armazenado em contexto (nao localStorage)

---

## Detalhes Tecnicos

### Arquivos que serao CRIADOS (novos)
- `supabase/migrations/xxx_audit_logs.sql`
- `supabase/migrations/xxx_support_tickets.sql`
- `supabase/functions/audit-log/index.ts`
- `supabase/functions/admin-empresa-details/index.ts`
- `supabase/functions/list-users-admin/index.ts`
- `src/pages/super-admin/EmpresaDetalhes.tsx`
- `src/pages/super-admin/Usuarios.tsx`
- `src/pages/super-admin/Tickets.tsx`

### Arquivos que serao MODIFICADOS (com cuidado)
- `src/App.tsx` -- adicionar novas rotas super-admin
- `src/components/layout/AppSidebar.tsx` -- adicionar itens no menu super-admin
- `src/pages/super-admin/Empresas.tsx` -- adicionar link para visao 360
- `src/pages/Gerencial.tsx` -- adicionar chamada de audit log no delete
- `supabase/config.toml` -- registrar novas edge functions
- Edge functions existentes (`create-empresa`, `manage-consultora-access`, `admin-reset-password`) -- adicionar chamada de audit log

### Arquivos que NAO serao tocados
- `src/hooks/useAuth.tsx` (nenhuma mudanca no sistema de auth)
- `src/hooks/usePermissions.ts` (sistema de permissoes intacto)
- `src/components/layout/ProtectedRoute.tsx` (logica de protecao nao muda)
- `src/integrations/supabase/client.ts` (auto-gerado)
- Todas as paginas de admin/consultora existentes (Dashboard, Upload, Regras, etc.)

### Seguranca
- Todas as operacoes de super_admin usam Edge Functions com service_role_key
- JWT validado em TODAS as edge functions via `auth.getUser()`
- Role validado via `has_role()` no backend
- Frontend nunca faz bypass de RLS
- Audit logs registram TODA acao administrativa

### Ordem de implementacao recomendada
1. Fase 1 (audit_logs) -- base para tudo, pode ser feita isoladamente
2. Fase 2 (console aprimorado) -- valor imediato para suporte
3. Fase 3 (tickets) -- opcional, depende da necessidade
4. Fase 4 (impersonation) -- so se necessario, maior complexidade

Sugiro implementar Fase 1 e Fase 2 primeiro. Fases 3 e 4 podem ser feitas depois conforme necessidade.

