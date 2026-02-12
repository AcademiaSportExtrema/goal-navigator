

# Mover indicador de meta para o card "Total Vendido"

## O que muda

O progresso da meta (barra + percentual) esta no card errado ("Total Faturado") e deve ir para o card "Total Vendido", que e o valor que efetivamente conta para atingir a meta.

Alem disso, o calculo de `percentualAtingido` precisa usar o `totalVendidoInicio` (filtrado por `data_inicio`) em vez do antigo `totalVendido` (filtrado por `mes_competencia`).

## Alteracoes no arquivo `src/pages/Dashboard.tsx`

### 1. Card "Total Vendido" (linhas ~305-316)

Adicionar a barra de progresso e o percentual da meta neste card, calculando o percentual com base no `totalVendidoInicio` dividido pela `meta_total`:

```
Total Vendido
R$ 100.724,54
43.8% da meta    <-- percentual baseado em totalVendidoInicio / meta_total
[====-------]    <-- barra de progresso
```

### 2. Card "Total Faturado" (linhas ~318-340)

Remover a barra de progresso e o percentual. Deixar apenas o valor e um subtitulo simples "Faturado no mes":

```
Total Faturado
R$ 119.450,44
Faturado no mes
```

### 3. Calculo do percentual

O percentual exibido no card "Total Vendido" sera calculado diretamente como:

```typescript
const percentualVendido = metaMensal 
  ? ((totalVendidoInicio || 0) / Number(metaMensal.meta_total)) * 100 
  : 0;
```

Isso garante que a meta reflita apenas vendas com inicio no mes, independente do motor de regras antigo.

### Resumo visual

| Card | Conteudo |
|------|----------|
| Total Vendido | Valor + % da meta + barra de progresso |
| Total Faturado | Apenas valor + subtitulo informativo |
| Meta do Mes | Valor da meta configurada |
| Lancamentos | Contagem |
| Pendentes | Contagem |

### Arquivo modificado
- `src/pages/Dashboard.tsx` -- mover barra de progresso e recalcular percentual

