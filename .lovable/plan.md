

## Correção: Cor preta para diferenças iguais a zero

**Problema**: Nas colunas de diferença das tabelas de Fechamento de Caixa e Meta Anual, quando o valor é R$ 0,00, o texto fica com a cor padrão (cinza/muted). O usuário quer que fique **preto**.

**Correção**: Adicionar `text-foreground` como classe explícita quando a diferença for exatamente 0, em ambos os arquivos:

### `src/components/relatorios/FechamentoCaixaTable.tsx`
4 pontos (linhas 263, 271, 289, 294): trocar a lógica de cor para incluir `text-foreground` no caso `=== 0`.

Exemplo da lógica atual:
```
dif !== 0 && dayTotal > 0 ? (dif > 0 ? 'text-green-600' : 'text-red-600') : ''
```
Nova lógica:
```
dif > 0 ? 'text-green-600' : dif < 0 ? 'text-red-600' : 'text-foreground'
```

### `src/components/relatorios/MetaAnualTable.tsx`
2 pontos (linhas 238, 251): mesma substituição.

Total: 6 alterações pontuais de classe CSS, sem mudança de lógica de dados.

