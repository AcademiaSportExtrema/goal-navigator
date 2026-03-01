

## Remover botão "Criar Regra" redundante da página Pendências

O botão "Criar Regra" apenas redireciona para `/regras` sem reprocessar. O "Criar e Reprocessar" já cria a regra E reprocessa no mesmo fluxo, tornando o primeiro desnecessário.

### Alteração

**Arquivo:** `src/pages/Pendencias.tsx`
- Remover o `<Button>` com texto "Criar Regra" e o `<Link>` associado (linhas 371-376)
- Manter apenas o botão "Criar e Reprocessar"

### Impacto
- Simplifica a interface removendo uma opção redundante
- Nenhuma funcionalidade perdida — o dialog inline já cobre 100% do caso de uso

