

## Correção: consultora_chave incorreta em lançamentos com regra resp_recebimento

### Problema encontrado

Existem **8 lançamentos** (incluindo o do Kenzo) onde a regra aplicada define `responsavel_campo = 'resp_recebimento'`, mas o campo `consultora_chave` foi gravado com o valor de `resp_venda` em vez de `resp_recebimento`. Isso provavelmente ocorreu porque os dados foram importados antes da regra ser configurada com `resp_recebimento`, e nunca foram reclassificados.

Exemplo do Kenzo:
- `resp_venda` = NICOLE FERREIRA DOS ANJOS
- `resp_recebimento` = LIVIA MAYSA HONORATO MARTINS
- `consultora_chave` = NICOLE (errado, deveria ser LIVIA)

### Plano de correção

**1. Migração SQL** — Corrigir todos os registros existentes com uma única query:

```sql
UPDATE lancamentos l
SET consultora_chave = l.resp_recebimento
FROM regras_meta r
WHERE l.regra_aplicada_id = r.id
  AND r.responsavel_campo = 'resp_recebimento'
  AND l.consultora_chave IS DISTINCT FROM l.resp_recebimento
  AND l.resp_recebimento IS NOT NULL;
```

Isso corrige os 8 registros de uma vez, incluindo o do Kenzo, sem afetar nenhum outro lançamento.

**2. Nenhuma alteração de código necessária** — O código de classificação (`upload-importar-xls`, `classificar-meta`, `reprocessar-upload`) já usa corretamente `lancamento[regra.responsavel_campo]`. O problema foi apenas nos dados já gravados.

### Detalhes técnicos
- Apenas 1 migração SQL, sem alteração de frontend ou edge functions
- Afeta exatamente os 8 registros identificados
- Após a correção, o plano do Kenzo (R$ 2.322,00) aparecerá na comissão da Livia

