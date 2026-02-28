

## Adicionar seção "Visão Gerencial" ao Dashboard

Atualmente o Dashboard mostra apenas a meta de consultoras (`entra_meta=true`, `mes_competencia`). Falta a visão gerencial que inclui agregadores (Wellhub, Total Pass) e Entuspass/Sport Pass — alinhada com a Tabela 2 e Meta Anual.

### Alterações

**1. `src/pages/Dashboard.tsx`** — adicionar query e seção gerencial

- Nova query chamando a RPC `get_realizado_por_mes` para o mês selecionado (extraindo o mês/ano do `mesSelecionado`), retornando o total gerencial do mês
- Nova seção "Visão Gerencial" (acima ou abaixo da seção "Atingimento da Meta") com 3 cards:
  - **Total Gerencial**: valor retornado pela RPC (inclui agregadores + Entuspass)
  - **Meta Gerencial**: valor da `meta_anual` dividido pelo peso do mês (da tabela `meta_anual_meses`) — ou se não houver peso configurado, `meta_total / 12`
  - **% Atingimento Gerencial**: total gerencial / meta gerencial
- Borda colorida distinta (ex: indigo) para diferenciar dos cards de consultoras
- Visível apenas para admins

**2. Nenhuma alteração de backend** — a RPC `get_realizado_por_mes` já contém toda a lógica necessária

