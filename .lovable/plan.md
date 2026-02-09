

# Implementacao Completa: Sistema Multi-Empresa

Nada do plano multi-empresa foi implementado ainda no banco de dados ou no codigo (exceto a aba Integracoes). Este plano cobre toda a implementacao em fases.

---

## Fase 1 - Banco de Dados e Infraestrutura

### 1.1 Criar tabela `empresas`
Nova tabela com campos: id, nome, slug (unique), ativo, subscription_status, trial_ends_at, created_at, updated_at. Campos de pagamento serao adicionados na fase do AbacatePay.

### 1.2 Adicionar `empresa_id` em todas as tabelas existentes
Adicionar coluna `empresa_id uuid REFERENCES empresas(id)` como nullable (para nao quebrar dados existentes) nas tabelas:
- consultoras, lancamentos, uploads, regras_meta, metas_mensais, metas_consultoras, comissao_niveis, permissoes_perfil, solicitacoes_ajuste, user_roles

### 1.3 Adicionar `super_admin` ao enum `app_role`
```text
ALTER TYPE app_role ADD VALUE 'super_admin';
```

### 1.4 Criar empresa padrao e migrar dados
- Inserir uma empresa padrao (nome: "Empresa Principal", slug: "principal", ativo: true, subscription_status: "active")
- Atualizar todos os registros existentes em todas as tabelas para apontar para essa empresa
- Tornar empresa_id NOT NULL apos a migracao

### 1.5 Criar funcoes de seguranca

**`get_user_empresa_id(uuid) -> uuid`**
Retorna o empresa_id do usuario a partir de user_roles.

**`is_empresa_active(uuid) -> boolean`**
Verifica se subscription_status = 'active' ou trial valido.

### 1.6 Atualizar politicas RLS
Remover politicas existentes e criar novas que filtram por empresa_id:
- SELECT: `empresa_id = get_user_empresa_id(auth.uid()) OR has_role(auth.uid(), 'super_admin')`
- ALL (admin): `has_role(auth.uid(), 'admin') AND empresa_id = get_user_empresa_id(auth.uid())`
- Super admin tem acesso irrestrito

### 1.7 Atualizar funcao `search_lancamentos_for_ajuste`
Adicionar filtro por empresa_id do usuario autenticado.

### 1.8 Atualizar funcao `handle_new_user_role`
Considerar empresa_id ao criar role automaticamente.

---

## Fase 2 - Frontend: Auth e Bloqueio

### 2.1 Atualizar `src/types/database.ts`
- Adicionar `'super_admin'` ao tipo `AppRole`
- Adicionar interface `Empresa` com todos os campos

### 2.2 Atualizar `src/hooks/useAuth.tsx`
Adicionar ao contexto:
- `empresaId: string | null` - buscado de user_roles
- `isSuperAdmin: boolean` - role === 'super_admin'
- `empresaAtiva: boolean` - consultado da tabela empresas
- Buscar empresa_id junto com role no login

### 2.3 Atualizar `src/components/layout/ProtectedRoute.tsx`
- Se `isSuperAdmin` e rota comeca com `/super-admin`: permitir
- Se empresa nao ativa e nao e super_admin: redirecionar para `/empresa-bloqueada`
- Manter logica existente para admin/consultora

### 2.4 Criar pagina `/empresa-bloqueada`
- `src/pages/EmpresaBloqueada.tsx`
- Mensagem informando que a assinatura esta inativa
- Botao para entrar em contato
- Botao de logout

---

## Fase 3 - Painel Super Admin

### 3.1 Criar paginas super admin
- `src/pages/super-admin/Empresas.tsx` - Listar empresas com status, criar, editar, ativar/desativar
- `src/pages/super-admin/NovaEmpresa.tsx` - Formulario de onboarding (nome, slug, email do admin, cria empresa + usuario admin)
- `src/pages/super-admin/Financeiro.tsx` - Visao geral de empresas com status de pagamento

### 3.2 Criar edge function `create-empresa`
- Cria a empresa no banco
- Cria usuario admin via auth.admin.createUser
- Vincula user_role com empresa_id
- Cria permissoes padrao para a empresa

### 3.3 Atualizar `src/components/layout/AppSidebar.tsx`
Adicionar menu condicional para super_admin:
- Empresas (Building icon)
- Nova Empresa (PlusCircle icon)
- Financeiro (DollarSign icon)

### 3.4 Atualizar `src/App.tsx`
Adicionar rotas:
- `/super-admin/empresas`
- `/super-admin/empresa/nova`
- `/super-admin/financeiro`
- `/empresa-bloqueada`
Todas protegidas com ProtectedRoute

---

## Fase 4 - Integracao AbacatePay

### 4.1 Edge function `save-integration-key`
- Recebe a chave da API do AbacatePay
- Salva como secret no backend
- Apenas super_admin pode executar

### 4.2 Atualizar `IntegracoesTab.tsx`
- Chamar a edge function save-integration-key ao salvar
- Buscar status da integracao (se a chave ja foi configurada)

### 4.3 Edge function `abacatepay-webhook`
- Recebe eventos do AbacatePay
- Atualiza subscription_status na tabela empresas
- Pagamento confirmado -> active
- Pagamento falhou -> past_due
- Cancelado -> canceled

### 4.4 Edge function `create-billing`
- Cria cobranca/assinatura no AbacatePay para uma empresa
- Chamado pelo super_admin ao criar empresa ou reativar

---

## Fase 5 - Ajustes Finais

### 5.1 Atualizar edge functions existentes
Adicionar contexto de empresa_id nas funcoes:
- `manage-consultora-access` - associar empresa_id ao criar user_role
- `upload-importar-xls` - associar empresa_id aos lancamentos importados
- `classificar-meta` - filtrar regras por empresa_id
- `admin-reset-password` - verificar mesma empresa

### 5.2 Atualizar `usePermissions.ts`
Garantir que permissoes sao filtradas por empresa_id.

### 5.3 Atualizar queries existentes
Todas as queries de listagem (consultoras, lancamentos, metas, etc.) ja serao filtradas automaticamente pelas RLS, mas revisar para garantir compatibilidade com os novos campos.

---

## Resumo de Arquivos

**Novos arquivos:**
- `src/pages/EmpresaBloqueada.tsx`
- `src/pages/super-admin/Empresas.tsx`
- `src/pages/super-admin/NovaEmpresa.tsx`
- `src/pages/super-admin/Financeiro.tsx`
- `supabase/functions/create-empresa/index.ts`
- `supabase/functions/save-integration-key/index.ts`
- `supabase/functions/abacatepay-webhook/index.ts`
- `supabase/functions/create-billing/index.ts`

**Arquivos modificados:**
- `src/types/database.ts` - novo tipo Empresa, AppRole atualizado
- `src/hooks/useAuth.tsx` - empresaId, isSuperAdmin, empresaAtiva
- `src/hooks/usePermissions.ts` - filtro por empresa
- `src/components/layout/ProtectedRoute.tsx` - bloqueio e super_admin
- `src/components/layout/AppSidebar.tsx` - menu super_admin
- `src/components/configuracao/IntegracoesTab.tsx` - salvar via edge function
- `src/App.tsx` - novas rotas
- `supabase/functions/manage-consultora-access/index.ts` - empresa_id
- `supabase/functions/upload-importar-xls/index.ts` - empresa_id
- `supabase/functions/classificar-meta/index.ts` - empresa_id

**Migracao SQL:** Uma migracao grande cobrindo tabela empresas, empresa_id em todas as tabelas, enum super_admin, funcoes de seguranca, RLS atualizado, e seed da empresa padrao.

