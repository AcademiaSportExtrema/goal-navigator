

## Melhorias Visuais no Dashboard

### 1. Mover Analista IA para o final
- Remover `{isAdmin && <AnalistaIaCard />}` da linha 357 (logo após o header)
- Inserir antes do fechamento do `</div>` principal (antes da linha 765), após todos os gráficos

### 2. Melhorar diagramação do Analista IA (`AnalistaIaCard.tsx`)
- Aumentar padding interno do CardContent
- Adicionar `space-y-4` e margens nos elementos do markdown (headings, parágrafos, listas)
- Melhorar separação visual entre seções do texto com `leading-relaxed`
- Adicionar estilo nos componentes de markdown: headings com `mt-6 mb-2`, parágrafos com `mb-3`, listas com `ml-4 space-y-1`
- Melhorar o header com padding mais generoso

### 3. Ajustes visuais gerais no Dashboard
- **Progress bars**: adicionar `h-2 rounded-full` para visual mais polido
- **Grid de cards resumo**: garantir `items-stretch` para cards de mesma altura
- **Espaçamento entre seções**: aumentar `space-y-6` para `space-y-8` no container principal para mais respiro
- **SectionTitle**: adicionar `mb-1` e ícone sutil para mais destaque
- **Tabela de consultoras**: melhorar header com `text-xs uppercase tracking-wide` para visual mais profissional

### Arquivos alterados
- `src/pages/Dashboard.tsx` — mover AnalistaIaCard + ajustes visuais
- `src/components/AnalistaIaCard.tsx` — melhorar espaçamento do markdown

