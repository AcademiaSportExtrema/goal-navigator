

# Visao da Consultora para Admins

## O que sera feito

Criar uma nova pagina "/visao-consultora" acessivel pelo menu lateral (somente para admins), onde o administrador seleciona uma consultora e visualiza exatamente a mesma tela "Minha Performance" que ela veria, incluindo cards de meta, nivel de comissao, tabela de vendas e Coach IA.

## Como vai funcionar

1. No menu lateral, na secao "Operacional", sera adicionado um item "Visao Consultora" com icone de olho (Eye)
2. A pagina exibe um seletor (dropdown) com todas as consultoras da empresa
3. Ao selecionar uma consultora, renderiza os mesmos dados da pagina "Minha Performance" para aquela consultora
4. O admin pode trocar de consultora a qualquer momento sem sair da pagina

## Detalhes tecnicos

### 1. Nova pagina: `src/pages/VisaoConsultora.tsx`

- Rota protegida com `requiredRole="admin"`
- Busca todas as consultoras da empresa via `supabase.from('consultoras').select('id, nome').eq('empresa_id', empresaId)`
- Dropdown (Select) para escolher a consultora
- Reutiliza a mesma logica de calculo da pagina `MinhaPerformance`: busca meta mensal, meta individual, lancamentos filtrados por `consultora_chave`, niveis de comissao
- Renderiza os mesmos cards (Meta, Vendido, % Atingido, Comissao), niveis de comissao e tabela de vendas
- Inclui o componente AiCoach com o `consultoraId` selecionado

### 2. Alteracao: `src/components/layout/AppSidebar.tsx`

- Adicionar item "Visao Consultora" na secao "Operacional" com icone `Eye` e href `/visao-consultora`

### 3. Alteracao: `src/App.tsx`

- Adicionar rota `/visao-consultora` com `ProtectedRoute requiredRole="admin"`

### Nenhuma alteracao no backend

Os dados ja existem e o admin ja tem acesso RLS a todas as consultoras e lancamentos da empresa.

