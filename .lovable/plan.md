

## Problema identificado

O login da Lívia autentica com sucesso, mas ela é redirecionada para `/dashboard` em vez de `/minha-performance`.

**Causa raiz**: No `useEffect` do `Login.tsx` (linha 22-26), a condição `!authLoading && user` dispara assim que o `user` é setado, mas **antes** do `role` ser carregado (que é `null` nesse momento). Como `null !== 'consultora'`, o ternário cai no branch `/dashboard`.

A propriedade `isLoading` do auth fica `true` durante o fetch do profile, mas o `useEffect` usa `authLoading` que é o mesmo `isLoading`. O problema é que entre o `user` ser setado pelo `onAuthStateChange` e o `setIsLoading(true)` do segundo `useEffect`, há um frame onde `isLoading` é `false` e `user` existe mas `role` é `null`.

## Correção: `src/pages/Login.tsx`

Alterar a condição do `useEffect` para só redirecionar quando `role` estiver definido (não `null`):

```typescript
useEffect(() => {
  if (!authLoading && user && role) {
    navigate(role === 'consultora' ? '/minha-performance' : '/dashboard', { replace: true });
  }
}, [authLoading, user, role, navigate]);
```

Adicionar `role` como condição garante que o redirecionamento só acontece após o perfil ser completamente carregado. Isso é uma mudança de 1 linha (adicionar `&& role` na condição).

