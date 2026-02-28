

## Histórico de Comissões por Consultora

### Problema
A página "Visão Consultora" está travada no mês atual (`mesAtual = format(new Date(), 'yyyy-MM')`). Admins precisam consultar meses anteriores para ver comissões históricas.

### Solução
Adicionar um seletor de mês na página **Visão Consultora** (apenas para admins), reutilizando a mesma lógica de meses do Dashboard (12 meses retroativos). 

### Alterações em `src/pages/VisaoConsultora.tsx`

1. **Substituir `mesAtual` fixo por estado `mesSelecionado`** com valor inicial do mês corrente
2. **Gerar lista de meses** (12 meses) igual ao Dashboard admin
3. **Adicionar Select de mês** ao lado do seletor de consultora no card de seleção
4. **Substituir todas as referências** de `mesAtual` por `mesSelecionado` nas queries e exibição

A estrutura do seletor ficará:

```text
┌──────────────────────────────────────────────┐
│ 👁 [Selecione uma consultora ▼]  [Mês ▼]    │
└──────────────────────────────────────────────┘
```

Nenhuma alteração de banco de dados necessária.

