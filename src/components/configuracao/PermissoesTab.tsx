import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Shield, Lock, Save, LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDashboardVisibilidade, DASHBOARD_COMPONENTES } from '@/hooks/useDashboardVisibilidade';
import type { AppRole } from '@/types/database';

interface PermissaoRow {
  id: string;
  role: string;
  rota: string;
  permitido: boolean;
}

const ADMIN_ROTAS: { rota: string; label: string; locked?: boolean }[] = [
  { rota: '/dashboard', label: 'Dashboard' },
  { rota: '/upload', label: 'Upload Diário' },
  { rota: '/gerencial', label: 'Gerencial' },
  { rota: '/pendencias', label: 'Pendências' },
  { rota: '/ajustes', label: 'Ajustes' },
  { rota: '/regras', label: 'Regras da Meta' },
  { rota: '/configuracao-mes', label: 'Config. do Mês' },
  { rota: '/configuracao', label: 'Configuração', locked: true },
];

const CONSULTORA_ROTAS: { rota: string; label: string; locked?: boolean }[] = [
  { rota: '/minha-performance', label: 'Minha Performance' },
  { rota: '/solicitar-ajuste', label: 'Solicitar Ajuste' },
  { rota: '/dashboard', label: 'Dashboard (visualização)' },
];

interface PermissoesTabProps {
  targetRole: AppRole;
}

export function PermissoesTab({ targetRole }: PermissoesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const rotas = targetRole === 'admin' ? ADMIN_ROTAS : CONSULTORA_ROTAS;

  const { data: permissoes, isLoading } = useQuery({
    queryKey: ['permissoes-admin', targetRole],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissoes_perfil')
        .select('*')
        .eq('role', targetRole);
      if (error) throw error;
      return data as PermissaoRow[];
    },
  });

  const [localState, setLocalState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (permissoes) {
      const state: Record<string, boolean> = {};
      permissoes.forEach(p => { state[p.rota] = p.permitido; });
      setLocalState(state);
    }
  }, [permissoes]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(localState).map(([rota, permitido]) =>
        supabase
          .from('permissoes_perfil')
          .update({ permitido })
          .eq('role', targetRole)
          .eq('rota', rota)
      );
      const results = await Promise.all(updates);
      const error = results.find(r => r.error);
      if (error?.error) throw error.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissoes-admin'] });
      queryClient.invalidateQueries({ queryKey: ['permissoes'] });
      toast({ title: 'Permissões salvas com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  const toggle = (rota: string) => {
    setLocalState(prev => ({ ...prev, [rota]: !prev[rota] }));
  };

  const roleLabel = targetRole === 'admin' ? 'Administrador' : 'Consultora';

  // Dashboard visibility (only for consultora)
  const { isComponenteVisivel, toggleMutation, visibilidadeMap } = useDashboardVisibilidade();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões do perfil {roleLabel}
          </CardTitle>
          <CardDescription>
            Defina quais telas o perfil {roleLabel} pode acessar no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {rotas.map(({ rota, label, locked }) => {
                const checked = localState[rota] ?? true;
                return (
                  <div
                    key={rota}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={checked}
                        disabled={locked}
                        onCheckedChange={() => !locked && toggle(rota)}
                      />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    {locked ? (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Lock className="h-3 w-3" />
                        Sempre ativo
                      </Badge>
                    ) : (
                      <Badge variant={checked ? 'default' : 'secondary'} className="text-xs">
                        {checked ? 'Ativo' : 'Inativo'}
                      </Badge>
                    )}
                  </div>
                );
              })}

              <div className="pt-4">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Permissões
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {targetRole === 'consultora' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              Dashboard — o que a consultora vê
            </CardTitle>
            <CardDescription>
              Escolha quais seções do Dashboard ficam visíveis para as consultoras
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {DASHBOARD_COMPONENTES.map(({ chave, label, padrao }) => {
                const visivel = isComponenteVisivel(chave);
                return (
                  <div
                    key={chave}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{label}</span>
                      {!(chave in visibilidadeMap) && (
                        <Badge variant="outline" className="text-xs">
                          padrão: {padrao ? 'ligado' : 'desligado'}
                        </Badge>
                      )}
                    </div>
                    <Switch
                      checked={visivel}
                      disabled={toggleMutation.isPending}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ componente: chave, visivel: checked })
                      }
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
