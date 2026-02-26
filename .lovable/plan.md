

## Corrigir exibição dos níveis de comissão nos dashboards das consultoras

### Problema
Com a adição de casas decimais nas faixas (ex: 0–79.99%, 80–99.99%), os cards de "Níveis de Comissão" nas páginas **Minha Performance** e **Visão Consultora** ainda exibem os percentuais com `.toFixed(0)`, ou seja, arredondando para inteiro. Isso mostra "0% - 80%" ao invés de "0% - 79.99%", mantendo visualmente os gaps que foram corrigidos no backend. O mesmo ocorre com os valores em R$ calculados.

### Alterações

#### 1. `src/pages/MinhaPerformance.tsx` (linha 284)
- Trocar `.toFixed(0)` por formatação inteligente: mostrar decimais apenas quando necessário
  - `79.99%` → exibe "79.99%"
  - `80%` → exibe "80%" (sem decimais desnecessários)
- Mesma lógica para os valores em R$ (linhas 286-291): garantir que `valorMin` e `valorMax` reflitam as faixas com precisão decimal

#### 2. `src/pages/VisaoConsultora.tsx` (linha 305)
- Mesma correção de formatação nos cards de níveis de comissão

### Implementação
Criar helper inline ou reutilizável:
```typescript
const fmtPct = (v: number) => {
  const pct = v * 100;
  return pct % 1 === 0 ? `${pct.toFixed(0)}%` : `${pct.toFixed(2)}%`;
};
```

Substituir `{(deP * 100).toFixed(0)}%` por `{fmtPct(deP)}` nos dois arquivos.

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/MinhaPerformance.tsx` | Formatação decimal nos cards de níveis |
| `src/pages/VisaoConsultora.tsx` | Mesma formatação decimal |

