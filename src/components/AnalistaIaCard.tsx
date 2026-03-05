import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BrainCircuit, RefreshCw, Loader2, Mail } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { parseRankingTable, RankingCards } from './RankingCards';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function AnalistaIaCard() {
  const { empresaId } = useAuth();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const autoTriggered = useRef(false);
  const mesAtual = format(new Date(), 'yyyy-MM');

  const fetchAnalise = useCallback(async () => {
    setLoading(true);
    setText('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('Você precisa estar logado');
        setLoading(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analista`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ trigger_email: false }),
          signal: controller.signal,
        },
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        toast.error(err.error || 'Erro ao gerar análise');
        setLoading(false);
        return;
      }

      if (!resp.body) throw new Error('No stream body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let accumulated = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              accumulated += content;
              setText(accumulated);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              accumulated += content;
              setText(accumulated);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      console.error('Analista IA error:', e);
      toast.error('Erro ao conectar com o Analista IA');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendEmail = useCallback(async () => {
    setSendingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('Você precisa estar logado');
        return;
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-analise-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        },
      );

      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || 'Erro ao enviar email');
      } else {
        toast.success(data.message || 'Email enviado com sucesso!');
      }
    } catch (e: any) {
      console.error('Send email error:', e);
      toast.error('Erro ao enviar email');
    } finally {
      setSendingEmail(false);
    }
  }, []);

  // Load saved analysis and auto-generate if not from today
  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      const { data } = await supabase
        .from('analise_ia' as any)
        .select('conteudo, created_at')
        .eq('empresa_id', empresaId)
        .eq('mes_referencia', mesAtual)
        .single();

      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const isToday = (data as any)?.created_at?.slice(0, 10) === today;

      if (data && (data as any).conteudo && isToday) {
        setText((data as any).conteudo);
        setInitialLoading(false);
      } else {
        setInitialLoading(false);
        if (!autoTriggered.current) {
          autoTriggered.current = true;
          fetchAnalise();
        }
      }
    })();
  }, [empresaId, mesAtual, fetchAnalise]);

  if (initialLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BrainCircuit className="h-5 w-5 text-primary" />
            Analista IA — Relatório do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-primary bg-primary/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 py-5 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BrainCircuit className="h-5 w-5 text-primary" />
          Analista IA — Relatório do Mês
        </CardTitle>
        {text && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={sendEmail}
              disabled={sendingEmail || loading}
              className="gap-1.5"
            >
              <Mail className={`h-3.5 w-3.5 ${sendingEmail ? 'animate-pulse' : ''}`} />
              {sendingEmail ? 'Enviando...' : 'Reenviar por email'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchAnalise}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar análise
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {loading && !text ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analisando dados da empresa...
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ) : text ? (
          <div className="prose prose-sm dark:prose-invert max-w-none space-y-4 leading-relaxed prose-headings:mt-6 prose-headings:mb-2 prose-p:mb-3 prose-li:my-1 prose-ul:ml-4 prose-ol:ml-4 prose-ul:space-y-1 prose-ol:space-y-1">
            {(() => {
              const parsed = parseRankingTable(text);
              if (parsed) {
                const mdComponents = {
                  table: ({ children }: any) => (
                    <div className="overflow-x-auto my-4">
                      <table className="w-full text-sm border-collapse border border-border rounded-lg">{children}</table>
                    </div>
                  ),
                  thead: ({ children }: any) => <thead className="bg-muted/50">{children}</thead>,
                  th: ({ children }: any) => <th className="border border-border px-3 py-2 text-left font-medium">{children}</th>,
                  td: ({ children }: any) => <td className="border border-border px-3 py-2">{children}</td>,
                  tr: ({ children }: any) => <tr className="even:bg-muted/30">{children}</tr>,
                };
                return (
                  <>
                    <ReactMarkdown components={mdComponents}>{parsed.before}</ReactMarkdown>
                    <RankingCards items={parsed.items} />
                    <ReactMarkdown components={mdComponents}>{parsed.after}</ReactMarkdown>
                  </>
                );
              }
              return (
                <ReactMarkdown
                  components={{
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4">
                        <table className="w-full text-sm border-collapse border border-border rounded-lg">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
                    th: ({ children }) => <th className="border border-border px-3 py-2 text-left font-medium">{children}</th>,
                    td: ({ children }) => <td className="border border-border px-3 py-2">{children}</td>,
                    tr: ({ children }) => <tr className="even:bg-muted/30">{children}</tr>,
                  }}
                >{text}</ReactMarkdown>
              );
            })()}
            {loading && <Loader2 className="h-4 w-4 animate-spin inline-block ml-1" />}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando análise automaticamente...
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
