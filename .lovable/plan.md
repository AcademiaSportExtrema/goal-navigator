
# Correcao do Bug de Formatacao de Valores Monetarios

## Problema

O sistema armazena o valor da meta no banco em **reais** (ex: `200000`), mas o codigo trata o valor interno como **centavos** (divide por 100 ao exibir e ao salvar). Isso causa um ciclo destrutivo:

1. Banco retorna `200000` (duzentos mil reais)
2. Estado recebe `"200000"`
3. `formatCurrency` faz `200000 / 100 = 2000` e exibe `R$ 2.000,00`
4. Ao salvar, faz `200000 / 100 = 2000` e grava `2000` no banco
5. No proximo carregamento, exibe `R$ 20,00`

## Solucao

Padronizar o estado interno para sempre armazenar o valor em **centavos** (inteiro). Assim o fluxo fica consistente:

- **Ao carregar do banco**: multiplicar por 100 para converter reais em centavos
  - `setMetaTotal(String(Math.round(metaMensal.meta_total * 100)))`
- **Ao exibir**: `formatCurrency` ja divide por 100 corretamente (centavos -> reais)
- **Ao salvar**: dividir por 100 para converter centavos em reais (ja esta assim)
- **Ao calcular valor por consultora**: manter a divisao por 100

## Alteracao tecnica

### Arquivo: `src/pages/ConfiguracaoMes.tsx`

**Linha 110** - Corrigir carregamento do valor do banco:
```
// De:
setMetaTotal(String(metaMensal.meta_total));
// Para:
setMetaTotal(String(Math.round(Number(metaMensal.meta_total) * 100)));
```

Essa unica mudanca resolve o problema pois todo o resto do codigo ja assume que o estado esta em centavos (divide por 100 ao exibir e ao salvar).
