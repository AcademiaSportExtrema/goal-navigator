
# Adicionar Funcionalidade "Esqueci Minha Senha"

## Objetivo
Implementar fluxo completo de recuperacao de senha para usuarios que esqueceram suas credenciais de acesso.

---

## O que sera implementado

### 1. Link na tela de Login
Adicionar link "Esqueci minha senha" abaixo do campo de senha, levando para uma nova pagina de recuperacao.

### 2. Nova pagina: EsqueciSenha.tsx
- Campo para digitar email
- Botao "Enviar link de recuperacao"
- Feedback de sucesso apos envio
- Link para voltar ao login

### 3. Nova pagina: RedefinirSenha.tsx
- Campos para nova senha e confirmacao
- Validacao de senha minima (6 caracteres)
- Validacao de senhas coincidentes
- Feedback de sucesso e redirecionamento para login

### 4. Funcao no useAuth
Adicionar funcao `resetPasswordForEmail` que chama o Supabase Auth para enviar email de recuperacao.

### 5. Rotas no App.tsx
Adicionar rotas:
- `/esqueci-senha` - pagina de solicitacao
- `/redefinir-senha` - pagina de nova senha (acessada via link do email)

---

## Fluxo do usuario

1. Usuario clica em "Esqueci minha senha" na tela de login
2. Digita seu email e clica em "Enviar"
3. Recebe email com link de recuperacao
4. Clica no link e e redirecionado para `/redefinir-senha`
5. Define nova senha e confirma
6. E redirecionado para login com mensagem de sucesso

---

## Arquivos a serem modificados/criados

| Arquivo | Acao |
|---------|------|
| `src/pages/Login.tsx` | Adicionar link "Esqueci minha senha" |
| `src/pages/EsqueciSenha.tsx` | CRIAR - pagina de solicitacao |
| `src/pages/RedefinirSenha.tsx` | CRIAR - pagina de nova senha |
| `src/hooks/useAuth.tsx` | Adicionar funcao resetPasswordForEmail |
| `src/App.tsx` | Adicionar rotas /esqueci-senha e /redefinir-senha |

---

## Detalhes Tecnicos

### Hook useAuth - nova funcao
```typescript
const resetPasswordForEmail = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/redefinir-senha`
  });
  return { error };
};
```

### Pagina RedefinirSenha
- Usa `supabase.auth.updateUser({ password })` para atualizar a senha
- O Supabase automaticamente autentica o usuario via token no link do email

### Estilos
- Seguir mesmo padrao visual das telas Login e Cadastro
- Manter consistencia com cards, icones e cores do tema escuro

