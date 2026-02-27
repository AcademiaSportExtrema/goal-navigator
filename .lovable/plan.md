

## Restringir seletor de meses para consultora (apenas mês atual + próximo)

### Problema
O Dashboard mostra um dropdown com 12 meses de histórico para todos os perfis, incluindo consultoras. A consultora deveria ver apenas o mês atual e o próximo mês.

### Alterações

#### `src/pages/Dashboard.tsx`
1. Importar `useAuth` para obter o `role` (já importa `isAdmin`)
2. Condicionar a lista `meses`: se for consultora, gerar apenas 2 itens (mês atual e próximo); caso contrário, manter os 12 meses atuais
3. Usar `role` do `useAuth` para detectar consultora

```
const { isAdmin, role } = useAuth();
const isConsultora = role === 'consultora';

const meses = isConsultora
  ? [
      { value: format(new Date(), 'yyyy-MM'), label: format(new Date(), 'MMMM yyyy', { locale: ptBR }) },
      { value: format(addMonths(new Date(), 1), 'yyyy-MM'), label: format(addMonths(new Date(), 1), 'MMMM yyyy', { locale: ptBR }) },
    ]
  : Array.from({ length: 12 }, (_, i) => { ... });
```

#### `src/pages/Metas.tsx` (se consultora tiver acesso)
Aplicar a mesma lógica de restrição de meses, caso consultoras acessem essa rota.

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Dashboard.tsx` | Condicionar lista de meses por role |
| `src/pages/Metas.tsx` | Mesma restrição (segurança) |

