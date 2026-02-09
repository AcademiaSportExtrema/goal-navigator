
# Solicitacao de Ajuste de Responsavel (Comissao)

## Conceito

Criar um fluxo de **solicitacao e aprovacao** para ajustes no campo "responsavel pelo recebimento" dos lancamentos. A consultora identifica um lancamento que deveria ser creditado a ela, solicita o ajuste, e o admin aprova ou rejeita.

## Fluxo do Usuario

```text
CONSULTORA                          ADMIN
   |                                  |
   |-- Ve suas vendas em              |
   |   "Minha Performance"            |
   |                                  |
   |-- Acessa "Solicitar Ajuste"      |
   |   (nova pagina ou aba)           |
   |                                  |
   |-- Busca lancamento por           |
   |   contrato/cliente/data          |
   |                                  |
   |-- Preenche solicitacao:          |
   |   - Lancamento alvo              |
   |   - Justificativa                |
   |                                  |
   |-- Envia solicitacao -----------> |
   |                                  |-- Ve em "Ajustes Pendentes"
   |                                  |   (nova pagina admin)
   |                                  |
   |                                  |-- Analisa e Aprova/Rejeita
   |                                  |   com comentario
   |                                  |
   |<-- Resultado visivel ----------- |
   |   no historico                   |
```

## O que sera criado

### 1. Nova tabela `solicitacoes_ajuste`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | Identificador |
| lancamento_id | uuid (FK) | Lancamento que precisa de ajuste |
| consultora_id | uuid (FK) | Consultora solicitante |
| resp_recebimento_atual | text | Valor atual do campo |
| resp_recebimento_novo | text | Nome da consultora solicitante (novo valor) |
| justificativa | text | Motivo da solicitacao |
| status | enum | `pendente`, `aprovado`, `rejeitado` |
| admin_comentario | text | Comentario do admin ao aprovar/rejeitar |
| admin_user_id | uuid | Admin que processou |
| created_at | timestamptz | Data da solicitacao |
| updated_at | timestamptz | Data do processamento |

**RLS:**
- Consultoras podem criar solicitacoes e ver apenas as suas
- Admins podem ver e gerenciar todas

### 2. Pagina da Consultora: "Solicitar Ajuste"

Nova pagina `/solicitar-ajuste` acessivel pela consultora, com:
- Campo de busca para encontrar lancamentos (por numero de contrato, nome do cliente ou data)
- Lista de resultados mostrando lancamentos que NAO estao vinculados a ela
- Ao selecionar, exibe detalhes do lancamento e campo para justificativa
- Botao de enviar solicitacao
- Historico das solicitacoes feitas com status (pendente/aprovado/rejeitado)

### 3. Pagina do Admin: "Ajustes"

Nova pagina `/ajustes` acessivel pelo admin, com:
- Lista de solicitacoes pendentes com detalhes do lancamento e justificativa
- Botoes de Aprovar / Rejeitar com campo de comentario
- Ao aprovar: atualiza o campo `resp_recebimento` e `consultora_chave` do lancamento
- Historico de solicitacoes ja processadas

### 4. Navegacao

- Adicionar link "Solicitar Ajuste" no menu lateral da consultora
- Adicionar link "Ajustes" no menu lateral do admin
- Badge com contagem de pendentes no menu do admin

## Arquivos

| Arquivo | Acao |
|---------|------|
| **Migracao SQL** | CRIAR - tabela `solicitacoes_ajuste` com enum e RLS |
| `src/types/database.ts` | EDITAR - adicionar tipos da nova tabela |
| `src/pages/SolicitarAjuste.tsx` | CRIAR - pagina da consultora |
| `src/pages/Ajustes.tsx` | CRIAR - pagina do admin |
| `src/App.tsx` | EDITAR - adicionar rotas |
| `src/components/layout/AppSidebar.tsx` | EDITAR - adicionar links no menu |

## Detalhes Tecnicos

### Enum de status:
```sql
CREATE TYPE ajuste_status AS ENUM ('pendente', 'aprovado', 'rejeitado');
```

### Ao aprovar solicitacao (logica no frontend):
1. Atualizar `solicitacoes_ajuste.status = 'aprovado'`
2. Atualizar `lancamentos.resp_recebimento` e `lancamentos.consultora_chave` com o nome da consultora
3. Ambas operacoes na mesma acao para consistencia

### Busca de lancamentos pela consultora:
- A consultora pesquisa lancamentos por contrato, cliente ou data
- Precisa de uma policy RLS temporaria ou uma funcao `security definer` para permitir que a consultora veja lancamentos que ainda nao estao vinculados a ela (apenas para fins de busca na solicitacao)
- Alternativa mais segura: criar uma funcao `search_lancamentos_for_ajuste` que retorna apenas campos limitados (id, produto, cliente, contrato, resp_recebimento_atual, valor, data) sem expor todos os dados
