

# Totalizador de Percentuais na Distribuicao por Consultora

## O que muda

Adicionar uma linha totalizadora fixa abaixo da lista de consultoras, com visual destacado, mostrando a soma dos percentuais e indicando se esta correto (100%), abaixo ou acima.

## Alteracoes

### Arquivo: `src/pages/ConfiguracaoMes.tsx`

Apos a lista de consultoras (linha 323, apos o map), adicionar uma linha separadora com o total:

- Separador visual (borda superior)
- Texto "Total" alinhado a esquerda
- Valor da soma alinhado a direita no mesmo formato dos inputs
- Cores: verde se = 100%, vermelho se > 100%, amarelo/laranja se < 100%
- Texto em negrito para destaque

O totalizador existente na descricao do card (linha 295-300) sera removido para evitar duplicidade, ja que o novo totalizador na parte inferior da lista e mais visivel e util.

## Detalhes tecnicos

- Reutiliza a variavel `somaPercentuais` ja calculada na linha 224
- Adiciona um `div` com `border-t`, `pt-3`, `mt-3` para separacao visual
- Aplica cores condicionais: `text-green-600` (100%), `text-red-600` (>100%), `text-amber-600` (<100%)
- Remove o `span` de total da `CardDescription` para nao duplicar informacao
