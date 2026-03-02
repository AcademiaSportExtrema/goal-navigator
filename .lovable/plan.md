

## Plano: Aprimorar Relatório de Devedores com Validações Completas

A base já existe (tabela, RLS, Edge Function, página, sidebar, rota). O trabalho é aprimorar o parser e a UI para atender todos os requisitos de validação e feedback.

---

### O que já existe e será reaproveitado
- Tabela `devedores_parcelas` + RLS (admin ALL, consultora SELECT filtrado)
- Edge Function `upload-devedores` com parser flexível e mapeamento de aliases
- Página `Devedores.tsx` com upload, tabela, busca, paginação, export CSV
- Sidebar com item "Devedores" para admin e consultora
- Rota `/devedores` no `App.tsx`

---

### Alterações necessárias

**1. Edge Function `upload-devedores/index.ts`**

- Adicionar validação de colunas obrigatórias (`nome`, `data_vencimento`, `valor_parcela`, `consultor`). Se faltar alguma, retornar erro 400 com lista das faltantes (sem importar nada).
- Adicionar validação por linha: data inválida e valor inválido geram warnings (não bloqueiam).
- Buscar consultoras cadastradas da empresa (`SELECT nome FROM consultoras WHERE empresa_id = ?`) e comparar (trim, case-insensitive, normalize NFD) com o campo `consultor` de cada linha. Gerar warning para consultores não encontrados.
- Aceitar também `.csv` além de `.xls/.xlsx`.
- Retornar resumo completo: `{ total_linhas, importados, avisos: [...], erros: [...], arquivo_nome, uploaded_at, uploaded_by_email }`.

**2. Página `Devedores.tsx`**

- Aceitar `.csv` no input de arquivo.
- Exibir resumo completo do processamento após upload (card com total linhas, importados, avisos, erros, data/hora, usuário, arquivo).
- Exibir lista de avisos (consultores não cadastrados, datas/valores inválidos) em seção colapsável com ícone de warning.
- Exibir lista de erros em seção separada.
- Se o upload retornar erro de colunas faltantes, exibir mensagem clara listando as colunas ausentes (sem tocar nos dados).

---

### Segurança
- Nenhuma alteração em RLS, auth, roles ou rotas existentes.
- Validação de consultor no backend (Edge Function) — não apenas UI.
- `empresa_id` derivado do servidor via `get_user_empresa_id`.

### Riscos de regressão
- Zero: alterações confinadas a 2 arquivos isolados (Edge Function + página Devedores).

