

## Problema: emails duplicados por usuário

### Causa raiz

Existem **dois caminhos** que disparam o `send-analise-email`:

1. **Auto-send no backend** (`supabase/functions/ai-analista/index.ts`, linhas 267-288): após salvar a análise, a edge function chama internamente `send-analise-email` com `_internal: true`
2. **Re-trigger no frontend** (`src/components/AnalistaIaCard.tsx`): o `useEffect` (linha 164) verifica se já existe análise do dia. Se o componente remontar (navegação, re-render), o `autoTriggered.current` reseta e `fetchAnalise()` é chamado novamente → gera nova análise → auto-send dispara de novo

O componente usa um `useRef(false)` para evitar chamadas duplicadas, mas refs resetam quando o componente desmonta e remonta (ex: trocar de aba e voltar, re-render do layout).

### Solução

Remover o auto-send de dentro do `ai-analista` e manter apenas o envio manual pelo botão de email no frontend. Isso elimina o disparo automático e dá controle ao gestor.

Adicionalmente, adicionar uma trava de deduplicação no `send-analise-email` para evitar envios repetidos da mesma análise em janela curta (ex: verificar se já enviou email para essa `empresa_id` + `mes_referencia` nos últimos 5 minutos).

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/ai-analista/index.ts` | Remover bloco de auto-send (linhas 267-288) |
| `supabase/functions/send-analise-email/index.ts` | Adicionar dedup: verificar `analise.created_at` e armazenar último envio para evitar duplicatas |

