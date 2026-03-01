

## Reformular Ritmo Semanal: cards por semana com vendas reais

### Problema atual
O componente `RitmoSemanalCard` mostra apenas um resumo global ("Semana X — No Ritmo") sem detalhar quanto foi vendido em cada semana individualmente. Além disso, sempre mostra S1-S5 fixo, quando março 2026 tem apenas 4 semanas (31 dias = S1:1-7, S2:8-14, S3:15-21, S4:22-31).

### Proposta
Substituir o card único por um layout visual similar aos "Níveis de Comissão" (cards lado a lado), mostrando cada semana do mês com: meta da semana, vendido na semana, % atingido, quanto falta. A semana atual fica destacada (como o "Diamante" na imagem de referência).

### Alterações

**1. `src/hooks/useMetaSemanal.ts`** — refatorar para retornar dados por semana
- Calcular quantas semanas o mês realmente tem (4 ou 5) com base no último dia do mês
- Para cada semana, retornar: `{ semana, metaValor, vendido, percentual, falta, status, isCurrent }`
- Receber `lancamentos` como parâmetro e agrupar vendas por semana usando `data_inicio` (dia 1-7 = S1, etc.)
- Manter compatibilidade: continuar retornando `semanaAtual`, `status` global, etc.

**2. `src/components/dashboard/RitmoSemanalCard.tsx`** — redesign visual
- Layout em grid horizontal (como os níveis de comissão): `grid-cols-4` ou `grid-cols-5` dependendo do mês
- Cada card de semana mostra:
  - Título: "Semana 1" (dias 1-7)
  - Meta da semana: R$ X.XXX
  - Vendido: R$ X.XXX  
  - Percentual atingido
  - Status visual (cor de fundo)
- Semana atual com destaque escuro (dark bg, texto branco), semanas passadas com cor de status, futuras neutras

**3. `src/pages/Dashboard.tsx`** e `src/pages/MinhaPerformance.tsx`
- Passar `lancamentos` filtrados por `data_inicio` no mês para o hook
- Atualizar props do `RitmoSemanalCard` para o novo formato

**4. `src/pages/ConfiguracaoMes.tsx`**
- Ajustar inputs de distribuição semanal para mostrar dinamicamente 4 ou 5 semanas com base no mês selecionado (se último dia > 28, mostra S5)

### Resultado visual
```text
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌══════════┐
│ Semana 1 │ │ Semana 2 │ │ Semana 3 │ ║ Semana 4 ║ ← atual (destaque)
│  1 - 7   │ │  8 - 14  │ │ 15 - 21  │ ║ 22 - 31  ║
│          │ │          │ │          │ ║          ║
│Meta:12k  │ │Meta:10k  │ │Meta:10k  │ ║Meta: 8k  ║
│Vend:13k  │ │Vend:9.5k │ │Vend:11k  │ ║Vend: 3k  ║
│  108%    │ │   95%    │ │  110%    │ ║   38%    ║
│ ✅ Bateu │ │ 🔶 Quase │ │ ✅ Bateu │ ║ 🔴 Falta ║
└──────────┘ └──────────┘ └──────────┘ └══════════┘
```

