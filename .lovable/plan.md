

# Reorganizar Menu: Plataforma para o Final + Integracoes dentro de Plataforma

## O que muda

### 1. AppSidebar.tsx - Reordenar e adicionar Integracoes

- Mover o bloco de renderizacao do `superAdminMenuGroups` (Plataforma) para **depois** dos menus admin (Configuracoes), em vez de antes
- Adicionar "Integracoes" como item dentro do grupo Plataforma no `superAdminMenuGroups`
- Adicionar icone `Plug` aos imports

Ordem final no sidebar para Super Admin:
```text
Visao Geral      -> Dashboard
Operacional      -> Upload Diario, Gerencial, Pendencias, Ajustes
Configuracoes    -> Regras da Meta, Config. do Mes, Configuracao
Plataforma       -> Empresas, Nova Empresa, Financeiro, Integracoes
```

### 2. Configuracao.tsx - Remover aba Integracoes

- Remover a aba "Integracoes" da pagina de Configuracao, ja que ela passara a ser acessada pela rota propria dentro do menu Plataforma

### 3. Nova pagina: Integracoes.tsx

- Criar uma pagina dedicada `/super-admin/integracoes` que renderiza o componente `IntegracoesTab` dentro do `AppLayout`
- Essa pagina so sera acessivel pelo Super Admin

### 4. App.tsx - Adicionar rota

- Adicionar rota `/super-admin/integracoes` apontando para a nova pagina

## Detalhes tecnicos

**superAdminMenuGroups** atualizado:
```text
Plataforma:
  - Empresas       (Building)       /super-admin/empresas
  - Nova Empresa   (PlusCircle)     /super-admin/empresa/nova
  - Financeiro     (DollarSign)     /super-admin/financeiro
  - Integracoes    (Plug)           /super-admin/integracoes
```

**SidebarContent** - ordem de renderizacao:
1. Admin menu groups (Visao Geral, Operacional, Configuracoes)
2. Super Admin menu groups (Plataforma) -- movido para o final
3. Consultora menu (quando nao admin)

