

## Corrigir Importador e Reprocessar Uploads Problematicos

### Problema

O upload `4e575dfd` (216 lancamentos) foi importado sem `nome_cliente`, `resp_venda`, `resp_recebimento` e `consultora_chave`. Os dados mostram produtos como "BOLD DOCE DE LEITE 60G" e "CRISTAL AGUA 500ML", indicando que o arquivo tem cabecalhos diferentes do esperado pelo importador.

### Solucao em 2 partes

#### Parte 1 -- Melhorar mapeamento de colunas no importador

**Arquivo:** `supabase/functions/upload-importar-xls/index.ts`

Adicionar um sistema de aliases flexivel para mapear cabecalhos variados:

1. Criar funcao `normalizeHeader(h)` que remove acentos, converte para minusculo e remove pontuacao
2. Criar dicionario `COLUMN_ALIASES` com todas as variacoes conhecidas para cada campo:

```text
nome_cliente  -> "nome", "cliente", "nome cliente", "nome do cliente", "razao social"
resp_venda    -> "resp. venda", "resp venda", "responsavel venda", "vendedor", "consultor"
resp_recebimento -> "resp. recebimento", "resp recebimento", "responsavel recebimento"
numero_contrato  -> "n contrato", "contrato", "numero contrato", "nro contrato"
(e demais campos que ja tem variacoes)
```

3. Antes de processar as linhas, construir um `headerMap` que traduz cada cabecalho real do Excel para o campo correto do banco
4. Adicionar log dos cabecalhos encontrados vs mapeados para facilitar debug

#### Parte 2 -- Criar endpoint de reprocessamento

**Novo edge function:** `supabase/functions/reprocessar-upload/index.ts`

Endpoint que recebe um `upload_id` e:

1. Valida autenticacao e permissao (mesmo esquema do importador)
2. Busca o `arquivo_path` na tabela `uploads`
3. Deleta todos os lancamentos com aquele `upload_id`
4. Baixa o arquivo do storage
5. Reprocessa usando a mesma logica do importador (com o mapeamento corrigido)
6. Atualiza o resumo do upload

Isso permite reprocessar qualquer upload sem precisar reuploar o arquivo.

#### Parte 3 -- Reprocessar automaticamente apos deploy

Apos o deploy das correcoes, chamar o endpoint de reprocessamento para o upload `4e575dfd-8af0-437d-89f7-e4c9c6a82b3b` (o unico com problemas).

Opcionalmente, adicionar um botao "Reprocessar" na tela de uploads para que o admin possa reprocessar qualquer upload futuro que tenha dado problema.

### Detalhes tecnicos

**Alteracoes em `supabase/functions/upload-importar-xls/index.ts`:**
- Extrair a logica de mapeamento de colunas para funcao reutilizavel
- Adicionar `normalizeHeader()` e `COLUMN_ALIASES`
- Substituir acessos diretos como `row['Resp. Venda']` por `row[headerMap.resp_venda]`

**Novo arquivo `supabase/functions/reprocessar-upload/index.ts`:**
- Reutiliza a logica de processamento do importador
- Fluxo: autenticar -> buscar upload -> deletar lancamentos antigos -> baixar arquivo -> reimportar -> atualizar resumo
- Protegido: apenas admins da mesma empresa podem reprocessar

**Alteracoes em `supabase/config.toml`:** nao necessarias (o config.toml ja e gerenciado automaticamente)

**Nenhuma alteracao de schema** -- usa as mesmas tabelas existentes.

### Resultado esperado

Apos a implementacao:
1. O importador aceita cabecalhos variados sem perder dados
2. Os 216 lancamentos problematicos sao corrigidos automaticamente via reprocessamento
3. Se futuros uploads tiverem problemas, o admin pode reprocessar sem reuploar o arquivo

