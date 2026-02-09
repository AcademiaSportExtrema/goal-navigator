
# Reprocessar Itens ao Criar Regra na Pagina de Pendencias

## Resumo

Quando o usuario cria uma nova regra a partir da pagina de Pendencias, o sistema oferecera a opcao de reprocessar automaticamente apenas os lancamentos pendentes que correspondem ao grupo (produto/plano/empresa) de onde a regra foi criada.

## Alteracoes

### 1. Pagina Pendencias (`src/pages/Pendencias.tsx`)

- Adicionar um botao "Criar Regra e Reprocessar" em cada grupo de pendencias (ao lado do botao "Criar Regra" existente)
- Ao clicar, abre um **Dialog inline** com o formulario de criacao de regra (mesmo formato da pagina Regras), sem precisar navegar para outra pagina
- Apos criar a regra com sucesso:
  1. Busca os IDs dos lancamentos pendentes que pertencem ao grupo (filtrados por produto/plano/empresa)
  2. Chama a edge function `classificar-meta` passando `lancamento_ids` com esses IDs
  3. Exibe toast com resultado do reprocessamento
  4. Invalida as queries para atualizar a lista

### 2. Fluxo detalhado

```text
Pendencias
  |
  |-- Grupo: Produto "X" / Plano "Y" / Empresa "Z" (15 itens)
  |     |
  |     |-- [Criar Regra] -> navega para /regras (comportamento atual, mantido)
  |     |-- [Criar Regra e Reprocessar] -> abre Dialog com formulario
  |           |
  |           |-- Formulario pre-preenchido:
  |           |   campo_alvo = "produto", valor = "X" (baseado no grupo)
  |           |
  |           |-- Usuario ajusta campos e confirma
  |           |
  |           |-- Sistema:
  |           |   1. Cria a regra no banco
  |           |   2. Busca IDs dos lancamentos pendentes do grupo
  |           |   3. Chama classificar-meta com lancamento_ids
  |           |   4. Exibe resultado
  |           |
  |           |-- Lista de pendencias atualiza automaticamente
```

### 3. Detalhes tecnicos

**Novo estado no componente Pendencias:**
- `dialogOpen`: controla visibilidade do dialog
- `selectedGroup`: armazena o grupo selecionado para pre-preencher o formulario
- `form`: estado do formulario de regra (mesma estrutura da pagina Regras)

**Pre-preenchimento inteligente:**
- Se o grupo tem `produto`, pre-preenche `campo_alvo = 'produto'` e `valor = produto`
- Se tem apenas `plano`, usa `campo_alvo = 'plano'` e `valor = plano`
- Se tem apenas `empresa`, usa `campo_alvo = 'empresa'` e `valor = empresa`
- O usuario pode alterar antes de confirmar

**Mutation encadeada:**
1. Insert na tabela `regras_meta`
2. Select dos `lancamentos.id` onde `pendente_regra = true` e produto/plano/empresa batem com o grupo
3. Invoke `classificar-meta` com `{ lancamento_ids: [...] }`
4. Invalidate queries

**Arquivo unico modificado:** `src/pages/Pendencias.tsx`
- Importar componentes de formulario (Select, Input, Switch, Label, Dialog, etc.)
- Importar tipos de database.ts
- Adicionar o Dialog com formulario de regra
- Adicionar a mutation encadeada (criar regra + reprocessar)
