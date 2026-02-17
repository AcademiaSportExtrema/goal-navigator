import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Lightbulb, Loader2, Sparkles, TrendingUp, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface AiCoachProps {
  consultoraId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const QUICK_QUESTIONS = [
  { label: 'Como vender mais?', icon: Sparkles, pergunta: 'Me dê dicas práticas e específicas de como vender mais este mês, considerando meus números atuais.' },
  { label: 'Análise meu ritmo', icon: TrendingUp, pergunta: 'Analise meu ritmo de vendas e me diga se estou no caminho certo para atingir a meta. Calcule o que preciso fazer por dia.' },
  { label: 'Dicas de abordagem', icon: MessageCircle, pergunta: 'Me dê dicas de abordagem comercial para fechar mais vendas na academia, considerando os produtos que mais vendo.' },
];

export function AiCoach({ consultoraId, open: controlledOpen, onOpenChange: controlledOnOpenChange }: AiCoachProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  // Reset response when opening with a new consultora
  useEffect(() => {
    if (open) {
      setResponse('');
      setLoading(false);
    }
  }, [open, consultoraId]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [response]);

  const askCoach = async (pergunta?: string) => {
    setLoading(true);
    setResponse('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('Você precisa estar logado para usar o Coach IA');
        setLoading(false);
        return;
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ consultora_id: consultoraId, pergunta }),
        }
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
              setResponse(accumulated);
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
              setResponse(accumulated);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error('AI Coach error:', e);
      toast.error('Erro ao conectar com o Coach IA');
    } finally {
      setLoading(false);
    }
  };

  const sheetContent = (
    <SheetContent className="w-full sm:max-w-lg flex flex-col">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Coach IA
        </SheetTitle>
      </SheetHeader>

      <div className="flex flex-wrap gap-2 mt-4">
        {QUICK_QUESTIONS.map((q) => (
          <Button
            key={q.label}
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => askCoach(q.pergunta)}
            className="gap-1.5"
          >
            <q.icon className="h-3.5 w-3.5" />
            {q.label}
          </Button>
        ))}
      </div>

      <div
        ref={contentRef}
        className="flex-1 mt-4 overflow-y-auto rounded-lg border bg-muted/30 p-4"
      >
        {loading && !response && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analisando seus dados...
          </div>
        )}

        {response ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{response}</ReactMarkdown>
            {loading && <Loader2 className="h-4 w-4 animate-spin inline-block ml-1" />}
          </div>
        ) : !loading ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            Clique em uma das perguntas acima para receber orientações personalizadas do Coach IA baseadas nos seus dados reais de vendas.
          </p>
        ) : null}
      </div>
    </SheetContent>
  );

  // When externally controlled, don't render a trigger button
  if (isControlled) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        {sheetContent}
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2" variant="default">
          <Lightbulb className="h-4 w-4" />
          Pedir dica ao Coach IA
        </Button>
      </SheetTrigger>
      {sheetContent}
    </Sheet>
  );
}
