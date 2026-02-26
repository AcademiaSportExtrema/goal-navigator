

## Corrigir gaps entre níveis de comissão

### Problema
Os inputs de "De %" e "Até %" na configuração do mês aceitam apenas inteiros (sem `step`), criando gaps como 70→71 onde valores como 70.5% não se encaixam em nenhum nível.

### Solução

#### 1. `src/pages/ConfiguracaoMes.tsx` — Inputs com duas casas decimais
- Adicionar `step="0.01"` nos inputs de `de_percent` e `ate_percent` (linhas 388-406)
- Isso permite configurar faixas como 0–70.00 / 70.01–85.00 / etc.

#### 2. `src/pages/ConfiguracaoMes.tsx` — Parsing com vírgula
- No `salvarConfig`, usar `parseFloat(n.de_percent.replace(',', '.'))` para suportar entrada com vírgula (pt-BR)
- Mesmo tratamento para `ate_percent` e `comissao_percent`

#### 3. Defaults sem gap
- Atualizar `defaultNiveis` para eliminar gaps nos valores padrão (ex: 0–79.99, 80–99.99, etc.)

#### 4. Já corrigido nos dashboards
A lógica descendente já implementada no Dashboard, MinhaPerformance, Metas e VisaoConsultora usa `>=` no `de_percent`, então com faixas contíguas (70.00 / 70.01) o cálculo funciona corretamente. Nenhuma mudança necessária nos dashboards — o problema é apenas na interface de configuração que não permite decimais.

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/pages/ConfiguracaoMes.tsx` | `step="0.01"` nos inputs de faixa, parsing com vírgula, defaults sem gap |

