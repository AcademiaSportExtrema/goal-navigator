
# Admin Criar Conta da Consultora Diretamente

## Resumo

Adicionar uma acao `create_user` na edge function `manage-consultora-access` que permite ao admin criar a conta de login da consultora diretamente, sem precisar que ela se cadastre sozinha. O admin define email e senha, o sistema cria o usuario e ja vincula automaticamente ao perfil da consultora.

## Alteracoes

### 1. Edge Function `manage-consultora-access/index.ts`

Adicionar nova acao `create_and_link`:
- Recebe `email`, `password` e `consultora_id`
- Usa `supabaseAdmin.auth.admin.createUser()` para criar o usuario com email confirmado
- Cria o registro em `user_roles` com `role = 'consultora'` e `consultora_id`
- Retorna sucesso ou erro

### 2. Pagina Consultoras (`src/pages/Consultoras.tsx`)

Substituir o botao "Vincular" (que so funciona se a consultora ja criou conta) por um fluxo mais completo:

- Quando a consultora tem email mas nao tem acesso, mostrar botao **"Criar Acesso"**
- Ao clicar, abre um Dialog pedindo a **senha** para a conta (o email ja vem preenchido da consultora)
- Ao confirmar:
  1. Chama a edge function com acao `create_and_link`
  2. Se o usuario ja existe, faz o `link` automaticamente
  3. Atualiza a lista

- Manter os botoes existentes: "Desvincular", "Senha" (redefinir), "Editar", "Excluir"

### 3. Fluxo completo

```text
Admin na pagina Consultoras:
  |
  |-- Consultora "Maria" (email: maria@empresa.com) - Status: "Sem vinculo"
  |     |
  |     |-- Clica em "Criar Acesso"
  |     |-- Dialog pede senha
  |     |-- Admin digita "Senha123!"
  |     |-- Sistema:
  |     |   1. Cria usuario maria@empresa.com com senha definida
  |     |   2. Vincula user_role (consultora) ao perfil
  |     |-- Status muda para "Com acesso"
  |     |
  |     |-- Maria faz login com email + senha definida pelo admin
```

## Detalhes tecnicos

**Nova acao na edge function:**

```text
action: 'create_and_link'
body: { email, password, consultora_id }

1. auth.admin.createUser({ email, password, email_confirm: true })
2. Se erro "User already registered" -> tenta fazer link normal
3. insert user_roles { user_id, role: 'consultora', consultora_id }
```

**Novo Dialog na pagina Consultoras:**
- Estado: `createAccessDialogOpen`, `createAccessConsultora`, `createAccessPassword`
- Mutation `createAndLink` que chama a edge function
- Pre-preenche email da consultora selecionada

**Arquivos modificados:**
- `supabase/functions/manage-consultora-access/index.ts` - adicionar acao `create_and_link`
- `src/pages/Consultoras.tsx` - substituir botao "Vincular" por "Criar Acesso" com dialog de senha
