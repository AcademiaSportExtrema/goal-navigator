import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  Target, 
  TrendingUp,
  Users,
  Award,
  DollarSign,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Lancamento, MetaMensal, MetaConsultora, ComissaoNivel, Consultora } from '@/types/database';

export default function Dashboard() {
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'));

  // Gerar lista de meses
  const meses = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(addMonths(new Date(), 2), 11 - i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: ptBR }),
    };
  });

  // === Queries existentes do Dashboard ===
  const { data: totalLancamentos } = useQuery({
    queryKey: ['dashboard-lancamentos', mesSelecionado],
    queryFn: async () => {
      const { count } = await supabase
        .from('lancamentos')
        .select('*', { count: 'exact', head: true })
        .eq('mes_competencia', mesSelecionado);
      return count || 0;
    },
  });

  const { data: pendentesRegra } = useQuery({
    queryKey: ['dashboard-pendentes', mesSelecionado],
    queryFn: async () => {
      const { count } = await supabase
        .from('lancamentos')
        .select('*', { count: 'exact', head: true })
        .eq('pendente_regra', true)
        .eq('mes_competencia', mesSelecionado);
      return count || 0;
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

  const { data: consultorasCount } = useQuery({
    queryKey: ['dashboard-consultoras'],
    queryFn: async () => {
      const { count } = await supabase
        .from('consultoras')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true);
      return count || 0;
    },
  });

  // === Queries vindas de Metas ===
  const { data: metaMensal } = useQuery({
    queryKey: ['meta-mensal-dashboard', mesSelecionado],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metas_mensais')
        .select('*')
        .eq('mes_referencia', mesSelecionado)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as MetaMensal | null;
    },
  });

  const { data: metasConsultoras } = useQuery({
    queryKey: ['metas-consultoras-dashboard', metaMensal?.id],
    enabled: !!metaMensal?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metas_consultoras')
        .select('*, consultoras(*)')
        .eq('meta_mensal_id', metaMensal!.id);
      if (error) throw error;
      return data as (MetaConsultora & { consultoras: Consultora })[];
    },
  });

  const { data: niveisComissao } = useQuery({
    queryKey: ['comissao-niveis-dashboard', metaMensal?.id],
    enabled: !!metaMensal?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comissao_niveis')
        .select('*')
        .eq('meta_mensal_id', metaMensal!.id)
        .order('nivel');
      if (error) throw error;
      return data as ComissaoNivel[];
    },
  });

  const { data: lancamentos } = useQuery({
    queryKey: ['lancamentos-meta', mesSelecionado],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('*')
        .eq('entra_meta', true)
        .eq('mes_competencia', mesSelecionado);
      if (error) throw error;
      return data as Lancamento[];
    },
  });

  // === Cálculos de metas ===
  const dashboardData = useMemo(() => {
    if (!lancamentos || !metaMensal) return null;

    const totalVendido = lancamentos.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
    const percentualAtingido = (totalVendido / Number(metaMensal.meta_total)) * 100;

    let nivelAtual = 1;
    let comissaoPercent = 0;
    if (niveisComissao) {
      for (const nivel of niveisComissao) {
        if (percentualAtingido >= Number(nivel.de_percent) * 100 && 
            percentualAtingido <= Number(nivel.ate_percent) * 100) {
          nivelAtual = nivel.nivel;
          comissaoPercent = Number(nivel.comissao_percent);
          break;
        }
      }
    }

    const comissaoTotal = totalVendido * comissaoPercent;

    const porConsultora: Record<string, { nome: string; valor: number }> = {};
    for (const l of lancamentos) {
      const chave = l.consultora_chave || 'Não identificado';
      if (!porConsultora[chave]) {
        porConsultora[chave] = { nome: chave, valor: 0 };
      }
      porConsultora[chave].valor += Number(l.valor) || 0;
    }

    const consultoraDados = Object.values(porConsultora).map(c => {
      const metaConsultora = metasConsultoras?.find(
        mc => mc.consultoras?.nome === c.nome
      );
      const metaIndividual = metaConsultora 
        ? Number(metaMensal.meta_total) * Number(metaConsultora.percentual)
        : 0;
      const percentual = metaIndividual > 0 ? (c.valor / metaIndividual) * 100 : 0;

      let nivelConsultora = 1;
      let comissaoPercentConsultora = 0;
      if (niveisComissao) {
        for (const nivel of niveisComissao) {
          if (percentual >= Number(nivel.de_percent) * 100 && 
              percentual <= Number(nivel.ate_percent) * 100) {
            nivelConsultora = nivel.nivel;
            comissaoPercentConsultora = Number(nivel.comissao_percent);
            break;
          }
        }
      }

      const falta = Math.max(0, metaIndividual - c.valor);
      return {
        nome: c.nome,
        vendido: c.valor,
        meta: metaIndividual,
        percentual,
        nivel: nivelConsultora,
        comissao: c.valor * comissaoPercentConsultora,
        falta,
      };
    }).sort((a, b) => b.vendido - a.vendido);

    return {
      totalVendido,
      percentualAtingido,
      nivelAtual,
      comissaoTotal,
      consultoras: consultoraDados,
    };
  }, [lancamentos, metaMensal, metasConsultoras, niveisComissao]);

  const chartData = dashboardData?.consultoras.slice(0, 10).map(c => ({
    name: c.nome.length > 15 ? c.nome.substring(0, 15) + '...' : c.nome,
    valor: c.vendido,
    percentual: c.percentual,
  })) || [];

  const getBarColor = (percentual: number) => {
    if (percentual >= 100) return 'hsl(var(--success))';
    if (percentual >= 80) return 'hsl(var(--warning))';
    return 'hsl(var(--chart-1))';
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatCurrencyCompact = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(value);

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* Seletor de mês */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            {format(new Date(mesSelecionado + '-01'), 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meses.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cards resumo rápido */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vendido</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(dashboardData?.totalVendido || 0)}
              </div>
              {metaMensal ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    <span className={(dashboardData?.percentualAtingido || 0) >= 100 ? 'text-success' : 'text-warning'}>
                      {(dashboardData?.percentualAtingido || 0).toFixed(1)}% da meta
                    </span>
                  </p>
                  <Progress value={Math.min(dashboardData?.percentualAtingido || 0, 100)} className="mt-2" />
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Meta não configurada</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meta do Mês</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metaMensal ? formatCurrency(Number(metaMensal.meta_total)) : 'R$ 0,00'}
              </div>
              <Link to="/configuracao-mes" className="text-xs text-primary hover:underline">
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
              <Link to="/gerencial" className="text-xs text-primary hover:underline">
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
                <Link to="/pendencias" className="text-xs text-warning hover:underline">
                  Classificar →
                </Link>
              ) : (
                <p className="text-xs text-success">Tudo classificado!</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cards de meta detalhados (nível e comissão) */}
        {metaMensal && dashboardData && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">% Atingimento</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  dashboardData.percentualAtingido >= 100 ? 'text-success' :
                  dashboardData.percentualAtingido >= 80 ? 'text-warning' : ''
                }`}>
                  {dashboardData.percentualAtingido.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Meta: {formatCurrency(Number(metaMensal.meta_total))}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nível Atual</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Nível {dashboardData.nivelAtual}</div>
                <p className="text-xs text-muted-foreground">de 5 níveis</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Comissão Estimada</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(dashboardData.comissaoTotal)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Gráfico + Tabela por consultora */}
        {metaMensal && dashboardData && dashboardData.consultoras.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance por Consultora</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Vendido']}
                      />
                      <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarColor(entry.percentual)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalhamento por Consultora</CardTitle>
              </CardHeader>
              <CardContent>
                <Table className="table-dense">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Consultora</TableHead>
                      <TableHead className="text-right">Meta</TableHead>
                      <TableHead className="text-right">Vendido</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead className="text-right">Falta</TableHead>
                      <TableHead className="text-right">Nível</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.consultoras.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {c.meta > 0 ? formatCurrencyCompact(c.meta) : '-'}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrencyCompact(c.vendido)}</TableCell>
                        <TableCell className={`text-right font-medium ${
                          c.percentual >= 100 ? 'text-success' :
                          c.percentual >= 80 ? 'text-warning' : ''
                        }`}>
                          {c.percentual.toFixed(0)}%
                        </TableCell>
                        <TableCell className={`text-right font-medium ${
                          c.falta === 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {c.falta === 0 ? 'Atingida ✓' : formatCurrencyCompact(c.falta)}
                        </TableCell>
                        <TableCell className="text-right">{c.nivel}</TableCell>
                        <TableCell className="text-right text-success">
                          {formatCurrencyCompact(c.comissao)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Últimos uploads + Equipe */}
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
                <div className="text-4xl font-bold mb-2">{consultorasCount}</div>
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
            <div className="grid gap-3 md:grid-cols-3">
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
                to="/gerencial" 
                className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">Gerencial</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
