
Objetivo: transformar a tela de cobranças/devedores em um mini-CRM de cobrança, com observação, data do contato, histórico de tentativas e marcação de sucesso quando o cliente pagar.

O que encontrei no projeto
- A tela principal é `src/pages/Devedores.tsx`.
- Hoje cada linha de `devedores_parcelas` só controla `cobranca_enviada` por um checkbox.
- Consultoras e admins já acessam `/devedores`, com RLS por empresa e por consultora.
- O upload de devedores (`supabase/functions/upload-devedores/index.ts`) apaga todos os registros antigos e recria tudo no banco.

Ponto crítico de arquitetura
- Como o upload substitui toda a tabela, um histórico ligado apenas ao `id` atual da parcela quebraria no próximo upload.
- Para o histórico sobreviver entre importações, a implementação precisa usar uma chave estável da parcela/cobrança.

Plano de implementação

1. Ajustar o modelo de dados
- Adicionar em `devedores_parcelas`:
  - `chave_cobranca` (identificador estável da parcela)
  - `status_cobranca` com fluxo simples: `pendente`, `em_contato`, `pago`
  - `ultimo_contato_em`
  - `ultima_observacao`
  - `pago_em`
- Criar uma nova tabela de histórico, algo como `devedores_cobranca_historico`, com:
  - `id`
  - `empresa_id`
  - `chave_cobranca`
  - `devedor_parcela_id` opcional para referência do registro atual
  - `tipo` (`tentativa_contato` ou `pagamento_confirmado`)
  - `contato_em`
  - `observacao`
  - `created_at`
  - `created_by`
  - `created_by_label`
- Manter `cobranca_enviada` por compatibilidade, mas passar a atualizá-lo automaticamente quando houver tentativa registrada ou pagamento confirmado.

2. Regras de acesso no backend
- `devedores_parcelas`: manter admins com acesso da própria empresa e consultoras apenas aos próprios devedores.
- `devedores_cobranca_historico`:
  - admins: ler/inserir da própria empresa
  - consultoras: ler/inserir apenas histórico das cobranças vinculadas ao próprio nome
- O histórico deve ser append-only: registrar novas tentativas, sem editar/apagar eventos antigos. Isso preserva rastreabilidade.

3. Tornar a importação compatível com o histórico
- Atualizar `upload-devedores` para gerar `chave_cobranca` determinística com base nos campos estáveis da parcela.
- Antes de apagar e reinserir os devedores, preservar o resumo atual por `chave_cobranca` para não perder:
  - status atual
  - último contato
  - última observação
  - data de pagamento
- Assim, se a parcela continuar vindo em uploads futuros, ela reaparece com o histórico e o status já mantidos.

4. Criar a ação de registro de cobrança
- Implementar uma backend function para registrar eventos de cobrança com validação de autenticação e permissão.
- Ela receberá dois fluxos:
  - registrar tentativa
  - marcar como pago
- A função deve:
  - validar se o usuário pode mexer naquela cobrança
  - inserir um item no histórico
  - atualizar o resumo em `devedores_parcelas`
  - opcionalmente registrar auditoria para ações críticas, especialmente “marcar como pago”

5. Evoluir a UI da tela `/devedores`
- Trocar o checkbox simples por um bloco de status mais rico.
- Seguir sua preferência: linha expansível por registro.
- Em cada linha:
  - badge de status (`Pendente`, `Em contato`, `Pago`)
  - data do último contato
  - botão/ação para expandir
- Dentro da expansão:
  - campo de data/hora do contato
  - textarea para observação (“o que o cliente falou”)
  - botão “Registrar tentativa”
  - botão “Marcar como pago”
  - histórico em ordem decrescente mostrando:
    - data/hora
    - tipo do evento
    - observação
    - quem registrou

6. Ajustar filtros e leitura da cobrança
- Substituir o filtro atual baseado só em `cobranca_enviada` por filtro de `status_cobranca`.
- Manter busca e paginação atuais.
- Exportação CSV pode ganhar colunas extras depois, mas não é essencial na primeira entrega.

7. Manter consistência em outras telas
- Atualizar também a visão resumida que usa `devedores_parcelas` em `src/pages/VisaoConsultora.tsx`, pelo menos para exibir o novo status em vez do checkbox simples.
- Isso evita divergência entre a tela operacional e a visão da consultora.

Detalhes técnicos
```text
Upload devedores
  -> gera chave_cobranca estável
  -> preserva resumo por chave
  -> reinserção dos registros atuais

Tela /devedores
  -> lista parcelas vencidas
  -> expandir linha
  -> registrar tentativa / marcar pago

Backend function
  -> valida usuário e empresa
  -> grava histórico
  -> atualiza resumo da cobrança
```

Arquivos que entram no escopo
- `src/pages/Devedores.tsx`
- `src/pages/VisaoConsultora.tsx`
- `supabase/functions/upload-devedores/index.ts`
- nova backend function para registrar cobrança
- nova migration para tabela/colunas/RLS

Resultado esperado
- A consultora consegue registrar cada contato com observação e data.
- O sistema mantém um histórico completo das tentativas.
- É possível marcar a cobrança como bem-sucedida quando o cliente pagar.
- As informações não se perdem no próximo upload, porque ficam ligadas por uma chave estável da cobrança.
