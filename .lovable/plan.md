

## Política Comercial para o Coach IA

### Problema
O Coach IA sugere estratégias de abordagem comercial (descontos, promoções, upgrades, etc.) que podem não estar alinhadas com a política comercial real da empresa. Isso gera confusão e pode levar consultoras a oferecer condições que não existem.

### Solução
Criar um sistema de **Diretrizes Comerciais** onde o admin configura o que o Coach IA pode e não pode sugerir. Essas diretrizes são injetadas no prompt do Coach IA como restrições, garantindo que as sugestões estejam sempre dentro da política da empresa.

### Detalhes técnicos

#### 1. Nova tabela no banco de dados: `coach_diretrizes`

```text
coach_diretrizes
├── id (uuid, PK)
├── empresa_id (uuid, NOT NULL)
├── tipo ('permitido' | 'proibido')
├── texto (text) — ex: "Oferecer 1 semana grátis de teste"
├── ativo (boolean, default true)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

RLS: admins gerenciam da própria empresa, super_admins acesso total, consultoras podem ler (para que a edge function consiga buscar via token delas).

#### 2. Nova aba em Configuração: "Coach IA"

**Arquivo:** `src/pages/Configuracao.tsx`
- Adicionar nova tab "Coach IA" com ícone `Sparkles`

**Novo arquivo:** `src/components/configuracao/CoachDiretrizesTab.tsx`
- Interface com duas seções lado a lado:
  - **O que PODE sugerir** (tipo = 'permitido') — ex: "Oferecer aula experimental grátis", "Sugerir upgrade de plano", "Mencionar desconto para pagamento anual"
  - **O que NÃO PODE sugerir** (tipo = 'proibido') — ex: "Não oferecer desconto acima de 10%", "Não mencionar plano família", "Não sugerir parcelamento em mais de 12x"
- Campo de texto + botão para adicionar nova diretriz em cada seção
- Lista com toggle ativo/inativo e botão de excluir para cada diretriz
- Sugestões pré-definidas que o admin pode clicar para adicionar rapidamente (ex: "Oferecer aula experimental", "Desconto para indicação", "Upgrade de plano")

#### 3. Atualizar Edge Function `ai-coach`

**Arquivo:** `supabase/functions/ai-coach/index.ts`
- Após buscar dados da consultora, buscar diretrizes ativas da empresa:
  ```sql
  SELECT tipo, texto FROM coach_diretrizes 
  WHERE empresa_id = ? AND ativo = true
  ```
- Injetar no prompt do sistema uma seção `POLÍTICA COMERCIAL DA EMPRESA`:
  ```
  POLÍTICA COMERCIAL DA EMPRESA:
  VOCÊ PODE sugerir:
  - Oferecer aula experimental grátis
  - Sugerir upgrade de plano
  
  VOCÊ NÃO PODE sugerir:
  - Desconto acima de 10%
  - Parcelamento em mais de 12x
  
  IMPORTANTE: Nunca sugira estratégias fora desta política.
  Se não houver diretrizes cadastradas, use apenas dicas genéricas de abordagem sem mencionar ofertas específicas.
  ```

#### 4. Fluxo

```text
Admin abre Configuração → aba "Coach IA"
  ↓
Define diretrizes (pode/não pode)
  ↓
Consultora usa Coach IA → pergunta "Dicas de abordagem"
  ↓
Edge function busca diretrizes da empresa
  ↓
Injeta no prompt como restrições
  ↓
IA responde apenas dentro da política comercial
```

Nenhuma alteração na interface do Coach IA para a consultora — a mudança é transparente, apenas as respostas passam a respeitar as regras configuradas.

