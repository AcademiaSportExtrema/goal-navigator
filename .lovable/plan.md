

# Redesign da Tela de Configuracao do Mes

## Problemas atuais

- Layout esticado horizontalmente com muito espaco vazio
- Cards empilhados verticalmente sem hierarquia visual clara
- Seletor de periodo ocupa um card inteiro desnecessariamente
- Niveis de comissao sem feedback visual (cores por nivel)
- Botao salvar isolado no final da pagina

## Solucao

Reorganizar a tela com layout em grid de 2 colunas no desktop, seletor de periodo integrado ao header, e visual mais compacto e moderno.

### Layout proposto

```text
+--------------------------------------------------+
| Config. do Mes         [fevereiro 2026 v] [Salvar]|
+--------------------------------------------------+
|                        |                          |
| META E DISTRIBUICAO    | NIVEIS DE COMISSAO       |
| +--------------------+ | +----------------------+ |
| | R$ [200.000,00]    | | | Nv | De%  | Ate% | C%|| |
| +--------------------+ | | 1  |  0   |  70  | 0 || |
| | Consultora  R$   % | | | 2  |  71  |  85  |0.5|| |
| | Giulia   40k  20 % | | | 3  |  86  | 100  |0.7|| |
| | Ketlyn   40k  20 % | | | 4  | 101  | 120  | 1 || |
| | ...              % | | | 5  | 121  | 999  |1.5|| |
| | Total  200k 100.0%| | +----------------------+ |
| +--------------------+ |                          |
+--------------------------------------------------+
```

### Mudancas detalhadas

**1. Seletor de periodo no header da pagina (nao mais em card separado)**
- Mover o Select de mes para uma barra horizontal no topo, ao lado do botao Salvar
- Remover o card "Periodo" inteiro

**2. Layout em grid de 2 colunas**
- Coluna esquerda: Card "Meta e Distribuicao" (mantendo a logica atual)
- Coluna direita: Card "Niveis de Comissao"
- Em mobile, empilhar verticalmente

**3. Melhorias visuais no card de Meta e Distribuicao**
- Campo de meta com label inline e tamanho maior
- Tabela de consultoras com hover e bordas sutis entre linhas
- Totalizador com fundo colorido (verde/vermelho/amarelo) em vez de so texto colorido

**4. Melhorias visuais nos Niveis de Comissao**
- Badges coloridas nos numeros de nivel (1=cinza, 2=azul, 3=amarelo, 4=verde, 5=roxo)
- Inputs mais compactos
- Texto de ajuda mais claro

**5. Botao Salvar no header**
- Mover para a barra superior ao lado do seletor de mes
- Posicao fixa e sempre visivel

## Sobre a comissao refletir no dashboard

A analise do codigo do Dashboard (linhas 160-168, 191-202) mostra que ele ja busca os niveis de comissao da tabela `comissao_niveis` filtrado pelo `meta_mensal_id` do mes selecionado, e usa esses valores para calcular o nivel atual e a comissao estimada por consultora. Portanto, **as comissoes configuradas nesta tela ja refletem corretamente no dashboard**. Nao e necessaria nenhuma alteracao no Dashboard.

## Detalhes tecnicos

### Arquivo: `src/pages/ConfiguracaoMes.tsx`

- Remover o card de Periodo (linhas 238-259)
- Adicionar barra de header com seletor de mes + botao salvar antes do grid
- Envolver os 2 cards restantes em `grid grid-cols-1 lg:grid-cols-2 gap-6`
- Adicionar `bg-green-50 dark:bg-green-950/20` ao totalizador quando soma = 100%
- Adicionar badges com cores por nivel nos Niveis de Comissao usando o componente Badge existente
- Remover o botao salvar isolado do final da pagina

