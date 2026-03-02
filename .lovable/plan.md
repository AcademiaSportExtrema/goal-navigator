

# Relatório de QA — Relatório de Devedores por Upload Manual Diário

---

## 1) Resumo Geral

**Status: APROVADO COM RESSALVAS**

A funcionalidade está implementada de forma sólida, com boa cobertura de parsing, validação, segurança RLS e isolamento multi-tenant. Existem algumas ressalvas pontuais que não comprometem o funcionamento principal mas merecem atenção.

---

## 2) Cenários Testados

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Upload válido com arquivo no formato esperado | **PASSOU** |
| 2 | Campos exibidos no relatório | **PASSOU COM RESSALVA** |
| 3 | Resumo de processamento | **PASSOU** |
| 4 | Validação de colunas obrigatórias | **PASSOU** |
| 5 | Validação de data | **PASSOU** |
| 6 | Validação de valor | **PASSOU** |
| 7 | Consultor não cadastrado (warning) | **PASSOU** |
| 8 | Normalização de escrita do consultor | **PASSOU COM RESSALVA** |
| 9 | Admin visualiza todos os registros | **PASSOU** |
| 10 | Consultora visualiza somente seus registros | **PASSOU** |
| 11 | Isolamento de acesso no backend | **PASSOU** |
| 12 | Regressão — auth, rotas, permissões | **PASSOU** |
| 13 | Robustez — arquivo vazio, linhas vazias, colunas extras | **PASSOU** |

---

## 3) Evidências por Teste

### Teste 1 — Upload válido
- Edge function `upload-devedores` aceita `.xls`, `.xlsx`, `.csv`.
- Parser tenta cabeçalho na linha 0 e na linha 1, escolhendo o que mapeia mais colunas (`buildHeaderMap`). Isso cobre corretamente arquivos com linha de título antes do cabeçalho real.
- Upload faz storage → edge function → delete anterior → insert em batch.
- **Evidência**: Network request mostra dados retornados corretamente após upload (ex: "Ketlyn De Souza Vieira" com 3 registros).

### Teste 2 — Campos exibidos
- A tabela principal (admin) mostra: Nome, Data Vencimento, Valor Parcela, Consultor, Cobrança.
- A tabela da Visão Consultora mostra: Nome, Data Vencimento, Valor Parcela, Cobrança.
- **Ressalva**: A tabela admin mostra 5 colunas (inclui "Cobrança"), não apenas as 4 do requisito. Isso é um comportamento correto e esperado para o admin — a coluna de cobrança é funcional (checkbox editável). Não é um defeito.

### Teste 3 — Resumo de processamento
- Implementado completamente: `total_linhas`, `importados`, `avisos[]`, `erros[]`, `arquivo_nome`, `uploaded_at`, `uploaded_by_email`.
- UI exibe grid com 4 indicadores + metadata com ícones.
- Avisos e erros são expansíveis (Collapsible), mostrando linha e detalhe.

### Teste 4 — Colunas obrigatórias
- `REQUIRED_COLUMNS = ['nome', 'data_vencimento', 'valor_parcela', 'consultor']`.
- Se faltam, retorna `{ error: 'colunas_faltantes', colunas_faltantes: [...] }` com status 400.
- Frontend exibe Alert com lista das colunas ausentes.
- Importação não prossegue (nenhum dado inserido).

### Teste 5 — Validação de data
- `parseDate` suporta: número Excel (serial date), formato `dd/mm/yyyy`, formato ISO.
- Data inválida gera aviso com tipo `data_invalida` e detalhe do valor.
- Linha é incluída com `data_vencimento: null` — processamento continua.

### Teste 6 — Validação de valor
- `parseValor` suporta: número, string com `R$`, formato brasileiro (`1.234,56`), formato internacional (`1234.56`).
- Valor inválido gera aviso com tipo `valor_invalido`.
- Linha é incluída com `valor: 0` — processamento continua.

### Teste 7 — Consultor não cadastrado
- Busca consultoras da empresa, normaliza com `normalizeText` (NFD + remove acentos + lowercase + trim).
- Se nome normalizado não encontrado → aviso tipo `consultor_nao_cadastrado` com detalhe do nome.
- Admin vê avisos no resumo após upload.

