

## Adicionar gráfico "Clientes Únicos por Consultora" + exportação CSV

### Regra de negócio
Contar **pessoas únicas** (`nome_cliente` distinto) por consultora, filtrando apenas lançamentos com **data de início dentro do mês selecionado** (não pela `mes_competencia`). Isso mostra quantas pessoas cada consultora efetivamente atendeu para vender planos naquele mês. Excluir itens de loja (`duracao` = `0`, vazio ou nulo).

### Alterações

**1. Novo componente `src/components/dashboard/ClientesUnicosChart.tsx`**
- Gráfico de barras horizontais (Recharts `BarChart layout="vertical"`)
- Recebe `{ nome: string; clientes: number }[]`
- Ordenado do maior para o menor
- Card com título "Clientes Atendidos por Consultora"
- Botão de exportar CSV no header do card (ícone Download)
- O CSV exportado lista: Consultora, Quantidade de Clientes, e opcionalmente os nomes dos clientes

**2. Nova query em `src/pages/Dashboard.tsx`**
- Buscar lançamentos com `data_inicio` dentro do mês selecionado (entre `YYYY-MM-01` e último dia do mês)
- Filtrar no front: `duracao` diferente de `0`, `''` e `null` (exclui Loja)
- Agrupar por `consultora_chave`, contar `nome_cliente` distintos via `Set`
- Guardar também a lista de nomes por consultora para exportação CSV

**3. Layout em grid 2 colunas** (linhas ~822-830)
- Envolver `ConsultoraShareChart` + `ClientesUnicosChart` em `<div className="grid gap-4 md:grid-cols-2">`

### Exportação CSV
O botão no card exporta um arquivo com colunas: `Consultora | Cliente | Data Início` — listando cada cliente único por consultora, permitindo ao admin ver exatamente com quem cada consultora conversou.

### Resultado visual
```text
┌──────────────────────────┐  ┌──────────────────────────┐
│  Participação por        │  │  Clientes Atendidos  [⬇] │
│  Consultora (donut)      │  │  por Consultora          │
│                          │  │  ████████████ 32          │
│      🍩                  │  │  █████████ 24            │
│                          │  │  ██████ 18               │
│                          │  │  ████ 12                 │
└──────────────────────────┘  └──────────────────────────┘
```

