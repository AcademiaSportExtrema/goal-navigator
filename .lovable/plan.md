

# Redefinir Senha de Usuário via Função Backend

## Objetivo
Criar uma função backend (edge function) que permite ao admin redefinir a senha de um usuário diretamente, sem depender do fluxo de email.

## O que será feito

### 1. Criar Edge Function `admin-reset-password`
- Recebe email e nova senha via POST
- Valida que o chamador é admin
- Usa a API administrativa do Supabase para atualizar a senha do usuário
- Retorna confirmação de sucesso

### 2. Usar a função para redefinir a senha
Após criada e deployada, chamarei a função para definir a senha do usuário `hermesoliveira@gmail.com`.

## Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/admin-reset-password/index.ts` | CRIAR - edge function para reset de senha |

## Detalhes Técnicos

A edge function usará `supabase.auth.admin.updateUserById()` com a service role key para alterar a senha. Apenas usuários com role `admin` poderão chamar esta função (validação via token JWT do chamador).

```typescript
// Fluxo:
// 1. Verificar que o chamador é admin
// 2. Buscar usuário pelo email via admin API
// 3. Atualizar senha via admin API
```

Após implementar, executarei a função para definir a senha do usuário solicitado e informarei aqui.
