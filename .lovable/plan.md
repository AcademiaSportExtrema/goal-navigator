

## Mostrar peso (%) da meta de cada semana no card Ritmo Semanal

### Alterações

**1. `src/hooks/useMetaSemanal.ts`**
- Adicionar campo `pesoPercent: number` ao tipo `SemanaDetalhe`
- Preencher com o peso configurado de cada semana no map

**2. `src/components/dashboard/RitmoSemanalCard.tsx`**
- Exibir o peso da semana (ex: "30% da meta") logo abaixo do label de dias, antes da linha "Meta: R$ X"
- Usar estilo discreto (`text-xs text-muted-foreground`)

### Resultado visual por card de semana
```text
Semana 1
dias 1 - 7
(30% da meta)     ← novo
Meta: R$ 12 mil
R$ 13 mil
108%
✅ Bateu
```

