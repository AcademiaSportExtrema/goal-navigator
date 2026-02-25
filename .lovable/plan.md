

## Melhorar visualização do ranking de consultoras no Analista IA

### Problema
O ranking de consultoras está sendo renderizado como uma tabela markdown em texto corrido, difícil de ler. O `ReactMarkdown` renderiza `<table>` HTML mas sem estilização adequada, ficando tudo apertado numa linha.

### Solução
Duas mudanças complementares:

#### 1. Estilizar tabelas no ReactMarkdown (`AnalistaIaCard.tsx`)

Adicionar custom components ao `ReactMarkdown` para que tabelas renderizem com as classes do shadcn/ui Table (bordas, padding, alternância de cores):

```tsx
<ReactMarkdown
  components={{
    table: ({ children }) => (
      <div className="overflow-x-auto my-4">
        <table className="w-full text-sm border-collapse border border-border rounded-lg">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-muted/50">{children}</thead>
    ),
    th: ({ children }) => (
      <th className="border border-border px-3 py-2 text-left font-medium">{children}</th>
    ),
    td: ({ children }) => (
      <td className="border border-border px-3 py-2">{children}</td>
    ),
    tr: ({ children }) => (
      <tr className="even:bg-muted/30">{children}</tr>
    ),
  }}
>
```

#### 2. Ajustar prompt para gerar tabela markdown limpa (`ai-analista/index.ts`)

Alterar o prompt do sistema para instruir a IA a gerar o ranking como uma tabela markdown formatada com colunas claras (Consultora, Vendas, % Meta, Ticket Médio, Status), em vez de texto corrido. Isso garante que o ReactMarkdown interprete como `<table>`.

Adicionar no prompt:
```
Para o RANKING DE CONSULTORAS, use uma tabela markdown com as colunas: 
| Consultora | Vendas | % Meta | Ticket Médio | Status |
Use emojis para status: 🌟 Excepcional (>100%), ✅ No Caminho (70-100%), ⚠️ Atenção (50-70%), 🔴 Crítico (<50%)
```

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/components/AnalistaIaCard.tsx` | Adicionar custom components para table/thead/th/td/tr no ReactMarkdown |
| `supabase/functions/ai-analista/index.ts` | Ajustar prompt para gerar tabela markdown formatada |

