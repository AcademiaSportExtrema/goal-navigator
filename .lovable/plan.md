

# Transformar Sistema em Multi-Empresa (Multi-Tenant)

## Resumo

Transformar o sistema atual (single-tenant) em uma plataforma multi-empresa com:
- Isolamento completo de dados entre empresas
- Novo papel **super_admin** para gerenciar empresas
- Controle de mensalidade integrado com **Stripe**
- Bloqueio de acesso para empresas inadimplentes
- Todos acessam pela mesma URL, separados pelo login

---

## 1. Novas Tabelas no Banco de Dados

### Tabela `empresas`
Representa cada empresa cliente da plataforma.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | Identificador unico |
| nome | text | Nome da empresa |
| slug | text (unique) | Identificador curto |
| ativo | boolean | Se a empresa esta ativa |
| stripe_customer_id | text | ID do cliente no Stripe |
| stripe_subscription_id | text | ID da assinatura no Stripe |
| subscription_status | text | active, past_due, canceled, etc. |
| trial_ends_at | timestamptz | Data fim do periodo de teste |
| created_at | timestamptz | Data de criacao |
| updated_at | timestamptz | Data de atualizacao |

### Coluna `empresa_id` em tabelas existentes
Adicionar `empresa_id uuid REFERENCES empresas(id)` nas seguintes tabelas:
- `consultoras`
- `lancamentos`
- `uploads`
- `regras_meta`
- `metas_mensais`
- `metas_consultoras`
- `comissao_niveis`
- `permissoes_perfil`
- `solicitacoes_ajuste`
- `user_roles`

### Novo enum de roles
Alterar o enum `app_role` para incluir `super_admin`:

```text
app_role: 'super_admin' | 'admin' | 'consultora'
```

---

## 2. Funcoes de Seguranca (Security Definer)

### `get_user_empresa_id(uuid) -> uuid`
Retorna o `empresa_id` do usuario a partir de `user_roles`.

### `is_empresa_active(uuid) -> boolean`
Verifica se a empresa tem `subscription_status = 'active'` ou esta em trial valido.

### Atualizar `has_role()`
Manter compatibilidade mas considerar o contexto de empresa.

---

## 3. Politicas RLS Atualizadas

Todas as tabelas com `empresa_id` terao politicas que garantem:
- Usuarios so veem dados da **sua propria empresa**
- Super admins podem ver dados de **todas as empresas**
- Exemplo para `consultoras`:

```text
-- Usuarios veem apenas consultoras da sua empresa
SELECT: empresa_id = get_user_empresa_id(auth.uid())
       OR has_role(auth.uid(), 'super_admin')

-- Admins gerenciam apenas da sua empresa
ALL: has_role(auth.uid(), 'admin')
     AND empresa_id = get_user_empresa_id(auth.uid())
```

---

## 4. Integracao AbacatePay para Mensalidades

### Configuracao via painel
Chave da API armazenada como secret via edge function, configuravel na aba "Integracoes" em Configuracao.

### Edge Function `abacatepay-webhook`
Recebe eventos do AbacatePay e atualiza o status da assinatura na tabela `empresas`:
- Pagamento confirmado -> status = active
- Pagamento falhou -> status = past_due
- Assinatura cancelada -> status = canceled

### Edge Function `create-billing`
Cria cobranca/assinatura no AbacatePay para novas empresas ou reativacao.

---

## 5. Bloqueio de Acesso para Inadimplentes

### No `useAuth` / `ProtectedRoute`
- Apos login, verificar `subscription_status` da empresa
- Se nao estiver `active` e nao estiver em trial valido: redirecionar para pagina de bloqueio
- Pagina de bloqueio mostra mensagem e botao para regularizar (link para checkout Stripe)

---

## 6. Painel do Super Admin

### Nova area `/super-admin` com as seguintes telas:

**Empresas** - Listar, criar, editar, ativar/desativar empresas
- Nome, slug, status da assinatura, data de criacao
- Botao para criar nova empresa (gera usuario admin inicial)
- Indicador visual de status: ativa, inadimplente, trial, cancelada

**Financeiro** - Visao geral de receita
- Lista de empresas com status de pagamento
- Historico de pagamentos via Stripe
- Filtros por status (ativa, inadimplente, cancelada)

**Criar Empresa** - Formulario para onboarding
- Nome da empresa
- Email do admin principal
- Plano/preco selecionado
- Cria a empresa + usuario admin + envia convite

---

## 7. Mudancas no Frontend

### `useAuth` - Adicionar campos:
- `empresaId: string | null`
- `isSuperAdmin: boolean`
- `empresaAtiva: boolean`

### `AppSidebar` - Condicional por role:
- Super admin ve menu proprio (Empresas, Financeiro)
- Admin/Consultora veem menu atual (filtrado por empresa)

### `ProtectedRoute` - Novas verificacoes:
- Se empresa inativa: redirecionar para `/empresa-bloqueada`
- Se super_admin: permitir acesso ao painel super admin
- Manter logica atual para admin/consultora

### Nova pagina `/empresa-bloqueada`
- Mensagem informando que a assinatura esta inativa
- Botao para entrar em contato ou regularizar

### Novas paginas super admin:
- `/super-admin/empresas` - Gestao de empresas
- `/super-admin/financeiro` - Visao financeira
- `/super-admin/empresa/nova` - Criar nova empresa

---

## 8. Sequencia de Implementacao

A implementacao sera feita em fases para evitar quebras:

**Fase 1 - Infraestrutura**
1. Ativar integracao Stripe
2. Criar tabela `empresas`
3. Adicionar `empresa_id` em todas as tabelas existentes
4. Criar funcoes de seguranca (`get_user_empresa_id`, `is_empresa_active`)
5. Adicionar `super_admin` ao enum `app_role`

**Fase 2 - Seguranca**
6. Atualizar todas as politicas RLS para filtrar por `empresa_id`
7. Migrar dados existentes: criar empresa padrao e associar todos os registros

**Fase 3 - Auth e Bloqueio**
8. Atualizar `useAuth` com `empresaId` e `isSuperAdmin`
9. Atualizar `ProtectedRoute` com verificacao de empresa ativa
10. Criar pagina de empresa bloqueada

**Fase 4 - Stripe**
11. Criar edge functions para Stripe (webhook + checkout)
12. Integrar fluxo de pagamento

**Fase 5 - Painel Super Admin**
13. Criar paginas de gestao de empresas
14. Criar pagina financeira
15. Criar fluxo de onboarding de nova empresa

---

## 9. Dados Existentes

Os dados atuais do sistema serao migrados automaticamente:
- Sera criada uma **empresa padrao** com os dados existentes
- Todos os registros existentes receberao o `empresa_id` dessa empresa
- O admin atual sera mantido como admin dessa empresa
- Um novo usuario super_admin precisara ser criado manualmente ou via seed

