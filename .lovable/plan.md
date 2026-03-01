

## Separar Distribuição Semanal em card próprio com tabela detalhada

### Problema
A distribuição semanal está embutida dentro do card "Meta e Distribuição", sem mostrar os valores em reais de cada semana. O admin precisa ver claramente quanto vale cada semana em R$.

### Alterações

**1. `src/pages/ConfiguracaoMes.tsx`** — Extrair distribuição semanal para um card separado

- Remover a seção "Distribuição Semanal da Meta" (linhas 382-418) do card "Meta e Distribuição"
- Criar um novo Card "Distribuição Semanal da Meta" posicionado abaixo do grid de 2 colunas (ocupa largura total)
- Layout em tabela com colunas: **Semana | Período | Peso (%) | Valor (R$)**
- Cada linha mostra: S1, "1 - 7", input de peso %, e o valor calculado automaticamente (`metaTotal * peso / 100`)
- Linha de rodapé/total mostrando a soma dos pesos e o valor total da meta
- Validação visual: total verde se = 100%, vermelho se diferente
- O número de linhas é dinâmico (4 ou 5) baseado no mês selecionado, usando `getSemanasDoMes`

### Resultado visual
```text
┌─────────────────────────────────────────────────────────┐
│ 📅 Distribuição Semanal da Meta                         │
│                                                         │
│  Semana   │  Período  │  Peso (%)  │  Valor (R$)       │
│  S1       │  1 - 7    │  [30] %    │  R$ 12.000,00     │
│  S2       │  8 - 14   │  [25] %    │  R$ 10.000,00     │
│  S3       │  15 - 21  │  [25] %    │  R$ 10.000,00     │
│  S4       │  22 - 31  │  [20] %    │  R$  8.000,00     │
│  ─────────┼───────────┼────────────┼───────────────     │
│  Total    │           │  100%  ✓   │  R$ 40.000,00     │
└─────────────────────────────────────────────────────────┘
```

Nenhuma alteração no banco de dados ou no hook — apenas reorganização visual na página de configuração.

