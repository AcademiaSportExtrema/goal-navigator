import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Target, TrendingUp, DollarSign, Users, Award } from 'lucide-react';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Lancamento, MetaMensal, MetaConsultora, ComissaoNivel, Consultora } from '@/types/database';
import { getNivelNome } from '@/lib/utils';

export default function Metas() {
  const { role } = useAuth();
  const isConsultora = role === 'consultora';
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'));

  // Buscar meta do mês
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

  // Buscar metas por consultora
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

  // Buscar níveis de comissão
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

  // Buscar lançamentos que entram na meta
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

  // Buscar consultoras para mapeamento
  const { data: consultoras } = useQuery({
    queryKey: ['consultoras-mapeamento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consultoras')
        .select('*');
      
      if (error) throw error;
      return data as Consultora[];
    },
  });

  // Calcular dados do dashboard
  const dashboardData = useMemo(() => {
    if (!lancamentos || !metaMensal) return null;

    const totalVendido = lancamentos.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
    const percentualAtingido = (totalVendido / Number(metaMensal.meta_total)) * 100;

    // Determinar nível atual (busca reversa para evitar lacunas entre faixas)
    let nivelAtual = 1;
    let comissaoPercent = 0;
    
    if (niveisComissao && niveisComissao.length > 0) {
      const sorted = [...niveisComissao].sort((a, b) => b.nivel - a.nivel);
      for (const nivel of sorted) {
        if (percentualAtingido >= Number(nivel.de_percent) * 100) {
          nivelAtual = nivel.nivel;
          comissaoPercent = Number(nivel.comissao_percent);
          break;
        }
      }
    }

    // Agrupar por consultora
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

      // Determinar nível da consultora (busca reversa)
      let nivelConsultora = 1;
      let comissaoPercentConsultora = 0;
      if (niveisComissao && niveisComissao.length > 0) {
        const sorted = [...niveisComissao].sort((a, b) => b.nivel - a.nivel);
        for (const nivel of sorted) {
          if (percentual >= Number(nivel.de_percent) * 100) {
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

    // Comissão total = soma das comissões individuais de cada consultora
    const comissaoTotal = consultoraDados.reduce((acc, c) => acc + c.comissao, 0);

    return {
      totalVendido,
      percentualAtingido,
      nivelAtual,
      comissaoTotal,
      consultoras: consultoraDados,
    };
  }, [lancamentos, metaMensal, metasConsultoras, niveisComissao]);

  const showPreviousMonth = new Date().getDate() <= 5;
  const meses = isConsultora
    ? [
        ...(showPreviousMonth ? [{ value: format(subMonths(new Date(), 1), 'yyyy-MM'), label: format(subMonths(new Date(), 1), 'MMMM yyyy', { locale: ptBR }) }] : []),
        { value: format(new Date(), 'yyyy-MM'), label: format(new Date(), 'MMMM yyyy', { locale: ptBR }) },
        { value: format(addMonths(new Date(), 1), 'yyyy-MM'), label: format(addMonths(new Date(), 1), 'MMMM yyyy', { locale: ptBR }) },
      ]
    : Array.from({ length: 12 }, (_, i) => {
        const date = subMonths(addMonths(new Date(), 2), 11 - i);
        return {
          value: format(date, 'yyyy-MM'),
          label: format(date, 'MMMM yyyy', { locale: ptBR }),
        };
      });

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

  return (
    <AppLayout title="Dashboard de Metas">
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

        {!metaMensal ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium text-lg">Meta não configurada</p>
              <p className="text-muted-foreground">
                Configure a meta do mês em{' '}
                <a href="/configuracao-mes" className="text-primary hover:underline">
                  Configuração do Mês
                </a>
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Cards de resumo */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Vendido</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    }).format(dashboardData?.totalVendido || 0)}
                  </div>
                  <Progress 
                    value={Math.min(dashboardData?.percentualAtingido || 0, 100)} 
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">% Atingimento</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${
                    (dashboardData?.percentualAtingido || 0) >= 100 ? 'text-success' :
                    (dashboardData?.percentualAtingido || 0) >= 80 ? 'text-warning' : ''
                  }`}>
                    {(dashboardData?.percentualAtingido || 0).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Meta: {new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    }).format(Number(metaMensal.meta_total))}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Nível Atual</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {getNivelNome(dashboardData?.nivelAtual || 1)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ferro → Diamante
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Comissão Estimada</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">
                    {new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    }).format(dashboardData?.comissaoTotal || 0)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico e Tabela */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Gráfico de barras */}
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
                          formatter={(value: number) => [
                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
                            'Vendido'
                          ]}
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

              {/* Tabela detalhada */}
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
                      {dashboardData?.consultoras.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{c.nome}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {c.meta > 0 ? new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL',
                              notation: 'compact'
                            }).format(c.meta) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL',
                              notation: 'compact'
                            }).format(c.vendido)}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${
                            c.percentual >= 100 ? 'text-success' :
                            c.percentual >= 80 ? 'text-warning' : ''
                          }`}>
                            {c.percentual.toFixed(0)}%
                          </TableCell>
                          <TableCell className={`text-right font-medium ${
                            c.falta === 0 ? 'text-success' : 'text-destructive'
                          }`}>
                            {c.falta === 0 ? 'Atingida ✓' : new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL',
                              notation: 'compact'
                            }).format(c.falta)}
                          </TableCell>
                          <TableCell className="text-right">{c.nivel}</TableCell>
                          <TableCell className="text-right text-success">
                            {new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL',
                              notation: 'compact'
                            }).format(c.comissao)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Lançamentos do mês */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Lançamentos que contam para Meta ({lancamentos?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lancamentos && lancamentos.length > 0 ? (
                  <div className="overflow-x-auto scrollbar-thin max-h-[400px]">
                    <Table className="table-dense">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Consultora</TableHead>
                          <TableHead>Dt. Lanç.</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lancamentos.slice(0, 100).map((l) => (
                          <TableRow key={l.id}>
                            <TableCell>{l.produto || '-'}</TableCell>
                            <TableCell>{l.nome_cliente || '-'}</TableCell>
                            <TableCell>{l.consultora_chave || '-'}</TableCell>
                            <TableCell>
                              {l.data_lancamento ? format(new Date(l.data_lancamento), 'dd/MM/yyyy') : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL' 
                              }).format(Number(l.valor))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhum lançamento encontrado para este mês
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
