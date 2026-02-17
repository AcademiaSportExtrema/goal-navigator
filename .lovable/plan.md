
# Coach IA no Dashboard para Admins

## O que sera feito

Adicionar um botao "Coach IA" na tabela "Detalhamento por Consultora" do Dashboard, permitindo que o admin selecione qualquer consultora e veja as mesmas orientacoes personalizadas que ela veria.

## Como vai funcionar

1. Na tabela de detalhamento, cada linha de consultora tera um botao/icone de lampada clicavel
2. Ao clicar, abre o mesmo painel lateral (Sheet) do Coach IA, mas passando o ID da consultora selecionada
3. A IA analisa os dados daquela consultora especifica e retorna orientacoes personalizadas

## Detalhes tecnicos

### Arquivo alterado: `src/pages/Dashboard.tsx`

- Importar o componente `AiCoach` ja existente
- Adicionar o `consultora_id` aos dados calculados em `consultoraDados`, buscando o ID do registro em `metasConsultoras` (que ja faz join com a tabela `consultoras`)
- Adicionar uma coluna "Coach" na tabela de detalhamento
- Cada linha tera um botao com icone de lampada que, ao clicar, abre o `AiCoach` com o `consultoraId` correspondente
- Usar estado local (`selectedConsultoraId`) para controlar qual consultora esta selecionada

### Componente `AiCoach` -- ajuste menor

- Tornar o componente controlavel externamente: aceitar props `open` e `onOpenChange` opcionais, para que o Dashboard possa abrir/fechar o painel sem depender do SheetTrigger interno
- Quando essas props nao forem passadas, manter o comportamento atual (botao interno)

### Nenhuma alteracao no backend

A edge function `ai-coach` ja aceita qualquer `consultora_id` e busca os dados no banco. Como o admin tem acesso RLS a todos os dados da empresa, a funcao ja funciona corretamente para este caso.
