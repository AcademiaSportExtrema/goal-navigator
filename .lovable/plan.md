

## Configuração Global do Resend (Super Admin → Integrações)

### Contexto
Atualmente a `RESEND_API_KEY` é um secret fixo e o domínio remetente está hardcoded como `relatorios@metashub.com.br` na edge function `send-analise-email`. O usuário quer poder alterar tanto a API key quanto o domínio remetente pela interface, em nível global (não por empresa).

A página de **Integrações** do super admin (`/super-admin/integracoes`) já existe e usa o componente `IntegracoesTab`, que já tem um card de AbacatePay (com TODO para salvar). Este é o local ideal para adicionar a configuração do Resend.

### Solução

Adicionar um card "Resend — Envio de Emails" na tela de Integrações do super admin, com campos para API Key e domínio remetente. Os valores são salvos numa tabela `system_settings` (chave-valor global). A edge function `send-analise-email` lê dessas configurações ao invés de usar o secret fixo.

### Detalhes técnicos

#### 1. Nova tabela `system_settings`

```sql
CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
-- Apenas super_admin pode ler e escrever
CREATE POLICY "Super admins full access" ON public.system_settings
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
```

Chaves previstas:
- `resend_api_key` — chave da API do Resend
- `resend_from_domain` — domínio remetente (ex: `sportextrema.com.br`)
- `resend_from_name` — nome do remetente (ex: `MetasHub`)

#### 2. UI — Card Resend em `IntegracoesTab.tsx`

Adicionar abaixo do card AbacatePay um novo card com:
- Campo "Chave API Resend" (type password, toggle mostrar/ocultar)
- Campo "Domínio remetente" (text, placeholder: `sportextrema.com.br`)
- Campo "Nome do remetente" (text, placeholder: `MetasHub`)
- Botão "Salvar"
- Badge "Configurado" (verde) ou "Pendente" (vermelho) baseado na existência dos valores
- Os dados são lidos/salvos diretamente na tabela `system_settings` via client (protegida por RLS super_admin)

#### 3. Atualizar `send-analise-email/index.ts`

- Antes de enviar, buscar `resend_api_key`, `resend_from_domain` e `resend_from_name` da tabela `system_settings` usando service_role
- Se encontrar na tabela, usar esses valores
- Fallback para o secret `RESEND_API_KEY` e domínio padrão `metashub.com.br` se a tabela estiver vazia
- Remetente: `{from_name} <relatorios@{from_domain}>`

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | Criar tabela `system_settings` com RLS |
| `src/components/configuracao/IntegracoesTab.tsx` | Adicionar card Resend com campos API key, domínio e nome |
| `supabase/functions/send-analise-email/index.ts` | Ler config da `system_settings` antes de enviar, com fallback para secret |

