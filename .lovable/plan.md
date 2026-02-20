

## Renomear Níveis de Comissão

### Objetivo

Substituir os nomes genéricos "Nível 1, 2, 3, 4, 5" por nomes temáticos: **Ferro, Bronze, Prata, Ouro, Diamante**.

### Solução

Criar um mapeamento centralizado de número para nome e aplicar em todos os 4 arquivos que exibem o nível.

### Detalhes técnicos

**Mapeamento (será criado em `src/lib/utils.ts` ou inline nos arquivos):**

```text
1 -> Ferro
2 -> Bronze
3 -> Prata
4 -> Ouro
5 -> Diamante
```

**Arquivos a alterar:**

1. **`src/pages/MinhaPerformance.tsx`**
   - Linha 230: `Nível {metricas?.nivelAtual || 1} de 5` -> nome correspondente
   - Linha 281: `Nível {nivel.nivel}` -> nome correspondente

2. **`src/pages/Metas.tsx`**
   - Linha 289: `Nível {dashboardData?.nivelAtual || 1}` -> nome correspondente

3. **`src/pages/Dashboard.tsx`**
   - Linha 446: `Nível {dashboardData.nivelAtual}` -> nome correspondente
   - Linha 447: `de 5 níveis` -> ajustar texto

4. **`src/pages/VisaoConsultora.tsx`**
   - Linha 249: `Nível {metricas?.nivelAtual || 1} de 5` -> nome correspondente
   - Linha 292: `Nível {nivel.nivel}` -> nome correspondente

**Abordagem:** Criar uma constante reutilizável (array ou objeto) com os nomes, e uma funcao helper `getNivelNome(nivel: number): string` em `src/lib/utils.ts` para uso em todos os arquivos.