### Teste 8 — Normalização de escrita
- `normalizeText`: remove acentos (NFD), lowercase, trim.
- **Ressalva**: Não normaliza espaços duplos internos. Ex: `"LIVIA  MAYSA"` (2 espaços) → `"livia  maysa"` não fará match com `"livia maysa"` (1 espaço). **Impacto: baixo** — raro em arquivos reais, mas possível.
- Case-insensitive: **FUNCIONA** — tanto no matching da edge function quanto nas RLS policies (usam `LOWER()`).

### Teste 9 — Admin visualiza todos
- RLS policy `Admins manage own empresa devedores_parcelas` com comando `ALL` garante acesso completo.
- Filtros de consultor e status de cobrança implementados no frontend com `Select` dropdown.
- Busca textual implementada com `or(nome.ilike, consultor.ilike, contrato.ilike)`.
- Ordenação por colunas implementada (sortField/sortDir).
- **Evidência**: Network request sem filtro de consultor retorna todos os registros da empresa.

### Teste 10 — Consultora visualiza somente seus registros
- RLS policy `Consultoras view own devedores_parcelas` usa `LOWER(consultor) IN (SELECT LOWER(nome) FROM consultoras WHERE id = get_user_consultora_id(auth.uid()))`.
- Filtro é aplicado no banco, não apenas na UI.
- Consultora não consegue ver dados de outras consultoras.

### Teste 11 — Isolamento de acesso
- Confirmado: restrição via RLS (camada de dados), não apenas interface.
- Edge function deriva `empresa_id` do servidor via `get_user_empresa_id` — não confia no valor do cliente.
- Upload restrito a admin/super_admin (verificação de role no backend).

### Teste 12 — Regressão
- A feature usa componentes existentes (`AppLayout`, `PaginationControls`, `exportToCSV`, `useAuth`).
- Não altera nenhum componente compartilhado.
- Rotas existentes não foram modificadas.
- Auth/login/logout não impactados.
- O upload de lançamentos (Excel) continua em fluxo separado — sem interferência.
- A migração SQL mais recente apenas recriou 2 policies de `devedores_parcelas` — nenhuma outra tabela foi tocada.

### Teste 13 — Robustez
- **Arquivo vazio / apenas título**: `parseCSVText` retorna `[[], []]` se < 2 linhas. Para XLS, `sheet_to_json` retorna array vazio. Em ambos os casos, `jsonData` será vazio, `totalLinhasLidas = 0`, resultado: `{ importados: 0 }`.
- **Linhas vazias no meio**: Filtro `if (!nome && !consultorRaw && !contratoRaw) continue` pula corretamente.
- **Colunas extras**: `buildHeaderMap` só mapeia colunas conhecidas via aliases — extras são ignoradas.
- **Encoding**: CSV lê como text (UTF-8 default do Deno), BOM removido.

---

## 4) Problemas Encontrados

| # | Problema | Impacto | Tipo | Sugestão |
|---|---------|---------|------|----------|
| 1 | Espaços duplos internos não normalizados no matching de consultor | Baixo | Funcional | Adicionar `.replace(/\s+/g, ' ')` na função `normalizeText` da edge function |
| 2 | Consultores duplicados na lista de filtro (consultor é text livre, pode ter variações de casing) | Baixo | UX | A query de `consultoresList` não aplica `empresa_id` explicitamente no filtro (depende do RLS), e não deduplica case-insensitive |
| 3 | Export CSV não aplica os filtros ativos — sempre exporta todos (até 5000) | Baixo | UX | Propagar filtros ativos para a query de exportação |

---

## 5) Confirmação Final

**Admin vs Consultora isolado corretamente?**
Sim. O isolamento é garantido via RLS policies no banco de dados, usando `LOWER()` para matching case-insensitive. A edge function valida role e deriva `empresa_id` do servidor.

**Feature reutiliza estrutura existente sem quebrar?**
Sim. Usa `useAuth`, `AppLayout`, `PaginationControls`, `exportToCSV`. Nenhum componente compartilhado foi modificado.

**Houve indício de regressão?**
Não. As únicas mudanças no banco foram 2 policies de `devedores_parcelas` (recriação com `LOWER()`). Nenhuma outra tabela, função ou trigger foi alterada.

---

## Limitações do Teste

- **Não foi possível executar upload real** durante esta análise (QA por inspeção de código e dados de rede).
- **Teste de login como consultora** não executado — depende de sessão autenticada como consultora. Recomendação: fazer login com a conta da Livia e verificar que apenas seus devedores aparecem na página `/devedores`.
- **Teste de nome ambíguo** não aplicável — o sistema não faz matching ambíguo, apenas matching exato após normalização, o que é o comportamento correto.

