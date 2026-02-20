import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface CoachDicaDoDiaProps {
  consultoraId: string;
}

const PROMPT_UNIFICADO =
  'Faça uma análise completa: 1) Como posso vender mais este mês com base nos meus números? 2) Analise meu ritmo de vendas e diga se estou no caminho para a meta, calculando o que preciso por dia. 3) Dê dicas de abordagem comercial para fechar mais vendas.';

function getCacheKey(consultoraId: string) {
  const today = new Date().toISOString().slice(0, 10);
  return `coach-dica-${consultoraId}-${today}`;
}

export function CoachDicaDoDia({ consultoraId }: CoachDicaDoDiaProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchDica = useCallback(async () => {
    setLoading(true);
    setText('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('Você precisa estar logado para usar o Coach IA');
        setLoading(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ consultora_id: consultoraId, pergunta: PROMPT_UNIFICADO }),
          signal: controller.signal,
        },
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        toast.error(err.error || 'Erro ao consultar o Coach IA');
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

      // Save to localStorage
      if (accumulated) {
        localStorage.setItem(getCacheKey(consultoraId), accumulated);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      console.error('Coach Dica do Dia error:', e);
      toast.error('Erro ao conectar com o Coach IA');
    } finally {
      setLoading(false);
    }
  }, [consultoraId]);

  // On mount / consultoraId change, check cache or fetch
  useEffect(() => {
    const cached = localStorage.getItem(getCacheKey(consultoraId));
    if (cached) {
      setText(cached);
    } else {
      fetchDica();
    }

    return () => {
      abortRef.current?.abort();
    };
  }, [consultoraId, fetchDica]);

  const handleRefresh = () => {
    localStorage.removeItem(getCacheKey(consultoraId));
    fetchDica();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-primary" />
          Dica do Coach IA
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar análise
        </Button>
      </CardHeader>
      <CardContent>
        {loading && !text ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analisando seus dados...
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ) : text ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{text}</ReactMarkdown>
            {loading && <Loader2 className="h-4 w-4 animate-spin inline-block ml-1" />}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-4">
            Nenhuma dica disponível no momento.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
