

## Permitir consultoras verem mês anterior até dia 5

### Lógica
Hoje o dia do mês é verificado: se `new Date().getDate() <= 5`, incluir o mês anterior na lista de meses disponíveis para consultoras.

### Arquivos afetados (4)

**1. `src/pages/Dashboard.tsx` (linhas 88-92)**
Alterar a lista de meses para consultora: se dia ≤ 5, adicionar o mês anterior como primeira opção.

**2. `src/pages/Metas.tsx` (linhas 190-194)**
Mesma lógica: incluir mês anterior condicionalmente.

**3. `src/pages/MinhaPerformance.tsx` (linhas 27-30)**
Adicionar um terceiro toggle "Mês Anterior" quando dia ≤ 5.

**4. `src/pages/VisaoConsultora.tsx` (linhas 40-41, 193)**
Incluir mês anterior na lista de toggles quando dia ≤ 5, para o admin simular a mesma visão.

### Comportamento
- Dias 1-5: consultora vê **3 opções** (mês anterior, mês atual, próximo mês)
- Dias 6+: consultora vê **2 opções** (mês atual, próximo mês) — como hoje
- Mês anterior se comporta como mês atual (mostra KPIs, lançamentos, comissão)

