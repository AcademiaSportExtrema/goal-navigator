

# Atualizar Role para Super Admin

Como a ferramenta de leitura do banco nao permite escrita, vou executar uma migracao SQL simples para atualizar o role do seu usuario.

## O que sera feito

Uma unica migracao SQL que altera o role do usuario admin existente (ID: `adad88a8-6070-4a66-8537-32b55cb6ba3b`) de `admin` para `super_admin` na tabela `user_roles`.

## Detalhes tecnicos

```text
UPDATE public.user_roles 
SET role = 'super_admin' 
WHERE user_id = 'adad88a8-6070-4a66-8537-32b55cb6ba3b';
```

## Apos a atualizacao

- Faca logout e login novamente para que o sistema reconheca o novo role
- O menu lateral exibira as opcoes de Super Admin: Empresas, Nova Empresa, Financeiro
- Voce tera acesso irrestrito a todas as empresas e dados da plataforma

