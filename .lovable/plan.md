

# Corrigir Tela "Esqueci Minha Senha" Reaparecendo

## Problema Identificado

Quando o usuario clica em "Enviar link de recuperacao", a tela recarrega e volta ao estado inicial ao inves de mostrar a mensagem de sucesso. Isso acontece por dois motivos:

1. **Conflito de nomes de variaveis**: A variavel `error` retornada pela API do Supabase na linha 22 faz "shadow" (sobreposicao) da variavel de estado `error` definida na linha 13, podendo causar comportamento inesperado.

2. **Re-render do AuthProvider**: Quando `resetPasswordForEmail` e chamado, o listener `onAuthStateChange` pode disparar eventos que atualizam o estado do `AuthProvider`, causando remontagem do componente `EsqueciSenha` e resetando o estado `success` para `false`.

---

## Solucao

### 1. Corrigir conflito de variavel em EsqueciSenha.tsx
Renomear a variavel destructurada da API para evitar conflito com o estado `error`:

```typescript
const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {...});
if (resetError) {
  setError('Erro ao enviar email...');
  return;
}
```

### 2. Usar useRef para manter estado de sucesso
Adicionar um `useRef` para preservar o estado de sucesso mesmo que o componente seja remontado pelo AuthProvider:

```typescript
const [success, setSuccess] = useState(false);
const successRef = useRef(false);
```

### 3. Alternativa mais robusta - mover chamada para fora do AuthProvider
Como a pagina EsqueciSenha nao precisa de autenticacao, a chamada `resetPasswordForEmail` pode ser feita diretamente sem depender do contexto de auth, o que ja e o caso. O problema principal e o shadow da variavel.

---

## Arquivos a modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/EsqueciSenha.tsx` | Renomear variavel `error` destructurada para `resetError` e adicionar tratamento robusto de erro |

---

## Detalhes Tecnicos

A correcao principal e simples - renomear a variavel para evitar o shadow. Tambem vou adicionar um bloco `try/catch` mais robusto conforme as melhores praticas para operacoes assincronas de autenticacao.

