
Diagnóstico

O aviso é crítico, mas a causa aqui está clara: o SQL que a central gera hoje foi desenhado para ser apenas um “DDL base”. No próprio código atual isso está explícito:

- `supabase/functions/export-cloud-data/index.ts` monta o SQL com:
  - enums
  - `CREATE TABLE`
- e declara claramente:
  - `-- Não inclui RLS, policies, funções, triggers ou chaves estrangeiras.`

A UI também avisa isso em `src/pages/Exportacoes.tsx`.

Então, quando você cola esse SQL em outro projeto, as tabelas são criadas sem Row Level Security e o backend alerta corretamente que qualquer pessoa com acesso à Data API poderia consultá-las.

Melhor maneira de corrigir

A melhor correção não é “ligar RLS manualmente tabela por tabela depois”.
A melhor correção é fazer o exportador gerar um pacote SQL de migração “completo e seguro”, contendo:

1. `CREATE TYPE`
2. `CREATE TABLE`
3. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
4. funções auxiliares usadas nas policies:
   - `has_role`
   - `get_user_empresa_id`
   - `get_user_consultora_id`
   - `is_empresa_active` quando necessário
   - `update_updated_at_column` se for parte do comportamento esperado
5. `CREATE POLICY` de cada tabela
6. opcionalmente:
   - índices importantes
   - triggers de `updated_at`
   - FKs
   - comentários/blocos por seção

Por que essa é a melhor abordagem

Porque o seu sistema é multi-tenant e quase toda a segurança depende de:
- `empresa_id`
- `auth.uid()`
- `user_roles`
- funções `SECURITY DEFINER`
- policies por papel (`admin`, `consultora`, `super_admin`)

Se você exporta só as tabelas, você migra a estrutura, mas não migra o modelo de segurança.
Na prática, isso gera um banco “funcionando”, porém inseguro.

O que eu recomendaria implementar

1. Evoluir o gerador de SQL da tela `/exportacoes`
Adicionar novos modos de exportação:
- SQL base
- SQL seguro
- SQL completo

Sugestão de escopo:
- SQL base: como está hoje
- SQL seguro: enums + tabelas + funções de auth/RLS + enable RLS + policies
- SQL completo: tudo do seguro + triggers + índices + FKs

2. Tornar o SQL seguro o padrão recomendado
Na interface, o botão principal deveria ser algo como:
- “Gerar SQL seguro para migração”

E o texto do card deve deixar claro:
- “Este pacote inclui RLS e policies para evitar exposição pública via Data API.”

3. Reaproveitar o que já existe nas migrations reais
Em vez de inventar policies novas no exportador, o ideal é mapear as policies já existentes no projeto e exportá-las com fidelidade.
Hoje o projeto já tem:
- RLS habilitado
- policies por tabela
- funções auxiliares existentes
- regras multi-tenant já consolidadas

Isso reduz risco de divergência entre:
- ambiente atual
- ambiente migrado

4. Exportar dependências na ordem correta
A ordem importa. O pacote deve sair assim:

```text
1. extensões
2. enums
3. tabelas
4. funções auxiliares
5. triggers utilitárias
6. enable RLS
7. policies
8. índices/FKs
```

Sem isso, parte do SQL pode falhar ao colar.

Cuidados importantes

1. Não gerar policy sem gerar a função que ela usa
Exemplo:
- várias policies usam `has_role(...)`
- várias usam `get_user_empresa_id(...)`
- algumas usam `get_user_consultora_id(...)`

Se a policy vier sem essas funções, a migração quebra.

2. Não simplificar demais as policies
Como o sistema tem perfis diferentes, não basta algo genérico como:
- “authenticated pode tudo”

Isso destruiria a segurança do projeto.

3. Não confiar em RLS desativado “temporariamente”
Mesmo em ambiente de migração/teste, deixar RLS desligado em tabelas com dados reais ou sensíveis é um risco alto.

4. O pacote atual também está incompleto para comportamento
Além da segurança, o SQL atual também não leva:
- triggers
- FKs
- índices
- parte da lógica operacional

Então a correção ideal deve tratar segurança primeiro, mas também considerar fidelidade estrutural.

Plano de implementação recomendado

1. Auditar no exportador todos os objetos necessários para migração segura:
- enums
- tabelas públicas exportáveis
- funções auxiliares de segurança
- policies por tabela
- triggers/índices essenciais

2. Criar uma camada nova no `export-cloud-data` para montar:
- `buildSecureSchemaSql(table?)`
- `buildFullSchemaSql(table?)`

3. Incluir no SQL gerado:
- `ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;`
- blocos `CREATE POLICY ...`

4. Atualizar a página `Exportacoes.tsx` para permitir escolher:
- Base
- Seguro
- Completo

5. Marcar o modo “Base” como avançado/limitado e o modo “Seguro” como recomendado.

6. Validar manualmente as tabelas mais sensíveis primeiro:
- `user_roles`
- `empresas`
- `consultoras`
- `uploads`
- `lancamentos`
- `audit_logs`
- `permissoes_perfil`
- `solicitacoes_ajuste`

Resultado esperado

Depois desse ajuste, o SQL exportado deixará de criar tabelas “abertas”.
Ao colar em outro projeto, as tabelas já nascerão com:
- RLS habilitado
- policies aplicadas
- helpers necessários para multi-tenant
- muito menos risco de exposição pública

Conclusão objetiva

Sim, esse aviso é grave.
Mas no seu caso ele aconteceu porque o gerador atual exporta só o esqueleto das tabelas, sem a camada de segurança.

A melhor correção é transformar esse exportador em um gerador de migração segura, incluindo RLS + policies + funções auxiliares, em vez de continuar exportando apenas `CREATE TABLE`.
