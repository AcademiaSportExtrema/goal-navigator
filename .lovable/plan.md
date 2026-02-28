

## Redesign Visual do Dashboard

### Remoções (conforme imagem)
Remover 3 seções do Dashboard em `src/pages/Dashboard.tsx`:
- **Últimos Uploads** (linhas 760-836) — card com lista de uploads recentes
- **Equipe** (linhas 814-835) — card com contagem de consultoras
- **Ações Rápidas** (linhas 839-871) — card com links Upload Diário, Regras, Gerencial

Também remover as queries e imports que ficam órfãos:
- Query `ultimosUploads` (linhas 100-110)
- Query `consultorasCount` (linhas 112-121)
- Imports não utilizados: `Upload`, `Users` de lucide-react

### Melhorias Visuais

**1. Header do mês** — trocar layout simples por header com subtítulo e ícone de calendário integrado no select

**2. Cards de resumo (grid 5 cards)** — adicionar `border-l-4` com cores temáticas:
- Total Vendido → `border-l-blue-500`
- Total Faturado → `border-l-green-500`
- Meta do Mês → `border-l-purple-500`
- Lançamentos → `border-l-slate-500`
- Pendentes de Regra → `border-l-amber-500`
- Hover com `hover:shadow-md transition-all`

**3. Cards de meta (Atingimento, Nível, Comissão)** — mesma lógica de borda colorida lateral + hover

**4. Seções com títulos** — adicionar subtítulos entre blocos de gráficos usando `Separator` + texto `text-sm font-semibold uppercase tracking-wide text-muted-foreground`

**5. Tabela de consultoras** — badge colorido para nível (getNivelNome com cor), zebra striping via `even:bg-muted/30`, container com `overflow-hidden rounded-lg border`

**6. Analista IA** (`AnalistaIaCard.tsx`) — adicionar `border-l-4 border-primary` e `bg-primary/5` sutil no card

### Arquivos alterados
- `src/pages/Dashboard.tsx` — remoções + melhorias visuais
- `src/components/AnalistaIaCard.tsx` — borda accent

