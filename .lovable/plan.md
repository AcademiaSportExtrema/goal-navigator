

## Correção do domínio vazio no envio de email

### Diagnóstico

O payload enviado ao Resend mostra `"from": "MetasHub <relatorios@>"` — o domínio está vazio. Porém, a tabela `system_settings` contém os valores corretos:

- `resend_from_domain` = `sportextrema.com.br`
- `resend_from_name` = `Metashub`
- `resend_api_key` = configurada

O código da edge function `send-analise-email` está correto e lê esses valores da tabela. O problema é que a versão deployada da função é anterior à atualização que adicionou a leitura da `system_settings` — ela ainda usa os defaults hardcoded (e como o default `metashub.com.br` não está verificado no Resend, falha).

### Solução

Redesplotar a edge function `send-analise-email` para que a versão atualizada (que lê `system_settings`) entre em produção. Nenhuma alteração de código é necessária — o código atual já está correto.

Após o redeploy, o fluxo será:
1. Função busca `resend_from_domain` → `sportextrema.com.br`
2. Monta remetente: `Metashub <relatorios@sportextrema.com.br>`
3. Envia via Resend com sucesso (domínio verificado)

### Ação
Apenas redeploy da function existente.

