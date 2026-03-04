import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, Mail, Info } from 'lucide-react';

export function AnalistaIaConfigTab() {
  const { empresaId } = useAuth();
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState('');

  const { data: emails, isLoading } = useQuery({
    queryKey: ['analise-email-config', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analise_email_config' as any)
        .select('*')
        .eq('empresa_id', empresaId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const addEmail = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase
        .from('analise_email_config' as any)
        .insert({ empresa_id: empresaId!, email, ativo: true } as any);
      if (error) {
        if (error.code === '23505') throw new Error('Este email já está cadastrado');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analise-email-config'] });
      setNewEmail('');
      toast.success('Email adicionado com sucesso');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao adicionar email'),
  });

  const toggleEmail = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('analise_email_config' as any)
        .update({ ativo } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['analise-email-config'] }),
    onError: () => toast.error('Erro ao atualizar'),
  });

  const deleteEmail = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('analise_email_config' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analise-email-config'] });
      toast.success('Email removido');
    },
    onError: () => toast.error('Erro ao remover email'),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Informe um email válido');
      return;
    }
    addEmail.mutate(trimmed);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Emails para receber a análise
          </CardTitle>
          <CardDescription>
            Configure os emails que receberão automaticamente o relatório do Analista IA após cada upload processado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Sempre que um upload for processado com sucesso, a análise será gerada e enviada automaticamente para os emails ativos cadastrados abaixo. O botão no dashboard continua disponível para reenvio manual.
            </p>
          </div>

          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              type="email"
              placeholder="gestor@empresa.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={addEmail.isPending} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </form>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : emails && emails.length > 0 ? (
            <div className="space-y-2">
              {emails.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={item.ativo}
                      onCheckedChange={(checked) => toggleEmail.mutate({ id: item.id, ativo: checked })}
                    />
                    <span className={`text-sm ${!item.ativo ? 'text-muted-foreground line-through' : ''}`}>
                      {item.email}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteEmail.mutate(item.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum email configurado ainda.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
