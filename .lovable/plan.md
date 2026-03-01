

## Adicionar Ritmo Semanal na Visão Consultora + permitir visualização no próximo mês

### Alterações

**1. `src/pages/VisaoConsultora.tsx`**
- Importar `useMetaSemanal` e `RitmoSemanalCard`
- Chamar `useMetaSemanal` com `metaMensal?.id`, meta individual, total vendido, `mesSelecionado` e `lancamentos`
- Renderizar `RitmoSemanalCard` após os cards de resumo (antes da Dica do Dia), com `motivacional={true}`

**2. `src/pages/MinhaPerformance.tsx`**
- Remover a condição `!isProximoMes` que oculta o `RitmoSemanalCard` — permitir que consultoras vejam a distribuição semanal mesmo ao selecionar o próximo mês (mostrará as metas por semana com vendido zerado)

### Resultado
- Admin vê o ritmo semanal de qualquer consultora na Visão Consultora (com histórico de 12 meses)
- Consultora vê o ritmo semanal tanto no mês atual quanto no próximo mês em Minha Performance

