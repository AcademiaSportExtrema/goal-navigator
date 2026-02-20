

## Atualizar card "Niveis de Comissao" na Minha Performance

### Problema

A pagina **Minha Performance** (vista pelas consultoras) exibe o card de niveis de comissao de forma simplificada, mostrando apenas os percentuais de atingimento e a taxa de comissao. Ja a pagina **Visao Consultora** (vista pelo admin) mostra informacoes mais completas: faixas em R$, percentual de comissao e estimativa de bonus.

As consultoras nao estao vendo as faixas em R$ e os valores de bonus estimado, que sao informacoes importantes para entenderem quanto precisam vender e quanto podem ganhar.

### Solucao

Atualizar o card "Niveis de Comissao" na pagina `MinhaPerformance.tsx` para incluir as mesmas informacoes detalhadas que ja existem na pagina `VisaoConsultora.tsx`:
- Faixa de valores em R$ (baseada na meta individual da consultora)
- Percentual de comissao
- Estimativa de bonus em R$

### Detalhes tecnicos

**Arquivo:** `src/pages/MinhaPerformance.tsx`

1. Adicionar funcao auxiliar `fmt` para formatacao monetaria (igual a que ja existe na VisaoConsultora)
2. Atualizar o bloco do card "Niveis de Comissao" (linhas 257-276) para replicar a logica da VisaoConsultora:
   - Calcular `valorMin` e `valorMax` com base na meta individual
   - Calcular `bonusMin` e `bonusMax`
   - Tratar o ultimo nivel com sufixo "+"
   - Exibir faixa em R$ abaixo dos percentuais
   - Exibir estimativa de bonus abaixo da taxa de comissao

**Nenhum outro arquivo precisa ser alterado.**

