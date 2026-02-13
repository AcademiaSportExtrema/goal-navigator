

# Resolver problemas de segurança detectados

## Problema 1: Emails de consultoras expostos (REAL)

A tabela `consultoras` tem uma politica SELECT que permite qualquer usuario da mesma empresa ver TODAS as consultoras, incluindo emails. Uma consultora consegue ver os dados de todas as outras.

### Solucao

Substituir a politica atual `Users view own empresa consultoras` por duas politicas mais restritivas:

1. **Admins veem todas as consultoras da empresa** -- necessario para gestao
2. **Consultoras veem apenas seu proprio registro** -- usando `get_user_consultora_id(auth.uid())`

```sql
-- Remover politica atual
DROP POLICY "Users view own empresa consultoras" ON public.consultoras;

-- Admins veem todas da empresa
CREATE POLICY "Admins view empresa consultoras"
ON public.consultoras FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND empresa_id = get_user_empresa_id(auth.uid())
);

-- Consultoras veem apenas seu proprio registro
CREATE POLICY "Consultoras view own record"
ON public.consultoras FOR SELECT
USING (
  id = get_user_consultora_id(auth.uid())
  AND empresa_id = get_user_empresa_id(auth.uid())
);
```

### Impacto no codigo

Paginas de admin (`Consultoras.tsx`, `Metas.tsx`, `ConfiguracaoMes.tsx`, `ConsultorasContent.tsx`) continuam funcionando porque admins mantem acesso total. Paginas de consultora (`MinhaPerformance.tsx`, `SolicitarAjuste.tsx`, `Gerencial.tsx`) ja filtram por `consultora_id`, entao continuam funcionando normalmente.

## Problema 2: Dados de clientes em lancamentos (FALSO POSITIVO)

A politica RLS `Consultoras view own lancamentos` ja restringe o acesso por `consultora_chave`, garantindo que cada consultora so veja seus proprios lancamentos. O scanner identificou isso incorretamente como uma vulnerabilidade.

### Acao

Marcar este finding como ignorado no sistema de seguranca, com justificativa de que o RLS ja protege adequadamente.

## Resumo

| Problema | Acao |
|----------|------|
| Emails de consultoras expostos | Restringir politica RLS para consultoras verem apenas seu proprio registro |
| Dados de clientes em lancamentos | Ignorar -- RLS ja protege corretamente |

### Arquivos e migracoes

- **Migracao SQL**: substituir politica RLS da tabela `consultoras`
- **Nenhum arquivo de codigo precisa ser alterado**

