## Ocultar dados de performance no próximo mês

### Problema

Quando a consultora seleciona o próximo mês, aparecem cards de vendas, % atingido, comissão estimada (todos zerados), tabela de lançamentos vazia e CoachDicaDoDia. Devem aparecer apenas a meta e os níveis de comissão do mes atual e do proximo mes 

### Alterações

#### `src/pages/MinhaPerformance.tsx`

1. Criar flag `const isProximoMes = mesSelecionado !== mesAtual`
2. Desabilitar a query `meus-lancamentos` com `enabled: !!consultora?.nome && !isProximoMes`
3. Renderização condicional:
  - **Sempre visível**: card "Minha Meta" e card "Níveis de Comissão"
  - **Ocultar quando `isProximoMes**`: cards "Vendido", "% Atingido", "Comissão Estimada", tabela "Minhas Vendas do Mês", `CoachDicaDoDia`


| Arquivo                          | Mudança                                                    |
| -------------------------------- | ---------------------------------------------------------- |
| `src/pages/MinhaPerformance.tsx` | Flag + query condicional + hide de 3 cards, tabela e coach |
