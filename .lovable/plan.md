
## Remover card "Total Faturado" do Dashboard

### Alteração em `src/pages/Dashboard.tsx`

Existem duas ocorrências do card "Total Faturado":

1. **Linhas 447-460** — visão da consultora (dentro do bloco não-admin)
2. **Linhas 614-627** — visão admin (dentro da aba "Vendas Consultoras")

Ambos os blocos `{show('card_total_faturado') && (<Card>...</Card>)}` serão removidos.
