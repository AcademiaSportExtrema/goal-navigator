

## Trocar filtro de data na Visão Consultora: mês atual + próximo mês com toggle buttons

### Problema
O seletor de data na Visão Consultora mostra 12 meses retroativos (desnecessário para consultoras) e não inclui o próximo mês. O admin precisa ver o mês atual e o próximo para conferir metas futuras.

### Alterações

**`src/pages/VisaoConsultora.tsx`**

1. **Remover** `mesesDisponiveis` (useMemo com `subMonths` gerando 12 meses) e a importação de `subMonths`
2. **Adicionar** variáveis `mesAtual` e `proximoMes` (como em MinhaPerformance, usando `addMonths`)
3. **Substituir** o `<Select>` de data por **toggle buttons** (mesmo padrão de MinhaPerformance):

```text
[ fev 2026 ]  [ mar 2026 ]     ← toggle buttons
```

4. Layout final do seletor:
```text
┌──────────────────────────────────────────────────────────┐
│ 👁 [ Selecione uma consultora ▾ ]   [fev 2026] [mar 2026]│
└──────────────────────────────────────────────────────────┘
```

- Botão ativo: `bg-primary text-primary-foreground`
- Botão inativo: `bg-muted text-muted-foreground hover:bg-accent`
- Default: mês atual selecionado

### Nenhuma outra alteração
Mesma lógica de dados, mesma query — só muda o componente de filtro e os meses disponíveis.

