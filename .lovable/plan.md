

## Analista IA — Comportamento igual ao Coach (análise diária automática)

### Problema atual
O AnalistaIaCard exige que o gestor clique manualmente em "Gerar Análise". Diferente do Coach IA das consultoras, que gera automaticamente no primeiro acesso do dia e salva.

### Solução
Replicar o mesmo comportamento do `CoachDicaDoDia`:
- No primeiro acesso do dia, gerar a análise automaticamente
- Salvar no banco com a data de criação
- Se já existe análise gerada hoje, exibir a salva
- Botão "Atualizar análise" permite regerar no mesmo dia
- No dia seguinte, gera automaticamente de novo

### Detalhes técnicos

#### 1. AnalistaIaCard — lógica de auto-geração diária

**Arquivo:** `src/components/AnalistaIaCard.tsx`

Mudanças:
- Ao carregar a análise salva do banco, verificar se `created_at` é de hoje
- Se **não é de hoje** (ou não existe): disparar `fetchAnalise()` automaticamente
- Se **é de hoje**: exibir o conteúdo salvo, sem chamar a IA
- Botão muda de "Gerar Análise" para "Atualizar análise" (sempre visível quando há texto)
- Remover o estado "Nenhuma análise gerada ainda" — o card sempre tentará gerar automaticamente

Fluxo:
```text
Gestor abre Dashboard
  ↓
Busca analise_ia do mês atual no banco
  ↓
created_at é de hoje? → Exibe análise salva
created_at é de outro dia (ou não existe)? → Chama ai-analista automaticamente
  ↓
Botão "Atualizar análise" → Permite regerar a qualquer momento
```

#### 2. Tabela `analise_ia` — sem mudanças

A tabela já tem `created_at` com timestamp. A verificação será feita no frontend comparando a data de `created_at` com a data atual.

#### 3. Edge function `ai-analista` — sem mudanças

Já salva com upsert por `empresa_id + mes_referencia` e atualiza o `created_at` implicitamente (via `gen_random_uuid()` no upsert). **Porém**, o upsert atual não atualiza `created_at` em updates. Será necessário adicionar um trigger `update_updated_at_column` ou alterar a query para incluir `created_at: new Date().toISOString()` explicitamente no upsert.

**Correção na edge function:** Adicionar `created_at` explícito no upsert para que a data seja atualizada a cada nova geração:
```typescript
await supabaseAdmin.from("analise_ia").upsert({
  empresa_id: empresaId,
  mes_referencia: mesAtual,
  conteudo: fullContent,
  upload_id: uploadId,
  created_at: new Date().toISOString(), // forçar data atualizada
}, { onConflict: "empresa_id,mes_referencia" });
```

#### 4. AnalistaIaCard — select ajustado

Buscar `conteudo` e `created_at` para verificar a data:
```typescript
const { data } = await supabase
  .from('analise_ia')
  .select('conteudo, created_at')
  .eq('empresa_id', empresaId)
  .eq('mes_referencia', mesAtual)
  .single();

const today = new Date().toISOString().slice(0, 10);
const isToday = data?.created_at?.slice(0, 10) === today;

if (data?.conteudo && isToday) {
  setText(data.conteudo); // exibe salva
} else {
  fetchAnalise(); // gera automaticamente
}
```

#### 5. Upload — mantém trigger em background

O upload já dispara `ai-analista` em background (linhas 142-157 do Upload.tsx). Isso continuará funcionando — se o gestor fizer upload e depois abrir o Dashboard, a análise já estará salva e será exibida.

#### 6. Email — mesma análise

A análise salva no banco é a mesma que será enviada por email (quando o serviço de email estiver conectado). Nenhuma mudança necessária nesse fluxo.

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/components/AnalistaIaCard.tsx` | Auto-geração diária, verificação de `created_at` |
| `supabase/functions/ai-analista/index.ts` | Incluir `created_at` explícito no upsert |

