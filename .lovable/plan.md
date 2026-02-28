

## Wellhub: agrupar por data de pagamento + permitir edição

### Problema
Atualmente o Wellhub é agrupado por `mes_referencia` (mês de venda). O correto é agrupar pela `data_recebimento` (data de pagamento), extraindo o mês/ano dessa data.

### Alterações em `src/pages/Relatorios.tsx`

**1. Agrupamento por data de pagamento (wellhubByMonth e totalpassByMonth)**

Nas funções `wellhubByMonth` e `totalpassByMonth` (linhas 227-251), trocar a chave de agrupamento de `a.mes_referencia` para o mês extraído de `a.data_recebimento`:

```typescript
// Extrair YYYY-MM de data_recebimento ao invés de usar mes_referencia
const mesKey = a.data_recebimento ? a.data_recebimento.slice(0, 7) : a.mes_referencia;
```

Isso garante que o valor aparece no mês em que o pagamento foi recebido.

**2. Edição de registros existentes**

Na listagem de registros existentes no dialog (linhas 908-928), adicionar um botão de edição ao lado do botão de excluir. Ao clicar, preenche o formulário com os dados do registro para que o usuário possa alterar e salvar (upsert por id).

- Adicionar estado `editingId` para controlar qual registro está sendo editado
- Adicionar botão de edição (ícone lápis) em cada linha
- Ao clicar em editar, preencher o formulário com os valores do registro
- Ao salvar, se `editingId` estiver preenchido, fazer UPDATE ao invés de INSERT
- Adicionar mutation `updateAgregador` para o UPDATE

