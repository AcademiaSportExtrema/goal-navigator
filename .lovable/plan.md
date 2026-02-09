

# Reestruturar Menu e Criar Sistema de Permissoes

## O que muda

### 1. Renomear item de menu "Consultoras" para "Configuração"
No menu lateral, o item "Consultoras" dentro do grupo "Configurações" sera renomeado para "Configuração" e apontara para a rota `/configuracao` (em vez de `/consultoras`). A rota antiga redirecionara para a nova.

### 2. Nova pagina de Configuração com abas
A pagina `/configuracao` tera 3 abas usando o componente Tabs:

- **Consultoras** - conteudo atual da pagina Consultoras (gestao de equipe, criacao de acesso, etc.)
- **Permissoes Admin** - define quais telas o perfil Admin pode acessar (checkboxes)
- **Permissoes Consultora** - define quais telas o perfil Consultora pode acessar (checkboxes)

### 3. Tabela de permissoes no banco
Criar uma tabela `permissoes_perfil` para armazenar as permissoes configuradas:

```text
permissoes_perfil
- id (uuid, PK)
- role (app_role) - admin ou consultora
- rota (text) - ex: "/dashboard", "/upload"
- permitido (boolean)
- created_at, updated_at
```

### 4. Telas disponiveis para cada perfil

**Admin** (todas on por padrao):
- Dashboard
- Upload Diario
- Gerencial
- Pendencias
- Ajustes
- Regras da Meta
- Config. do Mes
- Configuracao (sempre visivel, nao desativavel)

**Consultora** (por padrao):
- Minha Performance (on)
- Solicitar Ajuste (on)
- Dashboard (off - pode ser habilitado para consultoras verem uma versao read-only)

### 5. Aplicacao das permissoes
- O `AppSidebar` passara a filtrar os itens do menu com base nas permissoes salvas no banco
- O `ProtectedRoute` tambem validara as permissoes alem do role
- Um hook `usePermissions` centralizara a logica de buscar e verificar permissoes

## Layout da aba de Permissoes

```text
+------------------------------------------+
| [Consultoras] [Perm. Admin] [Perm. Cons] |
+------------------------------------------+
|                                          |
|  Permissoes do perfil Admin              |
|                                          |
|  [x] Dashboard                           |
|  [x] Upload Diario                       |
|  [x] Gerencial                           |
|  [x] Pendencias                          |
|  [x] Ajustes                             |
|  [x] Regras da Meta                      |
|  [x] Config. do Mes                      |
|  [=] Configuracao (sempre ativo)         |
|                                          |
|         [Salvar Permissoes]              |
+------------------------------------------+
```

## Detalhes tecnicos

### Novo arquivo: `src/hooks/usePermissions.ts`
- Hook que busca permissoes da tabela `permissoes_perfil` para o role do usuario atual
- Retorna `{ hasPermission(rota): boolean, isLoading }`
- Cache via react-query

### Novo arquivo: `src/pages/Configuracao.tsx`
- Pagina com Tabs: "Consultoras", "Permissoes Admin", "Permissoes Consultora"
- Aba Consultoras: mover conteudo atual de `Consultoras.tsx` para um componente separado
- Abas de Permissoes: lista de checkboxes por rota, botao salvar

### Modificar: `src/components/layout/AppSidebar.tsx`
- Importar `usePermissions`
- Filtrar items do menu baseado nas permissoes
- Item "Configuracao" sempre visivel para admin

### Modificar: `src/components/layout/ProtectedRoute.tsx`
- Verificar permissao da rota alem do role
- Redirecionar se rota nao permitida

### Modificar: `src/App.tsx`
- Adicionar rota `/configuracao`
- Redirect de `/consultoras` para `/configuracao`
- Remover rota antiga de `/consultoras`

### Migracao SQL
- Criar tabela `permissoes_perfil` com RLS
- Inserir permissoes padrao (todas ativas para admin, 2 ativas para consultora)
- RLS: admins podem gerenciar, todos autenticados podem ler

