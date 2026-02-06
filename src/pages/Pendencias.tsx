import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PendenciaGroup {
  produto: string | null;
  plano: string | null;
  empresa: string | null;
  count: number;
  total_valor: number;
}

export default function Pendencias() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendencias, isLoading } = useQuery({
    queryKey: ['pendencias-classificacao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('produto, plano, empresa, valor')
        .eq('pendente_regra', true);
      
      if (error) throw error;

      // Agrupar por produto/plano/empresa
      const groups = new Map<string, PendenciaGroup>();
      
      for (const item of data || []) {
        const key = `${item.produto || '-'}|${item.plano || '-'}|${item.empresa || '-'}`;
        
        if (groups.has(key)) {
          const group = groups.get(key)!;
          group.count++;
          group.total_valor += Number(item.valor) || 0;
        } else {
          groups.set(key, {
            produto: item.produto,
            plano: item.plano,
            empresa: item.empresa,
            count: 1,
            total_valor: Number(item.valor) || 0,
          });
        }
      }

      return Array.from(groups.values()).sort((a, b) => b.count - a.count);
    },
  });

  const reprocessar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('classificar-meta', {
        body: { reprocessar_todos: true },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pendencias-classificacao'] });
      queryClient.invalidateQueries({ queryKey: ['lancamentos-gerencial'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-pendentes'] });
      toast({ 
        title: 'Reprocessamento concluído!', 
        description: `${data?.processados || 0} lançamentos reclassificados.`
      });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao reprocessar', description: error.message, variant: 'destructive' });
    },
  });

  const totalPendentes = pendencias?.reduce((acc, p) => acc + p.count, 0) || 0;
  const totalValor = pendencias?.reduce((acc, p) => acc + p.total_valor, 0) || 0;

  return (
    <AppLayout title="Pendências de Classificação">
      <div className="space-y-4">
        {/* Resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-warning">{totalPendentes}</p>
                <p className="text-sm text-muted-foreground">Itens pendentes</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-4xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL',
                    notation: 'compact'
                  }).format(totalValor)}
                </p>
                <p className="text-sm text-muted-foreground">Valor total</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-4xl font-bold">{pendencias?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Combinações únicas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  Itens sem Regra
                </CardTitle>
                <CardDescription>
                  Estes itens não correspondem a nenhuma regra configurada. Crie regras para classificá-los.
                </CardDescription>
              </div>

              <Button 
                variant="outline" 
                onClick={() => reprocessar.mutate()}
                disabled={reprocessar.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${reprocessar.isPending ? 'animate-spin' : ''}`} />
                Reprocessar Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : pendencias && pendencias.length > 0 ? (
              <div className="space-y-2">
                {pendencias.map((p, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        {p.produto && (
                          <span className="px-2 py-1 bg-muted rounded text-sm">
                            <span className="text-muted-foreground mr-1">Produto:</span>
                            {p.produto}
                          </span>
                        )}
                        {p.plano && (
                          <span className="px-2 py-1 bg-muted rounded text-sm">
                            <span className="text-muted-foreground mr-1">Plano:</span>
                            {p.plano}
                          </span>
                        )}
                        {p.empresa && (
                          <span className="px-2 py-1 bg-muted rounded text-sm">
                            <span className="text-muted-foreground mr-1">Empresa:</span>
                            {p.empresa}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{p.count} itens</p>
                        <p className="text-sm text-muted-foreground">
                          {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          }).format(p.total_valor)}
                        </p>
                      </div>

                      <Button asChild size="sm">
                        <Link to={`/regras?produto=${p.produto || ''}&plano=${p.plano || ''}`}>
                          <Plus className="h-4 w-4 mr-1" />
                          Criar Regra
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-success/10 mb-4">
                  <AlertCircle className="h-8 w-8 text-success" />
                </div>
                <p className="font-medium text-lg">Tudo classificado!</p>
                <p className="text-muted-foreground">Não há itens pendentes de classificação.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
