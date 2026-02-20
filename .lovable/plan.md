
## Dica do Dia do Coach IA

### O que muda

Substituir o botao "Pedir dica ao Coach IA" (que abre um Sheet com 3 opcoes) por um **card fixo de "Dica do Dia"** posicionado entre os cards de meta e os niveis de comissao. O card exibira uma analise completa gerada automaticamente (unificando as 3 perguntas em uma unica) na primeira vez que a consultora acessa a pagina no dia. A dica fica visivel ate que ela clique em "Atualizar analise".

### Comportamento

1. Ao abrir a pagina (VisaoConsultora ou MinhaPerformance), verifica-se em `localStorage` se ja existe uma dica gerada para aquele `consultoraId + data de hoje`.
2. Se nao existir, dispara automaticamente a chamada ao edge function `ai-coach` com um prompt unificado que combina as 3 perguntas (vender mais + ritmo + abordagem).
3. O texto gerado via streaming e exibido dentro do card e salvo em `localStorage` com a chave `coach-dica-{consultoraId}-{YYYY-MM-DD}`.
4. Se ja existir no localStorage, exibe direto sem chamar a API.
5. Um botao "Atualizar analise" limpa o cache do dia e dispara nova chamada.

### Layout do card

```text
+--------------------------------------------------+
| [icone Sparkles] Dica do Coach IA                 |
|                               [Atualizar analise] |
|--------------------------------------------------|
| Texto em markdown da dica do dia...               |
| ...                                               |
| (ou skeleton/loader enquanto carrega)             |
+--------------------------------------------------+
```

### Mudancas nas duas paginas

O card aparecera em ambas:
- `src/pages/VisaoConsultora.tsx` -- entre os cards de resumo e os niveis de comissao
- `src/pages/MinhaPerformance.tsx` -- na mesma posicao

O componente `AiCoach` em formato Sheet sera mantido no codigo mas o botao de trigger sera removido do header das paginas (substituido pelo card inline).

### Detalhes tecnicos

**Novo componente: `src/components/CoachDicaDoDia.tsx`**
- Props: `consultoraId: string`
- Usa `useState` para o texto e loading, `useEffect` para disparar na montagem
- Chave de localStorage: `coach-dica-{consultoraId}-{YYYY-MM-DD}`
- Ao montar, verifica localStorage. Se encontrar, seta o texto. Se nao, chama a edge function `ai-coach` via streaming (reaproveitando a mesma logica de SSE do AiCoach atual)
- Prompt unificado enviado como `pergunta`: "Faca uma analise completa: 1) Como posso vender mais este mes com base nos meus numeros? 2) Analise meu ritmo de vendas e diga se estou no caminho para a meta, calculando o que preciso por dia. 3) De dicas de abordagem comercial para fechar mais vendas."
- Apos stream completo, salva em localStorage
- Botao "Atualizar analise" com icone `RefreshCw`: limpa localStorage e re-dispara a chamada
- Renderiza resposta com `ReactMarkdown` dentro de `prose prose-sm`

**Alteracoes em `src/pages/VisaoConsultora.tsx`**
- Remover `<AiCoach>` do header (linha 202)
- Adicionar `<CoachDicaDoDia consultoraId={selectedConsultoraId} />` entre o grid de cards de resumo (apos linha 256) e o card de niveis de comissao (antes da linha 258)

**Alteracoes em `src/pages/MinhaPerformance.tsx`**
- Remover `<AiCoach>` do header (linha 160)
- Adicionar `<CoachDicaDoDia consultoraId={consultoraId} />` entre os cards de resumo e os niveis de comissao

Nenhuma alteracao no edge function e necessaria -- o prompt unificado e enviado como `pergunta` e o backend ja o aceita.
