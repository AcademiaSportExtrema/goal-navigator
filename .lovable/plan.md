

## Remover opcao "Cadastre-se" da tela de Login

### Problema

A tela de login exibe um link "Nao tem uma conta? Cadastre-se" que direciona para `/cadastro`. Porem, somente usuarios pre-cadastrados pelo administrador devem ter acesso ao sistema, tornando essa opcao incorreta.

### Solucao

Remover o bloco de texto e link "Cadastre-se" do final do formulario de login.

### Detalhes tecnicos

**Arquivo:** `src/pages/Login.tsx`

- Remover as linhas 109-114 que contem o `<div>` com o texto "Nao tem uma conta?" e o `<Link to="/cadastro">`
- Nenhuma outra alteracao necessaria

