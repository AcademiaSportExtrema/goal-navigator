

## Upload de Logo e Nome da Empresa

### Objetivo

Permitir que o super admin faca upload do logo de cada empresa na pagina de detalhes, e exibir o logo + nome da empresa na sidebar para usuarios admin/consultora.

### Alteracoes necessarias

#### 1. Banco de dados - Nova coluna

Adicionar coluna `logo_url` (text, nullable) na tabela `empresas` para armazenar a URL publica do logo.

#### 2. Storage - Bucket para logos

Criar um bucket publico `logos` no storage para armazenar os arquivos de logo. Politicas RLS:
- Super admins podem fazer upload/update/delete
- Qualquer pessoa pode visualizar (bucket publico para exibir na sidebar)

#### 3. Pagina EmpresaDetalhes (super admin)

**Arquivo:** `src/pages/super-admin/EmpresaDetalhes.tsx`

Adicionar no card "Informacoes da Empresa":
- Area de upload de logo com preview da imagem atual
- Botao para selecionar arquivo (aceitar apenas imagens: png, jpg, svg, webp)
- Ao selecionar, faz upload para o bucket `logos/{empresa_id}/logo.ext`
- Atualiza o campo `logo_url` na tabela `empresas` com a URL publica
- Exibir preview do logo atual (ou icone placeholder se nao houver)

#### 4. Hook useAuth - Carregar dados da empresa

**Arquivo:** `src/hooks/useAuth.tsx`

- Ao buscar dados da empresa no `fetchUserData`, tambem carregar `nome` e `logo_url`
- Adicionar `empresaNome` e `empresaLogoUrl` ao contexto de autenticacao

#### 5. Sidebar - Exibir logo e nome

**Arquivo:** `src/components/layout/AppSidebar.tsx`

- Para admin/consultora: substituir o icone de Target e texto "Sistema de Metas" pelo logo da empresa (ou fallback com inicial) e nome da empresa
- Super admin mantem o layout atual ("Sistema de Metas")

### Detalhes tecnicos

**Migracao SQL:**
```text
ALTER TABLE empresas ADD COLUMN logo_url text;

INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

-- Politica: super admins podem gerenciar logos
CREATE POLICY "Super admins manage logos"
ON storage.objects FOR ALL
USING (bucket_id = 'logos' AND has_role(auth.uid(), 'super_admin'))
WITH CHECK (bucket_id = 'logos' AND has_role(auth.uid(), 'super_admin'));

-- Politica: admins podem fazer upload do logo da propria empresa
CREATE POLICY "Admins upload own empresa logo"
ON storage.objects FOR ALL
USING (bucket_id = 'logos' AND has_role(auth.uid(), 'admin') AND (storage.foldername(name))[1] = get_user_empresa_id(auth.uid())::text)
WITH CHECK (bucket_id = 'logos' AND has_role(auth.uid(), 'admin') AND (storage.foldername(name))[1] = get_user_empresa_id(auth.uid())::text);

-- Politica: leitura publica (bucket publico)
CREATE POLICY "Public read logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');
```

**Upload no EmpresaDetalhes:**
- Input file oculto + botao estilizado
- Upload via `supabase.storage.from('logos').upload(path, file, { upsert: true })`
- Obter URL publica via `supabase.storage.from('logos').getPublicUrl(path)`
- Atualizar `empresas.logo_url` com a URL

**Contexto Auth atualizado:**
- `empresaNome: string | null` e `empresaLogoUrl: string | null` adicionados ao AuthContextType
- Carregados junto com a query que ja busca `ativo, subscription_status, trial_ends_at`

**Sidebar:**
- Se `empresaLogoUrl` existir, renderiza `<img>` com 32x32px arredondado
- Se nao, renderiza fallback com a inicial do nome da empresa em um circulo colorido
- Texto muda de "Sistema de Metas" para o nome da empresa

**Arquivos alterados:**
- Migracao SQL (nova coluna + bucket + politicas)
- `src/pages/super-admin/EmpresaDetalhes.tsx`
- `src/hooks/useAuth.tsx`
- `src/components/layout/AppSidebar.tsx`

