
# Criar Usuário Admin no Sistema

## Objetivo
Configurar o primeiro usuário administrador para ter acesso completo a todas as funcionalidades do sistema de metas.

---

## Abordagem

Vou criar um processo em **2 etapas**:

1. **Habilitar confirmação automática de email** (temporariamente) - para que você consiga acessar imediatamente após o cadastro

2. **Criar trigger automático** - quando você se cadastrar com um email específico, o sistema automaticamente atribuirá a role de admin

---

## O que será implementado

### 1. Configuração de Auth
Habilitar auto-confirm de email para facilitar o primeiro acesso (pode ser desabilitado depois)

### 2. Trigger de Atribuição Automática de Admin
Criar uma função e trigger no banco que:
- Monitora novos cadastros no sistema
- Quando o PRIMEIRO usuário se cadastrar, atribui automaticamente a role `admin`
- Usuários subsequentes ficam sem role (precisam ser configurados manualmente)

### 3. Alternativa Manual
Se preferir, posso criar diretamente no banco:
- Você cadastra um email qualquer pela tela de cadastro
- Eu insiro a role admin via migration SQL

---

## Fluxo após implementação

1. Você acessa `/cadastro`
2. Cria conta com seu email e senha
3. O sistema automaticamente atribui role `admin` (primeiro usuário)
4. Você é redirecionado ao dashboard com acesso total

---

## Arquivos a serem modificados/criados

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/...` | Nova migration com trigger para auto-assign admin |

---

## Segurança

- O trigger de auto-assign só funciona para o **primeiro** usuário cadastrado
- Após o primeiro admin, novos usuários precisam ter sua role configurada manualmente por um admin
- A role é armazenada na tabela separada `user_roles` conforme melhores práticas de segurança
