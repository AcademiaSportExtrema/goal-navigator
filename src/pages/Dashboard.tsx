import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  Target, 
  TrendingUp,
  Calendar,
  Users,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const mesAtual = format(new Date(), 'yyyy-MM');

  const { data: totalLancamentos } = useQuery({
    queryKey: ['dashboard-lancamentos'],
    queryFn: async () => {
      const { count } = await supabase
        .from('lancamentos')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: pendentesRegra } = useQuery({
    queryKey: ['dashboard-pendentes'],
    queryFn: async () => {
      const { count } = await supabase
        .from('lancamentos')
        .select('*', { count: 'exact', head: true })
        .eq('pendente_regra', true);
      return count || 0;
    },
  });

  const { data: metaMensal } = useQuery({
    queryKey: ['dashboard-meta', mesAtual],
    queryFn: async () => {
      const { data } = await supabase
        .from('metas_mensais')
        .select('*')
        .eq('mes_referencia', mesAtual)
        .single();
      return data;
    },
  });

  const { data: totalVendidoMes } = useQuery({
    queryKey: ['dashboard-vendido', mesAtual],
    queryFn: async () => {
      const { data } = await supabase
        .from('lancamentos')
        .select('valor')
        .eq('entra_meta', true)
        .eq('mes_competencia', mesAtual);
      
      return data?.reduce((acc, item) => acc + (Number(item.valor) || 0), 0) || 0;
    },
  });

  const { data: ultimosUploads } = useQuery({
    queryKey: ['dashboard-uploads'],
    queryFn: async () => {
      const { data } = await supabase
        .from('uploads')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const { data: consultoras } = useQuery({
    queryKey: ['dashboard-consultoras'],
    queryFn: async () => {
      const { count } = await supabase
        .from('consultoras')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true);
      return count || 0;
    },
  });

  const percentualAtingido = metaMensal?.meta_total 
    ? ((totalVendidoMes || 0) / Number(metaMensal.meta_total)) * 100 
    : 0;

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* Cards principais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Vendido ({format(new Date(), 'MMM', { locale: ptBR })})
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                }).format(totalVendidoMes || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {metaMensal ? (
                  <span className={percentualAtingido >= 100 ? 'text-success' : 'text-warning'}>
                    {percentualAtingido.toFixed(1)}% da meta
                  </span>
                ) : (
                  'Meta não configurada'
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meta do Mês</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metaMensal ? new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                }).format(Number(metaMensal.meta_total)) : 'R$ 0,00'}
              </div>
              <Link 
                to="/configuracao-mes" 
                className="text-xs text-primary hover:underline"
              >
                Configurar meta →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lançamentos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLancamentos}</div>
              <Link 
                to="/gerencial" 
                className="text-xs text-primary hover:underline"
              >
                Ver todos →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes de Regra</CardTitle>
              <AlertCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendentesRegra}</div>
              {pendentesRegra && pendentesRegra > 0 ? (
                <Link 
                  to="/pendencias" 
                  className="text-xs text-warning hover:underline"
                >
                  Classificar →
                </Link>
              ) : (
                <p className="text-xs text-success">Tudo classificado!</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Segunda linha */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Últimos Uploads
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ultimosUploads && ultimosUploads.length > 0 ? (
                <div className="space-y-3">
                  {ultimosUploads.map((upload) => (
                    <div 
                      key={upload.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{upload.arquivo_nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(upload.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        upload.status === 'concluido' ? 'bg-success/10 text-success' :
                        upload.status === 'erro' ? 'bg-destructive/10 text-destructive' :
                        upload.status === 'importando' ? 'bg-info/10 text-info' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {upload.status === 'concluido' ? 'Concluído' :
                         upload.status === 'erro' ? 'Erro' :
                         upload.status === 'importando' ? 'Importando...' : 'Enviado'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum upload realizado ainda</p>
                  <Link to="/upload" className="text-sm text-primary hover:underline">
                    Fazer primeiro upload →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Equipe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="text-4xl font-bold mb-2">{consultoras}</div>
                <p className="text-sm text-muted-foreground">Consultoras ativas</p>
                <Link 
                  to="/consultoras" 
                  className="inline-block mt-4 text-sm text-primary hover:underline"
                >
                  Gerenciar equipe →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              <Link 
                to="/upload" 
                className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <Upload className="h-5 w-5 text-primary" />
                <span className="font-medium">Upload Diário</span>
              </Link>
              <Link 
                to="/regras" 
                className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <Target className="h-5 w-5 text-primary" />
                <span className="font-medium">Regras da Meta</span>
              </Link>
              <Link 
                to="/metas" 
                className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-medium">Dashboard Metas</span>
              </Link>
              <Link 
                to="/gerencial" 
                className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">Análises</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
