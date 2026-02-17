

# Grafico de Progresso por Consultora

## O que sera feito

Substituir o grafico atual "Performance por Consultora" (que mostra apenas o valor vendido) por um **grafico de barras horizontais empilhadas** que mostra dois segmentos por consultora:

1. **Vendido** (em azul/verde) -- o quanto ja vendeu
2. **Falta** (em vermelho claro) -- o quanto falta para atingir 100% da meta

Isso permite que cada consultora veja visualmente, de forma imediata, o tamanho da lacuna ate a meta.

Consultoras que ja atingiram a meta mostram a barra inteira em verde, sem segmento "Falta".

## Visual esperado

```text
NICOLE         [========Vendido 21k========|===Falta 19k===] R$40k
LIVIA          [=======Vendido 20k========|====Falta 20k===] R$40k
KETLYN         [======Vendido 17k======|======Falta 23k=====] R$40k
NATHALIA       [====Vendido 13k====|=========Falta 27k======] R$40k
GIULIA         [==Vendido 7.9k==|===========Falta 32k=======] R$40k
RECORRENCIA    [===Vendido 4.7k===]  (sem meta, sem "Falta")
```

## Detalhes tecnicos

### Arquivo alterado: `src/pages/Dashboard.tsx`

- Atualizar o `chartData` para incluir os campos `vendido`, `falta` e `meta` (alem do `name` e `percentual` que ja existem)
- Substituir o `<BarChart>` atual por um grafico empilhado com duas `<Bar>`:
  - `dataKey="vendido"` -- cor verde para atingidas, azul para em progresso
  - `dataKey="falta"` -- cor vermelha clara (somente aparece quando falta > 0)
- Tooltip customizado mostrando: Vendido, Falta e % de atingimento
- Manter layout vertical (barras horizontais) e o titulo do card como "Progresso da Meta por Consultora"

Nenhuma outra pagina ou arquivo sera alterado. A tabela "Detalhamento por Consultora" permanece inalterada abaixo do grafico.
