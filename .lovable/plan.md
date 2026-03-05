
Diagnóstico

O sistema está enviando dois emails porque hoje existem dois gatilhos automáticos diferentes para gerar a análise, e agora toda geração da análise também dispara email.

Onde isso acontece
1. `src/pages/Upload.tsx`
- Após concluir o upload, a tela chama `ai-analista` automaticamente.

2. `src/components/AnalistaIaCard.tsx`
- Ao abrir o Dashboard, o card do Analista IA verifica se já existe análise “de hoje”.
- Se não existir, ele chama `fetchAnalise()`, que também executa `ai-analista` automaticamente.

O ponto que criou a duplicidade
- Em `supabase/functions/ai-analista/index.ts`, a função foi alterada para chamar `send-analise-email` logo após salvar a análise.
- Então qualquer lugar que execute `ai-analista` agora também envia email.

Por que isso vira 2 emails
- Se alguém abre o Dashboard de manhã, o card pode gerar a análise e mandar email.
- Depois, quando o upload é feito, o Upload chama `ai-analista` de novo e manda outro email.
- A trava atual em `send-analise-email` bloqueia repetição só por 5 minutos.
- Então dois disparos com intervalo maior que 5 minutos passam normalmente.

O que encontrei que confirma isso
- Há apenas 1 upload recente hoje, então não parece ser clique duplo no upload.
- Não há email duplicado no cadastro de destinatários.
- O padrão da imagem (08:01 e 08:18) bate exatamente com:
  - um disparo ao abrir Dashboard
  - outro disparo após o upload

Conclusão
- O problema não está no cadastro de emails dos gestores.
- O problema está no acoplamento entre “gerar análise” e “enviar email”.
- Hoje o sistema envia email tanto:
  - quando a análise é gerada pelo Dashboard
  - quanto quando a análise é gerada após o upload

Correção recomendada
- Deixar o envio automático acontecer apenas no fluxo de upload.
- E impedir que a geração automática do card no Dashboard dispare email.

Forma mais segura de corrigir
- Passar um parâmetro explícito no `ai-analista`, por exemplo:
  - `trigger_email: true` no upload
  - `trigger_email: false` no Dashboard
- Assim:
  - abrir Dashboard gera/atualiza análise sem email
  - upload concluído gera análise com email automático
  - botão manual continua sendo reenvio manual

Alternativa
- Tirar o envio automático de dentro de `ai-analista` e fazer o upload chamar o envio separadamente.
- Também funciona, mas a abordagem com flag costuma ser mais simples e previsível.

Resultado esperado depois do ajuste
- Abrir o Dashboard não manda mais email.
- Apenas o upload concluído dispara o envio automático.
- O botão “Reenviar por email” continua funcionando manualmente.
