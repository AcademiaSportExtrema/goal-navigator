

# Reorganizacao do Menu Lateral

## Analise atual

O menu tem 9 itens soltos sem agrupamento logico, e duas paginas com sobreposicao de conteudo:

- **Dashboard**: mostra resumo geral (total vendido, meta, lancamentos, pendentes, ultimos uploads, equipe)
- **Metas**: mostra dashboard detalhado de metas (total vendido, % atingimento, nivel, comissao, grafico por consultora, tabela detalhada)

Ambas mostram "total vendido" e "% da meta" -- sao redundantes. Faz sentido **unificar** em uma unica pagina, mantendo o Dashboard como pagina principal e incorporando nele os graficos e tabela detalhada que hoje ficam em Metas.

## Proposta de menu reorganizado

```text
--- Visao Geral ---
  Dashboard          (unificado: resumo + metas + grafico + tabela por consultora)

--- Operacional ---
  Upload Diario
  Gerencial
  Pendencias
  Ajustes

--- Configuracoes ---
  Regras da Meta
  Config. do Mes
  Consultoras
```

**Mudancas:**
- **Metas** deixa de existir como pagina separada. Todo o conteudo (cards de atingimento, grafico de barras, tabela por consultora com falta/comissao) e incorporado no Dashboard
- Menu agrupado em 3 secoes logicas com labels
- A rota `/metas` redireciona para `/dashboard` para nao quebrar links

## Detalhes tecnicos

### Arquivo `src/pages/Dashboard.tsx`
- Incorporar o seletor de mes, os cards de atingimento (% meta, nivel, comissao), o grafico de barras por consultora e a tabela detalhada com colunas Meta/Falta/Comissao que hoje estao em `src/pages/Metas.tsx`
- Manter os cards existentes (total lancamentos, pendentes, ultimos uploads, equipe)
- Reorganizar layout: cards de resumo no topo, grafico + tabela no meio, ultimos uploads e acoes rapidas embaixo

### Arquivo `src/components/layout/AppSidebar.tsx`
- Dividir o menu em 3 grupos: "Visao Geral", "Operacional", "Configuracoes"
- Remover item "Metas" do menu

### Arquivo `src/App.tsx`
- Adicionar redirect de `/metas` para `/dashboard`
- Remover a rota protegida de Metas

### Arquivo `src/pages/Metas.tsx`
- Manter o arquivo mas pode ser removido futuramente (a rota ja redireciona)

