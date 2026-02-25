

## Validação da conexão Resend antes de salvar

### Objetivo
Ao clicar "Salvar" no card do Resend, primeiro testar a API key fazendo uma chamada real à API do Resend. Só salvar na `system_settings` se a chave for válida.

### Solução

Criar uma edge function `validate-resend-key` que recebe a API key, faz um `GET https://api.resend.com/domains` com ela, e retorna se é válida ou não. O frontend chama essa função antes de salvar.

### Detalhes técnicos

#### 1. Nova edge function `validate-resend-key`

- Recebe `{ api_key: string }` no body
- Valida JWT e verifica que o caller é `super_admin`
- Faz `GET https://api.resend.com/domains` com header `Authorization: Bearer {api_key}`
- Se status 200 → retorna `{ valid: true, domains: [...] }` (lista de domínios verificados para referência)
- Se status 401/403 → retorna `{ valid: false, error: "Chave inválida" }`
- Nunca persiste a chave — apenas valida

#### 2. Atualizar `IntegracoesTab.tsx`

- No `handleSaveResend`, antes de fazer upsert:
  1. Se a API key foi alterada (não contém `•`), chamar `validate-resend-key`
  2. Se inválida → `toast.error("Chave do Resend inválida")` e abortar
  3. Se válida → prosseguir com upsert normalmente
- Alterar o texto do botão durante validação: "Validando..." → "Salvando..."
- Mostrar os domínios verificados retornados como informação extra no toast de sucesso

#### 3. Config TOML

Adicionar entrada para a nova função com `verify_jwt = false` (validação manual no código).

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/validate-resend-key/index.ts` | Nova função para testar a API key do Resend |
| `supabase/config.toml` | Adicionar `[functions.validate-resend-key]` |
| `src/components/configuracao/IntegracoesTab.tsx` | Chamar validação antes de salvar |

