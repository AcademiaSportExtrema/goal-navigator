

# Dar acesso completo ao Super Admin

## Problema
Atualmente, o sidebar exibe o menu de Admin **apenas** para quem tem role `admin`. Como seu usuario agora e `super_admin`, voce so ve as 3 opcoes da plataforma (Empresas, Nova Empresa, Financeiro) e perdeu acesso ao Dashboard, Upload, Gerencial, etc.

## Solucao
Ajustar o sidebar e a logica de autorizacao para que o Super Admin veja **ambos** os menus: o painel da plataforma E o menu administrativo completo.

## Mudancas

### 1. AppSidebar.tsx
- Remover a condicao `!isSuperAdmin` da renderizacao do menu admin (linha 134)
- Mudar de `isAdmin && !isSuperAdmin` para `isAdmin || isSuperAdmin`
- Isso faz o Super Admin ver tanto o grupo "Plataforma" quanto os grupos "Visao Geral", "Operacional" e "Configuracoes"

### 2. useAuth.tsx
- Ajustar a propriedade `isAdmin` para retornar `true` tambem quando o role for `super_admin`
- Mudar de `isAdmin: role === 'admin'` para `isAdmin: role === 'admin' || role === 'super_admin'`
- Isso garante que todas as verificacoes de permissao de admin tambem funcionem para o super admin

### 3. ProtectedRoute.tsx
- Ja esta correto: o super admin tem acesso irrestrito (linhas 36-42 permitem qualquer rota)

## Resultado
Apos as mudancas, o menu lateral mostrara:
- **Plataforma**: Empresas, Nova Empresa, Financeiro
- **Visao Geral**: Dashboard
- **Operacional**: Upload Diario, Gerencial, Pendencias, Ajustes
- **Configuracoes**: Regras da Meta, Config. do Mes, Configuracao

