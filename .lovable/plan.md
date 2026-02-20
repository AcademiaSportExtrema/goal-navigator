

## Aprimorar Card de Niveis de Comissao na Visao Consultora

### O que muda

O card "Niveis de Comissao" atualmente mostra apenas o range de % de atingimento e o % de comissao. A melhoria adicionara duas informacoes por nivel:

1. **Valor em R$ do range** -- calculado como `metaIndividual * de_percent` ate `metaIndividual * ate_percent`, mostrando quanto a consultora precisa vender para atingir aquele nivel.
2. **Range de bonus estimado** -- calculado como `valorMinRange * comissao_percent` ate `valorMaxRange * comissao_percent`, mostrando quanto ela ganharia de comissao se ficar naquele nivel.

### Layout proposto

Cada card de nivel passara a exibir:

```text
+-----------------------+
|     Nivel 2           |
|   71% - 85%           |
|  R$ 7.100 - R$ 8.500  |  <-- novo: range de vendas
|      0.5%             |
| Bonus: R$35 - R$42    |  <-- novo: range de bonus estimado
+-----------------------+
```

O nivel ativo (onde a consultora esta) continuara destacado com `bg-primary`.

### Detalhes tecnicos

**Arquivo:** `src/pages/VisaoConsultora.tsx`

- Dentro do bloco de renderizacao dos niveis (linhas 262-281), calcular para cada nivel:
  - `valorMin = metaIndividual * de_percent`
  - `valorMax = metaIndividual * ate_percent` (para o ultimo nivel, exibir como "+" ao inves de um teto)
  - `bonusMin = valorMin * comissao_percent`
  - `bonusMax = valorMax * comissao_percent`
- Adicionar duas novas linhas de texto em cada card do nivel com esses valores formatados em BRL
- Usar `text-xs opacity-70` para os valores monetarios para nao competir visualmente com o % principal
- Tratar o caso em que `metaIndividual` e 0 ou nao definida, mostrando "-" nos valores

Nenhuma alteracao de banco de dados ou edge function e necessaria -- todos os dados ja estao disponiveis no frontend.
