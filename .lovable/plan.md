

## Correção: Pre-preenchimento do dialog de regras na página Pendências

### Problema
Quando o usuário clica em "Criar e Reprocessar", o dialog pre-preenche `campo_alvo = 'produto'` e `valor = group.produto`. Porém, esses itens deveriam ter regras criadas com `campo_alvo = 'plano'`, usando o valor do campo `plano` do lançamento.

Além disso, quando o usuário muda o `campo_alvo` no Select, o `valor` não atualiza automaticamente para refletir o campo correspondente do grupo.

### Correção em `src/pages/Pendencias.tsx`

**1. Inverter a prioridade do pre-preenchimento (linha 225-236)**
- Mudar para priorizar `plano` sobre `produto`:
```typescript
if (group.plano) {
  campo_alvo = 'plano';
  valor = group.plano;
} else if (group.produto) {
  campo_alvo = 'produto';
  valor = group.produto;
} else if (group.empresa) {
  campo_alvo = 'empresa';
  valor = group.empresa;
}
```

**2. Atualizar valor ao trocar campo_alvo (linha 407)**
- No `onValueChange` do Select de campo_alvo, atualizar o `valor` automaticamente com o valor correspondente do `selectedGroup`:
```typescript
onValueChange={(value) => {
  const campo = value as CampoAlvo;
  const novoValor = selectedGroup?.[campo as keyof PendenciaGroup] as string || '';
  setForm(f => ({ ...f, campo_alvo: campo, valor: typeof novoValor === 'string' ? novoValor : '' }));
}}
```

