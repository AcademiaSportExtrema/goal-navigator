

# Importacao e Exportacao em Massa de Regras via Planilha

## Objetivo
Permitir exportar os lancamentos pendentes (sem regra) para uma planilha CSV, analisar os dados, e depois importar regras em massa via CSV -- eliminando a necessidade de criar regras uma a uma.

## Fluxo de Trabalho

```text
1. Admin clica "Exportar Pendentes" na pagina de Regras/Pendencias
   -> Baixa CSV com todos os campos dos lancamentos pendentes
2. Admin analisa a planilha e monta as regras em outra aba/planilha
3. Admin sobe o CSV de regras na pagina de Regras
   -> Sistema valida, insere todas as regras e reprocessa os pendentes
```

## Mudancas

### 1. Pagina de Regras (Regras.tsx) - Adicionar botoes de exportar e importar

**Exportar Pendentes (CSV):**
- Botao "Exportar Pendentes" ao lado do botao "Nova Regra"
- Busca todos os lancamentos com `pendente_regra = true` com todos os campos
- Gera CSV com colunas: produto, plano, modalidades, forma_pagamento, condicao_pagamento, empresa, situacao_contrato, resp_venda, resp_recebimento, valor, data_lancamento, data_inicio, nome_cliente, numero_contrato, categoria, duracao, turmas
- Download automatico no navegador

**Importar Regras (CSV):**
- Botao "Importar Regras" ao lado do botao de exportar
- Aceita arquivo CSV com as colunas: campo_alvo, operador, valor, entra_meta, responsavel_campo, regra_mes, observacao
- Validacao no frontend antes de inserir:
  - campo_alvo deve ser um dos valores validos (produto, plano, etc.)
  - operador deve ser valido (contem, igual, etc.)
  - valor nao pode ser vazio
  - entra_meta deve ser sim/nao ou true/false
  - responsavel_campo deve ser resp_venda ou resp_recebimento
  - regra_mes deve ser DATA_LANCAMENTO, DATA_INICIO ou HIBRIDA
- Preview dos dados importados em um dialog antes de confirmar
- Insere todas as regras com prioridades sequenciais (continuando da ultima existente)
- Apos inserir, dispara reprocessamento automatico dos pendentes

### 2. Funcao utilitaria de CSV (novo arquivo: src/lib/csv.ts)

- `exportToCSV(data, filename)`: converte array de objetos para CSV e faz download
- `parseCSV(file)`: le arquivo CSV e retorna array de objetos com os headers como chaves

### 3. Componente de preview da importacao (inline no Regras.tsx)

- Dialog que mostra tabela com as regras parseadas do CSV
- Indicacao de erros de validacao por linha (linhas invalidas em vermelho)
- Contagem: X regras validas, Y com erro
- Botao "Importar X regras" que so importa as validas
- Checkbox "Reprocessar pendentes apos importar" (marcado por padrao)

## Formato do CSV de Regras (template)

```text
campo_alvo,operador,valor,entra_meta,responsavel_campo,regra_mes,observacao
produto,contem,Academia,sim,resp_venda,DATA_LANCAMENTO,Regra para academias
plano,igual,Mensal,sim,resp_venda,DATA_INICIO,Planos mensais
situacao_contrato,contem,Cancelado,nao,resp_venda,DATA_LANCAMENTO,Contratos cancelados
```

## Detalhes tecnicos

- Exportacao feita 100% no frontend (query Supabase + geracao CSV no browser)
- Importacao feita no frontend (parse CSV + insert batch no Supabase + invoke classificar-meta)
- Sem necessidade de nova edge function
- Valores de `entra_meta` aceitos: sim/nao, true/false, 1/0, s/n
- Encoding UTF-8 com BOM para compatibilidade com Excel
- Separador ponto-e-virgula (;) como opcao para Excel brasileiro, com deteccao automatica

### Arquivos modificados/criados
- `src/lib/csv.ts` (novo) - Utilitarios de exportacao/importacao CSV
- `src/pages/Regras.tsx` - Botoes de exportar pendentes e importar regras + dialog de preview

