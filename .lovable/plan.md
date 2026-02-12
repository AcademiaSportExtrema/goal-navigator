

# Corrigir exibição de Cliente e Contrato em "Minhas Solicitações"

## Problema

Quando uma consultora faz uma solicitação de ajuste, ela pede crédito de um lançamento que pertence a outra pessoa. A tabela `lancamentos` tem RLS que só permite consultoras verem lançamentos onde `consultora_chave` é o seu próprio nome. Por isso, o join na query de "Minhas Solicitações" retorna nulo para `nome_cliente` e `numero_contrato`.

## Solução

Salvar `numero_contrato` e `nome_cliente` diretamente na tabela `solicitacoes_ajuste` no momento da criação, eliminando a dependência do join com `lancamentos` (que o RLS bloqueia).

### 1. Migração: adicionar colunas à tabela `solicitacoes_ajuste`

```sql
ALTER TABLE public.solicitacoes_ajuste 
  ADD COLUMN numero_contrato text,
  ADD COLUMN nome_cliente text;
```

Essas colunas armazenam uma cópia dos dados do lançamento no momento da solicitação.

### 2. Atualizar o insert no `SolicitarAjuste.tsx`

No `submitMutation`, incluir os dois novos campos:

```typescript
await supabase.from('solicitacoes_ajuste').insert({
  lancamento_id: selectedLancamento.id,
  consultora_id: consultora.id,
  resp_recebimento_atual: selectedLancamento.resp_recebimento || '',
  resp_recebimento_novo: consultora.nome,
  justificativa,
  empresa_id: empresaId!,
  numero_contrato: selectedLancamento.numero_contrato || null,  // NOVO
  nome_cliente: selectedLancamento.nome_cliente || null,         // NOVO
});
```

### 3. Atualizar a exibição em "Minhas Solicitações"

Na query, remover (ou manter como fallback) o join com `lancamentos` e usar os campos diretos:

```typescript
// Antes:
{sol.lancamentos?.numero_contrato || '-'}
{sol.lancamentos?.nome_cliente || '-'}

// Depois:
{sol.numero_contrato || sol.lancamentos?.numero_contrato || '-'}
{sol.nome_cliente || sol.lancamentos?.nome_cliente || '-'}
```

O fallback para `sol.lancamentos?.` garante que solicitações antigas (criadas antes da migração) ainda funcionem para admins que conseguem ver todos os lançamentos.

### Arquivo modificado
- `src/pages/SolicitarAjuste.tsx` -- insert + exibição

### Migração
- Adicionar colunas `numero_contrato` e `nome_cliente` em `solicitacoes_ajuste`
