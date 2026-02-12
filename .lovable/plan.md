

# Correcao em Massa das Regras: DATA_INICIO para HIBRIDA

## Problema Identificado
- 28 regras estao configuradas com `regra_mes = DATA_INICIO`
- 86 dos 201 lancamentos nao possuem `data_inicio` preenchido
- 44 lancamentos foram classificados por regras DATA_INICIO sem ter data_inicio (o sistema fez fallback para data_lancamento, entao o mes_competencia esta correto, mas a configuracao nao reflete a intencao)

## Solucao

### Passo 1 - Atualizar todas as regras DATA_INICIO para HIBRIDA
Executar um UPDATE direto nas 28 regras que usam `DATA_INICIO`, alterando para `HIBRIDA`.

Com a regra HIBRIDA, o comportamento sera:
- Lancamento **com plano** preenchido: usa `data_inicio` (fallback para `data_lancamento` se vazio)
- Lancamento **sem plano**: usa `data_lancamento`

### Passo 2 - Reprocessar todos os lancamentos
Apos a atualizacao das regras, disparar o reprocessamento de todos os lancamentos (nao apenas os pendentes) para que o `mes_competencia` seja recalculado com a logica correta.

Isso sera feito chamando a edge function `classificar-meta` com a flag `reprocessar_todos` aplicada a todos os lancamentos (pendentes e ja classificados).

### Detalhes tecnicos

**Atualizacao das regras (SQL):**
```sql
UPDATE regras_meta
SET regra_mes = 'HIBRIDA', updated_at = now()
WHERE regra_mes = 'DATA_INICIO' AND ativo = true;
```

**Reprocessamento:**
- Invocar `classificar-meta` passando todos os IDs de lancamentos (nao so pendentes)
- O motor reclassificara cada lancamento com a nova logica HIBRIDA

### Arquivos modificados
- Nenhum arquivo de codigo sera alterado
- Apenas dados no banco: tabela `regras_meta` (UPDATE) + reprocessamento dos `lancamentos`

