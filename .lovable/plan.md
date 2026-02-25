

## Analista IA para Gestores — Análise Pós-Upload

### Problema
Após o upload de um arquivo, o gestor não tem uma análise automatizada sobre o estado das metas, desempenho das vendedoras e plano de ação. Ele precisa interpretar os dados manualmente.

### Solução
Criar um **Analista IA** para gestores, similar ao Coach IA das consultoras, que:
1. Gera uma análise completa após cada upload (metas, desempenho por vendedora, plano de ação)
2. Exibe a análise em um card no Dashboard do gestor com botão "Atualizar"
3. Salva a análise no banco de dados (não apenas localStorage)
4. Dispara email com a análise para os gestores configurados
5. Permite configurar os emails destinatários em Configuração

### Componentes configuráveis

| Elemento | Descrição |
|----------|-----------|
| Card no Dashboard | Card "Analista IA" com análise salva e botão Atualizar |
| Edge Function `ai-analista` | Gera a análise completa usando dados agregados da empresa |
| Edge Function `send-analise-email` | Dispara email com a análise para os destinatários |
| Tabela `analise_ia` | Persiste as análises geradas |
| Tabela `analise_email_config` | Lista de emails que recebem a análise |
| Aba "Analista IA" em Configuração | Gerenciar emails destinatários |

### Detalhes técnicos

#### 1. Novas tabelas

```text
analise_ia
├── id (uuid, PK)
├── empresa_id (uuid, NOT NULL)
├── mes_referencia (text, NOT NULL) — ex: "2026-02"
├── conteudo (text, NOT NULL) — markdown da análise
├── upload_id (uuid, NULL) — upload que disparou (opcional)
├── created_at (timestamptz)
└── UNIQUE(empresa_id, mes_referencia) — apenas 1 análise por mês (upsert)

analise_email_config
├── id (uuid, PK)
├── empresa_id (uuid, NOT NULL)
├── email (text, NOT NULL)
├── ativo (boolean, default true)
├── created_at (timestamptz)
└── UNIQUE(empresa_id, email)
```

RLS: admins gerenciam da própria empresa, super_admins acesso total.

#### 2. Edge Function: `ai-analista`

**Arquivo:** `supabase/functions/ai-analista/index.ts`

Fluxo:
- Recebe `empresa_id` (ou extrai do token do gestor)
- Busca mês atual: meta total, metas por consultora, lançamentos agregados
- Para cada consultora: total vendido, % atingido, ticket médio, qtd vendas
- Monta prompt com ranking de consultoras, gap para meta, dias restantes
- Pede à IA: resumo executivo, ranking com análise, plano de ação priorizado
- Salva resultado na tabela `analise_ia` (upsert por empresa_id + mes_referencia)
- Retorna a análise via streaming (igual ao Coach IA)

Prompt do sistema incluirá:
```
Você é um analista de performance comercial. Gere um relatório executivo com:
1. RESUMO DO MÊS: meta total, vendido, % atingido, projeção
2. RANKING DE CONSULTORAS: desempenho individual com destaque para quem precisa de atenção
3. PLANO DE AÇÃO: ações prioritárias para atingir a meta, baseado nos dados reais
```

#### 3. Componente: `AnalistaIaCard`

**Novo arquivo:** `src/components/AnalistaIaCard.tsx`

- Card com título "Analista IA — Relatório do Mês"
- Carrega última análise salva do banco (tabela `analise_ia`)
- Se não houver análise, mostra botão "Gerar Análise"
- Se houver, mostra o conteúdo em markdown + botão "Atualizar análise" (igual ao CoachDicaDoDia)
- Streaming da resposta durante geração

#### 4. Dashboard do gestor: adicionar o card

**Arquivo:** `src/pages/Dashboard.tsx` (ou arquivo equivalente do dashboard admin)

- Adicionar `<AnalistaIaCard />` acima dos gráficos quando `isAdmin === true`

#### 5. Disparo de email pós-análise

**Novo arquivo:** `supabase/functions/send-analise-email/index.ts`

- Chamada ao final do `ai-analista` (ou como chamada separada após salvar)
- Busca emails ativos da `analise_email_config` para a empresa
- Para cada email, envia a análise formatada
- Usa Lovable AI Gateway para não precisar de chave externa (nota: emails de notificação não são suportados nativamente — será necessário integrar um serviço como Resend)

**Sobre emails:** Como emails transacionais/de notificação não são suportados pelo sistema nativo do Lovable (apenas emails de autenticação), a implementação do disparo de email precisará de uma chave de API do Resend ou serviço similar. A configuração dos destinatários será implementada imediatamente, e o disparo será preparado para quando o serviço de email for conectado.

#### 6. Configuração: aba "Analista IA"

**Arquivo:** `src/pages/Configuracao.tsx` — adicionar nova tab

**Novo arquivo:** `src/components/configuracao/AnalistaIaConfigTab.tsx`
- Seção "Emails para receber a análise"
- Campo email + botão "Adicionar"
- Lista de emails com toggle ativo/inativo e botão excluir
- Informativo: "Após cada upload, a análise será enviada automaticamente para estes emails"

#### 7. Integração com Upload

**Arquivo:** `src/pages/Upload.tsx`

- Após upload concluído com sucesso, chamar a edge function `ai-analista` em background
- Não bloquear o fluxo do upload — a análise é gerada assincronamente
- Mostrar um toast: "Análise IA sendo gerada..."

#### 8. Fluxo completo

```text
Gestor faz upload do Excel
  ↓
Upload processado (importar-xls)
  ↓
Chama ai-analista em background
  ↓
Edge function busca dados agregados do mês
  ↓
IA gera relatório: resumo, ranking, plano de ação
  ↓
Salva na tabela analise_ia
  ↓
Dispara email para destinatários configurados (quando serviço de email disponível)
  ↓
Gestor vê a análise no Dashboard (card Analista IA)
  ↓
Pode clicar "Atualizar" para regenerar a qualquer momento
```

