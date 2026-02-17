

# AI Coach para Consultoras

## Conceito

Adicionar um botão "Pedir dica ao Coach" (ou um chat flutuante) na página **Minha Performance** que envia os dados reais da consultora para uma IA e retorna orientações personalizadas de como vender mais e atingir a meta.

## Dados que a IA receberia como contexto

- Nome da consultora
- Meta individual do mes (R$)
- Total vendido ate agora (R$)
- Percentual atingido (%)
- Dias restantes no mes
- Quantidade de vendas realizadas
- Tipos de produtos/planos mais vendidos por ela
- Ticket medio das vendas
- Nivel de comissao atual e quanto falta para o proximo nivel

## Tipos de orientacoes que a IA poderia dar

1. **Diagnostico de ritmo** -- "Voce vendeu R$13k em 18 dias. Para atingir R$40k, precisa vender R$1.588/dia nos proximos 17 dias."
2. **Sugestao de foco em produto** -- "Seus planos anuais tem ticket medio 3x maior que mensais. Priorize oferecer anuais."
3. **Estrategia de upsell** -- "Dos seus 12 contratos, 8 sao planos basicos. Tente converter 3 para premium e ganha +R$2.400."
4. **Motivacao por nivel de comissao** -- "Voce esta no nivel 2 (3% comissao). Faltam R$4k para subir ao nivel 3 (5%) -- isso aumentaria sua comissao em R$800."
5. **Acoes praticas** -- "Fale com os alunos que estao no periodo de experiencia esta semana. Eles sao os mais propensos a fechar."
6. **Comparativo temporal** -- "No mes passado nesta mesma data voce estava com 45%. Este mes esta com 32%. Hora de acelerar!"

## Implementacao tecnica

### 1. Backend function: `supabase/functions/ai-coach/index.ts`

- Recebe o `consultora_id` via POST
- Busca todos os dados de performance da consultora no banco (vendas, meta, niveis)
- Monta um prompt rico com o contexto numerico
- Chama o Lovable AI Gateway (modelo `google/gemini-3-flash-preview`) com streaming
- Retorna a resposta em SSE para renderizacao progressiva

### 2. Frontend: novo componente `src/components/AiCoach.tsx`

- Botao com icone de lampada/robo na pagina MinhaPerformance
- Ao clicar, abre um dialog/sheet lateral
- Mostra a resposta da IA com streaming (token a token)
- Usa markdown para formatar a resposta (listas, negritos, etc.)
- Botoes de acao rapida: "Como vender mais?", "Analise meu ritmo", "Dicas de abordagem"

### 3. Alteracao: `src/pages/MinhaPerformance.tsx`

- Adicionar o componente AiCoach na pagina
- Passar os dados de metricas ja calculados como props

### 4. Configuracao

- Atualizar `supabase/config.toml` para incluir a nova function
- A function usa `LOVABLE_API_KEY` que ja esta configurada -- nenhuma chave adicional necessaria

### Dependencia adicional

- Instalar `react-markdown` para renderizar a resposta formatada da IA

## Experiencia do usuario

```text
[Pagina Minha Performance]

  Cards: Meta | Vendido | % Atingido | Comissao
  
  [Botao: "Pedir dica ao Coach IA"]
  
  --> Abre painel lateral:
  
  +------------------------------------------+
  |  Coach IA                            [X] |
  |                                          |
  |  Perguntas rapidas:                      |
  |  [Como vender mais?] [Analise meu ritmo] |
  |  [Dicas de abordagem]                    |
  |                                          |
  |  Ola Nicole! Aqui vai minha analise:     |
  |                                          |
  |  Voce vendeu R$21.430 de R$40.000        |
  |  (53.6%). Faltam R$18.570 em 12 dias.    |
  |                                          |
  |  **Acoes recomendadas:**                 |
  |  1. Foque nos planos anuais...           |
  |  2. Faltam R$3k pro nivel 3...           |
  |  3. Retome contato com leads...          |
  +------------------------------------------+
```
