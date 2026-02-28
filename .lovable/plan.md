

## Corrigir cálculo da coluna Dif na Meta Anual

A coluna "Dif" atualmente calcula `distribuído - realizado`. O correto é `realizado - meta (distribuído)`:
- Positivo (verde): vendeu mais que a meta
- Negativo (vermelho): vendeu menos que a meta

### Alterações em `src/components/relatorios/MetaAnualTable.tsx`

**Linha 223**: Trocar `const dif = distribuido - realizado` por `const dif = realizado - distribuido`

**Linha 122**: Trocar `const totalDif = totalDistribuido - totalRealizado` por `const totalDif = totalRealizado - totalDistribuido`

Apenas inversão da subtração, sem outras mudanças.

