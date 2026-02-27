

## Permitir consultora ver meta do próximo mês

### Contexto
Atualmente `MinhaPerformance.tsx` usa `mesAtual = format(new Date(), 'yyyy-MM')` fixo. A consultora só vê o mês corrente. O pedido é que ela também consiga ver a meta do próximo mês (apenas a sua própria).

### Solução
Adicionar um seletor de mês na página `MinhaPerformance.tsx` que permita alternar entre o mês atual e o próximo mês. A consultora poderá ver sua meta individual, níveis de comissão e (se houver vendas) os lançamentos do mês selecionado.

### Alterações

#### `src/pages/MinhaPerformance.tsx`
1. Trocar `mesAtual` fixo por um state `mesSelecionado` com opções: mês atual e próximo mês
2. Adicionar dois botões ou tabs no header (ex: "Março 2026" | "Abril 2026") para alternar
3. Substituir todas as referências a `mesAtual` por `mesSelecionado` nas queries
4. Quando o próximo mês não tiver meta configurada, exibir o card "Meta não configurada" normalmente
5. Manter a restrição de apenas mês atual e próximo (não permitir meses anteriores, conforme regra existente para consultoras)

### Detalhes técnicos
- Calcular `proximoMes` com `format(addMonths(new Date(), 1), 'yyyy-MM')`
- Usar `useState` inicializado com `mesAtual`
- As queries de `metas_mensais`, `metas_consultoras`, `comissao_niveis` e `lancamentos` já funcionam por `mes_referencia`, basta trocar o parâmetro
- RLS já permite consultora ver `metas_mensais`, `metas_consultoras` e `comissao_niveis` da sua empresa (policies SELECT existentes)
- Nenhuma alteração de banco necessária

| Arquivo | Mudança |
|---------|---------|
| `src/pages/MinhaPerformance.tsx` | State de mês + seletor visual + queries parametrizadas |

