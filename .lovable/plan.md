

## Análise de Impacto e Plano: Relatório de Devedores

---

### 1) Reaproveitamento do Sistema Atual

| Componente existente | Como será reaproveitado |
|---|---|
| **Autenticação (`useAuth`)** | Reutilizar `user`, `role`, `empresaId`, `consultoraId`, `isAdmin` sem alteração |
| **ProtectedRoute** | Nova rota `/devedores` com `requiredRole` ausente (ambos acessam) — controle de dados via query, não via rota |
| **Permissões (`usePermissions` + `permissoes_perfil`)** | Rota `/devedores` entra no sistema existente — admin pode habilitar/desabilitar no painel de permissões |
| **AppSidebar** | Adicionar item "Devedores" no menu admin (grupo Operacional) e no menu consultora |
| **AppLayout** | Tela usa `<AppLayout title="Devedores">` como todas as outras |
| **Upload pattern (Storage + Edge Function)** | Reaproveitar o padrão de `Upload.tsx`: drag-and-drop, upload para bucket Storage, chamar Edge Function para processar |
| **Mapeamento flexível de cabeçalhos** | Reaproveitar `normalizeHeader()` e o padrão `COLUMN_ALIASES` de `upload-importar-xls` — criar aliases específicos para devedores |
| **RLS multi-tenant** | Todas as policies seguem o padrão `empresa_id = get_user_empresa_id(auth.uid())` — replicar |
| **Isolamento consultora** | Consultora vê apenas registros onde `consultora_chave` = seu nome (mesmo padrão de `lancamentos`) |
| **Componentes UI** | `Table`, `Card`, `Button`, `Badge`, `Skeleton`, `toast/sonner`, `PaginationControls` |
| **Audit logs** | Registrar upload/exclusão via Edge Function `audit-log` existente |
| **CSV export** | `exportToCSV` de `src/lib/csv.ts` |

---

### 2) Riscos de Regressão e Mitigação

| Risco | Probabilidade | Mitigação |
|---|---|---|
| **Sidebar quebra** | Baixa | Apenas adicionar item ao array `adminMenuGroups` e `consultoraMenuItems` — sem alterar estrutura |
| **Rotas conflitantes** | Nula | Rota `/devedores` é nova, não colide com nenhuma existente |
| **RLS interfere em tabelas existentes** | Nula | Tabela nova `devedores_parcelas` é isolada, sem FK para `lancamentos` |
| **Edge Function nova afeta as existentes** | Nula | Função separada `upload-devedores`, sem compartilhar código |
| **Query global fica lenta** | Nula | Queries confinadas à nova tabela, não alteram queries de `lancamentos` |
| **Permissões existentes quebram** | Nula | Apenas inserir registros novos em `permissoes_perfil` para rota `/devedores` |
| **Bucket Storage compartilhado** | Baixa | Usar o bucket `uploads` existente com prefixo `devedores/` no path |

---

### 3) Estratégia de Implementação Segura

- **Tabela isolada**: `devedores_parcelas` — não altera nenhuma tabela existente
- **Edge Function isolada**: `upload-devedores` — parser dedicado, sem tocar em `upload-importar-xls`
- **Página isolada**: `src/pages/Devedores.tsx` — arquivo novo
- **Rota isolada**: `/devedores` no `App.tsx` — apenas uma linha adicionada
- **Sem hooks compartilhados modificados**: `useAuth`, `usePermissions`, `useImpersonation` permanecem intocados
- **Sem refactoring**: Nada existente é reorganizado

---

### 4) Plano em Etapas (Ordem de Execução)

**Etapa 1 — Persistência (migration SQL)**
- Criar tabela `devedores_parcelas` com colunas: `id`, `empresa_id`, `nome`, `data_vencimento`, `valor_parcela`, `consultor`, `arquivo_nome`, `uploaded_by`, `uploaded_at`
- Campos adicionais para rastreio: `contrato`, `codigo_parcela`, `parcela`, `cod_empresa`, `convênio`, `em_remessa`
- RLS: admin ALL + consultora SELECT (filtro por `consultor = nome da consultora`)
- Campo `consultor` será usado para vincular à consultora (mesmo padrão `consultora_chave` de `lancamentos`)

**Etapa 2 — Edge Function `upload-devedores`**
- Parser Excel com `npm:xlsx@0.18.5`
- Skip da 1a linha (título), cabeçalho na 2a linha
- Mapeamento flexível via `normalizeHeader` + aliases dedicados:
  - `nome` ≈ Nome
  - `data_vencimento` ≈ Dt. Vencimento Parcela, data vencimento, dt vencimento
  - `valor_parcela` ≈ Vlr. Parcela, valor parcela, vlr parcela
  - `consultor` ≈ Consultor, consultora, resp venda
  - E os demais campos opcionais
- Validação JWT + derivação de `empresa_id` via `get_user_empresa_id` (padrão existente)
- Substituição: cada upload limpa registros anteriores da mesma empresa (ou opção de append com data)
- Audit log via chamada à função existente

**Etapa 3 — Página `src/pages/Devedores.tsx`**
- Zona de upload (admin only) — reaproveitar padrão visual de `Upload.tsx`
- Tabela com colunas: Nome, Data de Vencimento, Valor da Parcela, Consultor
- Admin vê todos os registros
- Consultora vê apenas os dela (filtro via RLS)
- Filtros: busca por nome, consultor
- Exportar CSV

**Etapa 4 — Integração na navegação**
- `App.tsx`: nova rota `/devedores` com `<ProtectedRoute>` (sem `requiredRole` — ambos acessam)
- `AppSidebar.tsx`: item "Devedores" no grupo Operacional (admin) e no menu consultora

---

### 5) Dependências da Estrutura Atual

| Dependência | Como será resolvida |
|---|---|
| **Identificar consultora**: o arquivo traz "Consultor" como texto livre | Vincular via comparação case-insensitive com `consultoras.nome` (mesmo padrão de `consultora_chave` em `lancamentos`) |
| **Filtro RLS para consultora** | Policy: `consultor ILIKE (SELECT nome FROM consultoras WHERE id = get_user_consultora_id(auth.uid()))` — replica padrão de `lancamentos` |
| **Quem pode fazer upload** | Apenas `admin` — a zona de upload será condicionada a `isAdmin` no frontend, e a Edge Function valida `has_role(uid, 'admin')` |
| **Substituição vs acumulação** | Cada upload substitui todos os registros da empresa (DELETE + INSERT na mesma transação) — é um relatório diário, não histórico |
| **Bucket de storage** | Reutilizar bucket `uploads` existente com path `devedores/{empresa_id}/{timestamp}_{filename}` |

