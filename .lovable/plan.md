

## Visibilidade do Dashboard para Consultoras

### Problema
Todos os gráficos e seções do Dashboard aparecem para as consultoras, mas alguns podem ser desnecessários ou até indesejados. Atualmente não há como o admin controlar quais componentes a consultora vê.

### Solução
Criar uma configuração onde o admin define quais seções do Dashboard ficam visíveis para consultoras, usando toggles simples (ligado/desligado).

### Componentes configuráveis

Os seguintes blocos do Dashboard poderão ser ligados/desligados para consultoras:

| Chave | Seção | Padrão |
|-------|-------|--------|
| `card_total_vendido` | Card Total Vendido | Ligado |
| `card_total_faturado` | Card Total Faturado | Ligado |
| `grafico_tendencia_receita` | Tendência de Receita (linha) | Ligado |
| `grafico_forma_pagamento` | Receita por Forma de Pagamento | Desligado |
| `tabela_vendas_plano` | Vendas por Plano | Desligado |
| `grafico_categoria` | Participação por Categoria | Desligado |
| `histograma_ticket` | Histograma de Ticket Médio | Desligado |
| `ultimos_uploads` | Últimos Uploads | Desligado |
| `card_equipe` | Equipe | Desligado |
| `acoes_rapidas` | Ações Rápidas | Desligado |

### Detalhes técnicos

#### 1. Nova tabela: `dashboard_visibilidade`

```text
dashboard_visibilidade
├── id (uuid, PK)
├── empresa_id (uuid, NOT NULL)
├── componente (text, NOT NULL) — chave do componente
├── visivel (boolean, default true)
├── created_at / updated_at
└── UNIQUE(empresa_id, componente)
```

RLS: admins gerenciam da própria empresa, consultoras podem ler.

#### 2. Nova aba ou seção na Configuração

Adicionar na aba **"Perm. Consultora"** uma seção "Visibilidade do Dashboard" com uma lista de switches (on/off) para cada componente. Alternativa: adicionar como sub-seção dentro da aba existente de permissões da consultora.

**Arquivo:** `src/components/configuracao/PermissoesTab.tsx`
- Quando `targetRole === 'consultora'`, exibir abaixo das permissões de rota uma seção extra "Dashboard — o que a consultora vê" com Switch para cada componente.

#### 3. Hook: `useDashboardVisibilidade`

**Novo arquivo:** `src/hooks/useDashboardVisibilidade.ts`
- Busca registros de `dashboard_visibilidade` para a empresa do usuário
- Retorna função `isComponenteVisivel(chave): boolean`
- Se não houver registro para um componente, usa o padrão definido no código

#### 4. Dashboard: condicionar exibição

**Arquivo:** `src/pages/Dashboard.tsx`
- Quando `!isAdmin`, usar o hook para verificar cada seção antes de renderizar
- Envolver cada bloco de gráfico/seção com `{(isAdmin || isComponenteVisivel('chave')) && ...}`

#### 5. Fluxo

```text
Admin abre Configuração → aba "Perm. Consultora"
  ↓
Seção "Visibilidade do Dashboard" com switches
  ↓
Admin desliga "Histograma de Ticket" e "Vendas por Plano"
  ↓
Consultora abre Dashboard → esses gráficos não aparecem
```

