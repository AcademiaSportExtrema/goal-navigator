

# Melhorias na Tela de Configuracao do Mes

## O que muda

### 1. Unificar Meta e Distribuicao em um unico card
O card "Meta Total do Mes" e o card "Distribuicao por Consultora" serao combinados em um unico card. O campo de valor da meta fica no topo, seguido da lista de consultoras com percentuais.

### 2. Coluna de valor calculado por consultora
Adicionar uma coluna mostrando o valor em R$ que cada consultora deve atingir, calculado automaticamente: `(percentual / 100) * metaTotal`. O totalizador tambem mostrara o valor total em R$.

Layout de cada linha:
```text
NOME DA CONSULTORA          R$ 40.000,00    [20] %
```

Totalizador:
```text
Total                       R$ 200.000,00   100.0%
```

### 3. Corrigir bug de ponto flutuante nos niveis de comissao
O problema ocorre na linha 134 ao converter `Number(n.comissao_percent) * 100`. A multiplicacao por 100 gera imprecisao de ponto flutuante (ex: 0.007 * 100 = 0.7000000000000001). Correcao: usar `parseFloat((Number(n.comissao_percent) * 100).toFixed(10))` para eliminar casas extras.

O mesmo fix sera aplicado nas linhas 132 e 133 (de_percent e ate_percent) preventivamente.

## Detalhes tecnicos

### Arquivo: `src/pages/ConfiguracaoMes.tsx`

**Card unificado (linhas 261-337):**
- Remover o grid de 2 colunas
- Um unico card com titulo "Meta e Distribuicao"
- Campo de valor da meta no topo
- Abaixo, a lista de consultoras com 3 colunas: nome, valor R$, percentual
- Totalizador com valor total e percentual total

**Calculo do valor por consultora:**
- `metaNum = parseFloat(metaTotal.replace(/\D/g, '')) / 100`
- Para cada consultora: `valor = (parseFloat(percentuais[c.id]) / 100) * metaNum`
- Formatado com `Intl.NumberFormat` em BRL

**Fix ponto flutuante (linhas 130-135):**
- Trocar `String(Number(n.xxx) * 100)` por `String(parseFloat((Number(n.xxx) * 100).toFixed(10)))` nos 3 campos (de_percent, ate_percent, comissao_percent)

