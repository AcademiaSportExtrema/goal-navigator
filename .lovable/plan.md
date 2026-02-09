

# Gestao de Acesso das Consultoras + Visao de Comissao e Falta para Meta

## Problema Atual

Hoje nao existe nenhuma forma de configurar o acesso das consultoras ao sistema. Quando uma consultora cria uma conta, ela fica sem papel (role) atribuido e nao consegue acessar nada. O admin precisa de uma interface para:

1. Vincular um usuario (por email) a uma consultora cadastrada, atribuindo o papel de "consultora"
2. Ver facilmente quanto cada consultora vendeu, quanto vai receber de comissao, e quanto falta para a meta

## Solucao

### 1. Gerenciamento de Acesso na pagina Consultoras

Adicionar na pagina **Consultoras** (`/consultoras`) a funcionalidade de vincular um usuario ao perfil da consultora:

- No dialog de editar/criar consultora, o campo **Email** passa a ser mais importante: ele sera usado para vincular a conta de login da consultora
- Adicionar um botao **"Vincular Acesso"** em cada consultora que ja tem email preenchido
- Ao clicar, o sistema:
  1. Busca o usuario pelo email na tabela `auth.users` (via edge function, pois o client nao tem acesso)
  2. Cria um registro em `user_roles` com `role = 'consultora'` e `consultora_id` apontando para a consultora
- Mostrar status de acesso: "Com acesso" / "Sem acesso" / "Email nao cadastrado"
- Opcao de remover acesso (deletar o `user_role`)
- Opcao de redefinir senha (ja existe a edge function `admin-reset-password`)

**Nova edge function `manage-consultora-access`:**
- Recebe email e consultora_id
- Verifica se o caller e admin
- Busca user_id pelo email em auth.users
- Cria/atualiza o registro em user_roles

### 2. Coluna "Falta para Meta" na pagina Metas

Na tabela de detalhamento por consultora na pagina **Metas** (`/metas`), adicionar:

- Coluna **"Falta"**: valor em R$ que falta para atingir 100% da meta individual
  - Se ja atingiu, mostrar "Meta atingida" em verde
  - Se nao atingiu, mostrar o valor restante em vermelho

### 3. Melhorar a tabela de Metas com comissao mais visivel

A tabela atual ja mostra vendido, %, nivel e comissao. Vamos reorganizar para ficar mais claro:

- Adicionar coluna **"Meta Individual"** (valor em R$)
- Adicionar coluna **"Falta"** (quanto falta para bater 100%)
- Manter comissao estimada

## Fluxo do Admin para dar acesso a uma consultora

```text
1. Admin cadastra consultora com nome e email
2. Consultora se cadastra no sistema usando o mesmo email
3. Admin vai em Consultoras, ve que o status e "Sem vinculo"
4. Admin clica em "Vincular Acesso"
5. Sistema cria user_role com role=consultora e consultora_id
6. Consultora faz login e ve a pagina "Minha Performance"
```

## Arquivos que serao alterados

| Arquivo | Acao |
|---------|------|
| `supabase/functions/manage-consultora-access/index.ts` | CRIAR - edge function para vincular/desvincular acesso |
| `src/pages/Consultoras.tsx` | EDITAR - adicionar status de acesso e botoes de vincular/desvincular |
| `src/pages/Metas.tsx` | EDITAR - adicionar colunas "Meta Individual" e "Falta" na tabela |

## Detalhes Tecnicos

### Edge function `manage-consultora-access`

Acoes suportadas:
- `link`: recebe email + consultora_id, busca user em auth.users, cria user_role
- `unlink`: recebe consultora_id, remove user_role correspondente
- `check`: recebe email, retorna se o usuario existe e se ja tem role

A funcao usa `SUPABASE_SERVICE_ROLE_KEY` para acessar `auth.admin.listUsers()`.

### Alteracoes na pagina Consultoras

- Adicionar query para buscar `user_roles` e cruzar com consultoras (por consultora_id)
- Mostrar badge: "Com acesso" (verde), "Sem acesso" (amarelo), "Email nao preenchido" (cinza)
- Botao "Vincular" chama a edge function com acao `link`
- Botao "Desvincular" chama a edge function com acao `unlink`
- Botao "Redefinir Senha" usa a edge function `admin-reset-password` ja existente

### Alteracoes na pagina Metas

- No calculo `consultoraDados`, adicionar campo `falta` = `Math.max(0, metaIndividual - vendido)`
- Adicionar colunas na tabela: "Meta (R$)" e "Falta (R$)"
- Colorir "Falta": verde se 0 (meta atingida), vermelho se > 0

