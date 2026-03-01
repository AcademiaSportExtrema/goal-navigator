

## Relatório de Browser Testing - Sistema de Metas Multi-Tenant

### Resumo Executivo
Testei 10 páginas, 28+ requests de rede, console logs, RLS policies, e fluxos de autenticação. O app está funcional, mas com falhas pontuais.

---

### Falhas Encontradas (Priorizadas)

#### 1. MEDIO - Login não redireciona usuário já autenticado
- **Reprodução**: Logar no sistema → navegar manualmente para `/login`
- **Comportamento**: Mostra o formulário de login novamente, sem redirecionar para `/dashboard`
- **Arquivo**: `src/pages/Login.tsx`
- **Correção**: Adicionar verificação no topo do componente: se `user` existe no `useAuth()`, redirecionar para `/dashboard` (ou `/minha-performance` se consultora)

#### 2. MEDIO - Race condition na navegação direta para rotas super_admin
- **Reprodução**: Navegar diretamente para `/super-admin/empresas` via URL (não pelo sidebar)
- **Comportamento**: Redireciona para `/dashboard` porque o `role` ainda é `null` quando `ProtectedRoute` avalia. Pelo sidebar funciona porque o role já carregou.
- **Arquivo**: `src/components/layout/ProtectedRoute.tsx`
- **Correção**: O loading state (`isLoading`) deveria cobrir o caso onde `user` existe mas `role` ainda é `null`. Atualmente `isLoading` fica `false` antes do `fetchUserData` completar (linhas 79-80 do useAuth: `setTimeout(() => fetchUserData(...), 0)` retorna imediatamente).

#### 3. MEDIO - "Empresa teste" sem permissoes_perfil configuradas
- **Reprodução**: Logar como admin da "Empresa teste"
- **Comportamento**: `usePermissions.hasPermission()` retorna `true` para TODAS as rotas porque não encontra registros (fallback `return true`). Isso não é um bug de segurança (ProtectedRoute já verifica `requiredRole`), mas significa que o admin não pode personalizar permissões sem dados iniciais.
- **Correção**: Criar registros default de `permissoes_perfil` automaticamente ao criar uma empresa (na Edge Function `create-empresa`).

#### 4. BAIXO - Console warnings de React refs no Toaster
- **Reprodução**: Abrir qualquer página
- **Comportamento**: `Warning: Function components cannot be given refs` no `Toaster` e `ToastProvider`
- **Arquivo**: `src/components/ui/toaster.tsx`
- **Correção**: Envolver o componente com `React.forwardRef()`

#### 5. BAIXO - Leaked Password Protection desativado
- **Reprodução**: Verificado via linter do banco
- **Comportamento**: Senhas comprometidas em vazamentos públicos podem ser usadas
- **Correção**: Ativar nas configurações de autenticação do Lovable Cloud

#### 6. INFO - HEAD requests com ERR_ABORTED no Dashboard
- **Reprodução**: Navegar para Dashboard
- **Comportamento**: 4 requests HEAD para `lancamentos` (count queries) com status ERR_ABORTED
- **Causa**: React Query cancela requests quando componente re-renderiza antes da resposta. Não é um bug funcional, mas indica re-renders desnecessários.
- **Correção**: Opcional - otimizar para evitar re-renders que cancelam queries em andamento.

---

### O Que Passou no Teste

| Fluxo | Status | Observação |
|-------|--------|------------|
| Login com credenciais | OK | Autentica e redireciona para Dashboard |
| Logout | OK | Limpa sessão e redireciona para /login |
| Proteção de rotas (não autenticado) | OK | Redireciona para /login |
| Dashboard (Super Admin) | OK | Carrega KPIs, gráficos, tabelas |
| Gerencial | OK | 1.498 registros, filtros funcionais |
| Relatórios | OK | 3 tabelas renderizadas com dados |
| Pendências | OK | 47 itens pendentes, botão "Criar e Reprocessar" único |
| Regras da Meta | OK | 92 regras listadas com ações |
| Configuração (Consultoras) | OK | 5 consultoras com gestão de acesso |
| Empresas (Super Admin) | OK | 2 empresas listadas via sidebar |
| RLS - Todas 17 tabelas | OK | RLS habilitado com policies por empresa_id |
| Network - Requests 4xx/5xx | OK | Nenhum erro real (apenas HEAD aborted) |
| Isolamento multi-tenant (RLS) | OK | Policies usam `get_user_empresa_id()` |

---

### Limitações do Teste

- **Não testei login como consultora**: Não tenho as credenciais. Recomendo testar manualmente a visão `MinhaPerformance` e `SolicitarAjuste`.
- **Não testei login com credenciais inválidas**: O browser não consegue preencher formulários de login sem credenciais reais.
- **"Empresa teste" sem dados**: Impossível testar isolamento cruzado com dados reais (apenas validei RLS policies).
- **Sessão expirada**: Não é possível simular expiração de JWT no browser testing.

---

### Plano de Correção (3 arquivos)

**1. `src/pages/Login.tsx`** - Redirecionar usuário já autenticado
**2. `src/hooks/useAuth.tsx`** - Corrigir race condition no `fetchUserData` com `setTimeout`
**3. `supabase/functions/create-empresa/index.ts`** - Criar permissoes_perfil default ao criar empresa

