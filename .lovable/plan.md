
Diagnóstico

O envio não está acontecendo porque hoje o fluxo automático foi quebrado no backend:

- Em `src/pages/Upload.tsx`, após concluir o upload, o sistema chama apenas a função `ai-analista`.
- Em `supabase/functions/ai-analista/index.ts`, a análise é salva em `analise_ia`, mas o próprio código tem um comentário explícito dizendo que o envio por email foi removido:
  - `Email sending removed – gestor controls dispatch via UI button`
- O envio ficou apenas manual pelo botão `Enviar por email` em `src/components/AnalistaIaCard.tsx`, que chama `send-analise-email`.
- Não existe agendamento diário no projeto:
  - não há `cron.schedule`
  - não há chamada interna automática para `send-analise-email`
  - não há registros `email_sent_*` em `system_settings`
  - não há logs recentes da função `send-analise-email`

O que isso significa

- O upload ainda gera a análise.
- Os emails dos gestores estão cadastrados corretamente.
- Mas nenhuma parte do fluxo automático dispara `send-analise-email` depois que a análise é gerada.
- Então o comportamento atual é “gerar análise automaticamente, enviar email só manualmente”.

Plano de correção

1. Restaurar o disparo automático no backend
- Reativar o envio ao final de `supabase/functions/ai-analista/index.ts`, logo depois de salvar a análise.
- Fazer a chamada server-to-server para `send-analise-email` usando o modo interno já previsto pela função (`empresa_id` + `_internal`), sem depender do navegador.

2. Manter a segurança e evitar duplicidade
- Preservar a validação existente de autenticação e empresa.
- Reaproveitar a deduplicação já existente em `send-analise-email` para impedir envios repetidos em sequência curta.

3. Alinhar a interface com o comportamento real
- Manter o botão manual no card do Analista IA como reenvio manual.
- Ajustar o texto de configuração para deixar claro que o email será disparado automaticamente após o upload processado, quando houver destinatários ativos.

4. Validar o fluxo ponta a ponta
- Upload concluído
- geração da análise
- gravação em `analise_ia`
- disparo automático para os emails ativos de `analise_email_config`

Observações importantes

- Isso não é um “agendamento diário” de verdade; é um envio automático após cada upload, que foi o comportamento que você confirmou querer restaurar.
- O warning atual de `CobrancaStatusBadge` no console é separado desse problema e não explica a falha do email.

Arquivos no escopo
- `supabase/functions/ai-analista/index.ts`
- possivelmente `src/components/configuracao/AnalistaIaConfigTab.tsx` apenas para ajustar o texto exibido
- opcionalmente `src/components/AnalistaIaCard.tsx` se quisermos diferenciar melhor “envio automático” de “reenvio manual”

Resultado esperado
- Sempre que um novo upload for processado e a análise for gerada, o email dos gestores será enviado automaticamente sem depender do botão manual.
