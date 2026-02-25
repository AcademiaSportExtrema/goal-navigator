

## Configuração do Resend para disparo de email da análise IA

### Situação atual
- A tabela `analise_email_config` já existe com os emails destinatários configuráveis por empresa
- A tela de configuração (`AnalistaIaConfigTab`) já permite adicionar/remover emails
- **Não existe** nenhuma edge function para enviar os emails
- **Não existe** o secret `RESEND_API_KEY` configurado

### O que precisa ser feito

#### 1. Configurar o secret `RESEND_API_KEY`
- Será solicitado que você informe sua chave da API do Resend
- Obtenha em [resend.com/api-keys](https://resend.com/api-keys)
- Também será necessário verificar um domínio no painel do Resend para enviar de um endereço próprio (ex: `relatorios@seudominio.com`)

#### 2. Criar edge function `send-analise-email`
Nova função que:
- Recebe `empresa_id` como parâmetro
- Busca a análise mais recente da tabela `analise_ia`
- Busca os destinatários ativos da tabela `analise_email_config`
- Converte o conteúdo markdown para HTML
- Envia via API do Resend para cada destinatário
- Valida que o chamador é admin ou super_admin

#### 3. Integrar o disparo no fluxo existente
Duas opções de trigger:
- **Automático**: após a análise diária ser gerada (no `AnalistaIaCard` ou no `ai-analista`), disparar o envio
- **Manual**: botão "Enviar por email" no card do Analista IA

Recomendação: disparar automaticamente após a geração da análise diária (dentro da edge function `ai-analista`), chamando `send-analise-email` ao final do processo.

#### 4. Tela de configuração do remetente (opcional)
Adicionar na aba "Analista IA" da Configuração um campo para definir o email remetente (ex: `relatorios@seudominio.com`), ou usar um valor fixo configurado no secret.

### Arquivos a serem criados/alterados

| Arquivo | Mudança |
|---------|---------|
| Secret `RESEND_API_KEY` | Novo secret com a chave da API |
| `supabase/functions/send-analise-email/index.ts` | Nova função para envio via Resend |
| `supabase/functions/ai-analista/index.ts` | Chamar `send-analise-email` após gerar análise |
| `src/components/AnalistaIaCard.tsx` | Botão opcional "Enviar por email" |

### Pré-requisito
Antes de implementar, você precisa:
1. Criar uma conta no [resend.com](https://resend.com) (tem plano gratuito com 100 emails/dia)
2. Verificar seu domínio no painel do Resend
3. Gerar uma API Key

Quer prosseguir? O primeiro passo será solicitar sua chave da API do Resend.

