

# Correcao do titulo do mes no Dashboard

## Problema
Na linha 249 do `src/pages/Dashboard.tsx`, o titulo do mes e gerado assim:

```typescript
format(new Date(mesSelecionado + '-01'), 'MMMM yyyy', { locale: ptBR })
```

`new Date('2026-02-01')` interpreta a string como UTC meia-noite. No fuso horario do Brasil (UTC-3), isso vira 31 de janeiro as 21h, e o `format()` exibe "janeiro 2026" em vez de "fevereiro 2026".

## Solucao
Construir a data usando componentes numericos para evitar a interpretacao UTC:

```typescript
const [ano, mes] = mesSelecionado.split('-').map(Number);
// ...
format(new Date(ano, mes - 1, 1), 'MMMM yyyy', { locale: ptBR })
```

Isso cria a data no fuso local, eliminando o desvio de mes.

## Detalhes tecnicos

**Arquivo:** `src/pages/Dashboard.tsx`

**Alteracao na linha 249:**
De:
```typescript
{format(new Date(mesSelecionado + '-01'), 'MMMM yyyy', { locale: ptBR })}
```
Para:
```typescript
{format(new Date(Number(mesSelecionado.split('-')[0]), Number(mesSelecionado.split('-')[1]) - 1, 1), 'MMMM yyyy', { locale: ptBR })}
```

Tambem sera feita uma revisao rapida no restante do arquivo para verificar se ha outros usos de `new Date('YYYY-MM-DD')` com o mesmo problema.

