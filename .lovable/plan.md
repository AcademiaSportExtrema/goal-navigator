

## Ranking como Cards Verticais — Mobile-First

### Problema
A tabela markdown do ranking é difícil de ler no celular. Colunas apertadas, sem destaque visual por status.

### Solução
Pré-processar o texto markdown: detectar a tabela, extrair os dados, e renderizar como cards verticais coloridos. O restante do texto continua renderizando como markdown normal.

### Detalhes técnicos

#### Arquivo: `src/components/AnalistaIaCard.tsx`

**1. Função auxiliar `parseRankingTable(text)`**
- Usa regex para encontrar o bloco de tabela markdown (linhas que começam com `|`)
- Extrai as linhas de dados (ignora header e separador `|:---|`)
- Retorna um array de objetos: `{ nome, vendas, percentMeta, ticketMedio, status, emoji }`
- Também retorna o texto "antes" e "depois" da tabela para renderizar como markdown separado

**2. Componente `RankingCards`**
- Recebe o array de consultoras parseado
- Renderiza como lista vertical de cards
- Cada card tem:
  - Borda esquerda colorida por status (verde para >70%, amarelo para 50-70%, vermelho para <50%, dourado para >100%)
  - Emoji + nome da consultora em destaque (bold)
  - Valor total vendido em tamanho maior
  - Badge com % meta e ticket médio em linha secundária
  - Status com cor de fundo sutil

**3. Render principal**
- Ao invés de passar `text` inteiro para um único `ReactMarkdown`, dividir em 3 partes:
  1. `<ReactMarkdown>{textoBefore}</ReactMarkdown>` — tudo antes da tabela
  2. `<RankingCards data={parsedRows} />` — cards visuais
  3. `<ReactMarkdown>{textoAfter}</ReactMarkdown>` — tudo depois da tabela

**Lógica de cores por status:**
```text
🌟 Excepcional (>100%) → border-l-4 border-yellow-500, bg-yellow-50/50
✅ No Caminho (70-100%) → border-l-4 border-green-500, bg-green-50/50
⚠️ Atenção (50-70%) → border-l-4 border-amber-500, bg-amber-50/50
🔴 Crítico (<50%) → border-l-4 border-red-500, bg-red-50/50
```

**Layout de cada card:**
```text
┌─────────────────────────────────┐
│🌟 NICOLE FERREIRA               │
│   R$ 66.233,85                  │
│   165,6% da meta · TM R$ 655   │
│   ████████████████░░ Excepcional│
└─────────────────────────────────┘
```

### Arquivo alterado

| Arquivo | Mudança |
|---------|---------|
| `src/components/AnalistaIaCard.tsx` | Adicionar parseRankingTable, RankingCards, e dividir render em 3 partes |

