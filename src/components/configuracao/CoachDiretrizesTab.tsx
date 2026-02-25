import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, CheckCircle2, Ban, Sparkles } from 'lucide-react';

type DiretrizTipo = 'permitido' | 'proibido';

interface Diretriz {
  id: string;
  empresa_id: string;
  tipo: DiretrizTipo;
  texto: string;
  ativo: boolean;
  created_at: string;
}

const SUGESTOES_PERMITIDO = [
  'Oferecer aula experimental grátis',
  'Sugerir upgrade de plano',
  'Mencionar desconto para pagamento anual',
  'Oferecer desconto para indicação de amigos',
  'Sugerir plano família',
  'Mencionar benefícios de fidelidade',
];

const SUGESTOES_PROIBIDO = [
  'Não oferecer desconto acima de 10%',
  'Não sugerir parcelamento acima de 12x',
  'Não mencionar planos descontinuados',
  'Não prometer brindes ou cortesias',
  'Não oferecer congelamento de plano',
  'Não sugerir valores diferentes da tabela',
];

function DiretrizSection({
  tipo,
  diretrizes,
  sugestoes,
  onAdd,
  onToggle,
  onDelete,
  isLoading,
}: {
  tipo: DiretrizTipo;
  diretrizes: Diretriz[];
  sugestoes: string[];
  onAdd: (texto: string) => void;
  onToggle: (id: string, ativo: boolean) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}) {
  const [novoTexto, setNovoTexto] = useState('');
  const isPermitido = tipo === 'permitido';
  const textosCadastrados = diretrizes.map((d) => d.texto.toLowerCase());
  const sugestoesDisponiveis = sugestoes.filter(
    (s) => !textosCadastrados.includes(s.toLowerCase())
  );

  const handleAdd = () => {
    if (!novoTexto.trim()) return;
    onAdd(novoTexto.trim());
    setNovoTexto('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {isPermitido ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Ban className="h-5 w-5 text-destructive" />
          )}
          {isPermitido ? 'O que PODE sugerir' : 'O que NÃO PODE sugerir'}
        </CardTitle>
        <CardDescription>
          {isPermitido
            ? 'Estratégias e ofertas que o Coach IA pode recomendar'
            : 'Restrições que o Coach IA deve respeitar'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={isPermitido ? 'Ex: Oferecer aula experimental' : 'Ex: Não dar desconto acima de 10%'}
            value={novoTexto}
            onChange={(e) => setNovoTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd} size="sm" disabled={!novoTexto.trim() || isLoading}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {sugestoesDisponiveis.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Sugestões rápidas:</p>
            <div className="flex flex-wrap gap-1.5">
              {sugestoesDisponiveis.map((s) => (
                <Badge
                  key={s}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent transition-colors text-xs"
                  onClick={() => onAdd(s)}
                >
                  + {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {diretrizes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma diretriz cadastrada
            </p>
          )}
          {diretrizes.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 p-2 rounded-md border bg-card"
            >
              <Switch
                checked={d.ativo}
                onCheckedChange={(checked) => onToggle(d.id, checked)}
              />
              <span className={`flex-1 text-sm ${!d.ativo ? 'text-muted-foreground line-through' : ''}`}>
                {d.texto}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(d.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function CoachDiretrizesTab() {
  const { empresaId } = useAuth();
  const queryClient = useQueryClient();

  const { data: diretrizes = [], isLoading } = useQuery({
    queryKey: ['coach-diretrizes', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from('coach_diretrizes')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Diretriz[];
    },
    enabled: !!empresaId,
  });

  const addMutation = useMutation({
    mutationFn: async ({ tipo, texto }: { tipo: DiretrizTipo; texto: string }) => {
      const { error } = await supabase.from('coach_diretrizes').insert({
        empresa_id: empresaId!,
        tipo,
        texto,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-diretrizes'] });
      toast.success('Diretriz adicionada');
    },
    onError: () => toast.error('Erro ao adicionar diretriz'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('coach_diretrizes')
        .update({ ativo })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coach-diretrizes'] }),
    onError: () => toast.error('Erro ao atualizar diretriz'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coach_diretrizes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-diretrizes'] });
      toast.success('Diretriz removida');
    },
    onError: () => toast.error('Erro ao remover diretriz'),
  });

  const permitidas = diretrizes.filter((d) => d.tipo === 'permitido');
  const proibidas = diretrizes.filter((d) => d.tipo === 'proibido');
  const isMutating = addMutation.isPending || toggleMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold">Política Comercial do Coach IA</h3>
          <p className="text-sm text-muted-foreground">
            Defina o que o Coach IA pode e não pode sugerir como estratégia comercial para as consultoras.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DiretrizSection
          tipo="permitido"
          diretrizes={permitidas}
          sugestoes={SUGESTOES_PERMITIDO}
          onAdd={(texto) => addMutation.mutate({ tipo: 'permitido', texto })}
          onToggle={(id, ativo) => toggleMutation.mutate({ id, ativo })}
          onDelete={(id) => deleteMutation.mutate(id)}
          isLoading={isMutating}
        />
        <DiretrizSection
          tipo="proibido"
          diretrizes={proibidas}
          sugestoes={SUGESTOES_PROIBIDO}
          onAdd={(texto) => addMutation.mutate({ tipo: 'proibido', texto })}
          onToggle={(id, ativo) => toggleMutation.mutate({ id, ativo })}
          onDelete={(id) => deleteMutation.mutate(id)}
          isLoading={isMutating}
        />
      </div>
    </div>
  );
}
