

## Auditoria de Segurança Multi-Tenant

Revisei todas as 16 Edge Functions, todas as tabelas com RLS, e as queries do frontend. Segue o resultado:

### Problemas Encontrados

**1. CRITICO: `classificar-meta` - Regras sem filtro de empresa_id**
- Linha 73-77: busca `regras_meta` com `.eq('ativo', true)` mas **sem** `.eq('empresa_id', ...)`. Como usa `SERVICE_ROLE_KEY`, o RLS nao aplica. Resultado: regras de uma empresa podem ser aplicadas a lancamentos de outra.
- Linha 54-59: para super_admin, lancamentos sao buscados **sem filtro de empresa_id**, e como usa service role, retorna lancamentos de TODAS as empresas. Combinado com regras sem filtro, um super_admin pode misturar regras entre empresas.

**2. CRITICO: `manage-consultora-access` - Sem verificacao de empresa_id**
- Linha 35: verifica apenas `has_role('admin')`, mas nao valida que a `consultora_id` pertence a mesma empresa do admin. Um admin da Empresa A poderia vincular usuarios a consultoras da Empresa B se souber o UUID.
- Nas acoes `link`, `create_and_link` e `unlink`: o `empresa_id` vem do body da requisicao (confiado ao cliente), nao e derivado do servidor.

**3. MEDIO: `audit-log` - empresa_id aceita do body**
- Linha 54: `empresa_id: empresa_id || userRole?.empresa_id || null` aceita empresa_id do body da requisicao. Um admin poderia inserir logs com empresa_id de outra empresa (poluindo audit trail).

**4. MEDIO: `ai-analista` - Lancamentos sem filtro empresa_id explicito**
- Linha 77-81: query de lancamentos usa cliente com anon key + auth header (RLS aplica), porem nao filtra por `empresa_id` explicitamente. A RLS protege, mas depende 100% das policies estarem corretas. O mesmo ocorre nas queries do Dashboard (linhas 104-125).

**5. BAIXO: `admin-reset-password` - audit_log sem empresa_id**
- Linha 82-89: o insert no `audit_logs` nao inclui `empresa_id`, dificultando rastreamento.

### O Que Esta Correto

- **RLS**: Todas as 17 tabelas tem RLS habilitado com policies corretas (empresa_id via `get_user_empresa_id`)
- **upload-importar-xls**: Valida `uploadData.empresa_id !== userEmpresaId` antes de processar (linha 286)
- **reprocessar-upload**: Valida empresa_id do upload vs empresa_id do usuario (linha 132)
- **admin-reset-password**: Valida isolamento de empresa para admins (linhas 62-74)
- **Edge Functions super_admin**: `create-empresa`, `create-user-admin`, `list-users-admin`, `admin-empresa-details`, `impersonate-user` - todos validam `super_admin` corretamente
- **Frontend queries**: Gerencial, Dashboard, Metas, Relatorios - dependem de RLS que esta corretamente configurado
- **Storage**: Bucket `uploads` com RLS por empresa_id

### Plano de Correcao (3 arquivos)

**1. `supabase/functions/classificar-meta/index.ts`**
- Adicionar `.eq('empresa_id', userEmpresaId)` na query de `regras_meta` (linha 73)
- Para super_admin sem empresa especifica, exigir `empresa_id` no body ou rejeitar reprocessamento em massa

**2. `supabase/functions/manage-consultora-access/index.ts`**
- Derivar `empresa_id` do caller via `get_user_empresa_id` no servidor (nao confiar no body)
- Validar que `consultora_id` pertence a mesma empresa do admin antes de qualquer operacao

**3. `supabase/functions/audit-log/index.ts`**
- Ignorar `empresa_id` do body; usar sempre `userRole?.empresa_id`

### Detalhes Tecnicos

O problema mais critico e no `classificar-meta`. A query atual:
```
const { data: regras } = await supabase
  .from('regras_meta')
  .select('*')
  .eq('ativo', true)  // FALTA: .eq('empresa_id', empresa_id)
```

Isso significa que ao classificar lancamentos, TODAS as regras de TODAS as empresas sao carregadas e aplicadas. Uma regra da Empresa A (ex: "produto contem BOLD -> entra_meta = true") seria aplicada em lancamentos da Empresa B.

No `manage-consultora-access`, o `empresa_id` e passado pelo frontend:
```
const { action, email, consultora_id, password, empresa_id } = await req.json();
```
Deveria ser:
```
const { data: callerEmpresa } = await supabaseAdmin.rpc('get_user_empresa_id', { _user_id: caller.id });
```

