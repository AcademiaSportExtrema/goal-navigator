
# Excluir Lancamentos -- Admin

## O que sera feito

Adicionar um botao de excluir em cada linha da tabela na pagina Gerencial (`/gerencial`), visivel somente para admins. Ao clicar, um dialog de confirmacao aparece com os detalhes do lancamento. Ao confirmar, o lancamento e removido do banco.

## Alteracoes

### 1. `src/pages/Gerencial.tsx`

- Adicionar coluna "Acoes" no header da tabela (visivel para admins)
- Adicionar botao com icone de lixeira (Trash2) em cada linha
- Ao clicar, abrir um AlertDialog de confirmacao mostrando contrato, cliente, produto e valor
- Criar mutation `deleteLancamento` que faz `supabase.from('lancamentos').delete().eq('id', id)`
- Ao confirmar, invalidar queries relacionadas (lancamentos-gerencial, dashboard, etc.)
- Toast de sucesso/erro apos a operacao

### Nenhuma alteracao no backend

O admin ja possui RLS policy com permissao ALL na tabela lancamentos ("Admins manage own empresa lancamentos"), que inclui DELETE. Nao e necessario criar nenhuma migration.

## Seguranca

- O botao so aparece para usuarios com `role === 'admin'` ou `isSuperAdmin`
- A exclusao e protegida por RLS no banco -- apenas admins da mesma empresa podem deletar
- Dialog de confirmacao previne exclusoes acidentais
