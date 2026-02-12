

# Correção da Importação: empresa_id ausente nos lançamentos

## Problema
O último upload de 400 linhas falhou completamente. Todas as linhas retornaram o erro:
> "null value in column empresa_id of relation lancamentos violates not-null constraint"

A função de importação monta o objeto do lançamento sem incluir o campo `empresa_id`, que é obrigatório na tabela.

## Solução

### 1. Corrigir a função de importação (`upload-importar-xls`)
- No início do processamento, buscar o `empresa_id` a partir do registro do upload (`uploads` table) usando o `upload_id` recebido
- Incluir o `empresa_id` em cada lançamento antes da inserção

### 2. Reimportar os dados
- Após o deploy da correção, disparar novamente a importação do último upload que falhou, para que as 400 linhas sejam processadas corretamente

## Detalhes técnicos

**Alteração na edge function `upload-importar-xls/index.ts`:**

Adicionar, logo após o download do arquivo, a busca do `empresa_id`:

```typescript
// Buscar empresa_id do upload
const { data: uploadData, error: uploadFetchError } = await supabase
  .from('uploads')
  .select('empresa_id')
  .eq('id', upload_id)
  .single();

if (uploadFetchError || !uploadData) throw new Error('Upload não encontrado');
const empresa_id = uploadData.empresa_id;
```

E no objeto `lancamento`, incluir:

```typescript
const lancamento = {
  upload_id,
  empresa_id,  // <-- campo que estava faltando
  produto: row['Produto'] || null,
  // ... restante dos campos
};
```

**Reimportação:**
Após o deploy, chamar a função novamente com o `upload_id` e `arquivo_path` do upload que falhou para processar as 400 linhas pendentes.

### Arquivos modificados
- `supabase/functions/upload-importar-xls/index.ts` -- adicionar busca e inclusão do `empresa_id`
