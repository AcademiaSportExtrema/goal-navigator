

## Diagnóstico

O login da Lívia **funciona** (status 200, autenticação OK). O problema está na linha 46 do `Login.tsx`:

```typescript
navigate('/dashboard');  // ← hardcoded, ignora o role
```

Após `signIn`, o `role` ainda é `null` (carrega assíncrono via `fetchUserData`). A consultora é enviada para `/dashboard`, e o `ProtectedRoute` tenta redirecionar para `/minha-performance`, mas como o `role` pode ainda estar `null` nesse momento, o comportamento fica inconsistente.

## Correção: `src/pages/Login.tsx`

**Remover o `navigate('/dashboard')` da linha 46** e deixar o `useEffect` (linhas 22-26) controlar o redirecionamento, que já faz a lógica correta:

```typescript
// useEffect já existente que redireciona baseado no role:
useEffect(() => {
  if (!authLoading && user) {
    navigate(role === 'consultora' ? '/minha-performance' : '/dashboard', { replace: true });
  }
}, [authLoading, user, role, navigate]);
```

No `handleSubmit`, substituir a linha 46 por um comentário — o `useEffect` será acionado automaticamente quando `user` e `role` estiverem disponíveis após o `signIn`.

Isso é uma mudança de 1 linha que resolve o problema para todos os perfis de consultora.

