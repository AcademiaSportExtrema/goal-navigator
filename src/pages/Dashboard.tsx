import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSalesMetrics } from '@/hooks/useSalesMetrics';
import { useDashboardVisibilidade } from '@/hooks/useDashboardVisibilidade';
import { RevenueTrendChart } from '@/components/dashboard/RevenueTrendChart';
import { RevenueByPaymentChart } from '@/components/dashboard/RevenueByPaymentChart';
import { PlanSalesTable } from '@/components/dashboard/PlanSalesTable';
import { CategoryShareChart } from '@/components/dashboard/CategoryShareChart';
import { ConsultoraShareChart } from '@/components/dashboard/ConsultoraShareChart';
import { ClientesUnicosChart } from '@/components/dashboard/ClientesUnicosChart';
import { RitmoSemanalCard } from '@/components/dashboard/RitmoSemanalCard';
import { TicketHistogram } from '@/components/dashboard/TicketHistogram';
import { useMetaSemanal } from '@/hooks/useMetaSemanal';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AiCoach } from '@/components/AiCoach';
import { AnalistaIaCard } from '@/components/AnalistaIaCard';
import { 
  FileText, 
  AlertCircle, 
  Target, 
  TrendingUp,
  Award,
  DollarSign,
  Lightbulb,
  Calendar,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, subMonths, addMonths } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Lancamento, MetaMensal, MetaConsultora, ComissaoNivel, Consultora } from '@/types/database';
import { getNivelNome } from '@/lib/utils';

// Badge color map for commission levels
const nivelBadgeClass: Record<string, string> = {
  Ferro: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Bronze: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  Prata: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  Ouro: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  Diamante: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-2 mb-1">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
        {children}
      </span>
      <Separator className="flex-1" />
    </div>
  );
}

export default function Dashboard() {
  const { isAdmin, role, consultoraId, empresaId } = useAuth();
  const isConsultora = role === 'consultora';
  const { isComponenteVisivel } = useDashboardVisibilidade();
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedConsultoraId, setSelectedConsultoraId] = useState<string | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);

  const show = (chave: string) => isAdmin || isComponenteVisivel(chave);

  // Gerar lista de meses
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

  // === Queries ===
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

  const { data: metaIndividual } = useQuery({
    queryKey: ['meta-consultora-individual', metaMensal?.id, consultoraId],
    enabled: isConsultora && !!metaMensal?.id && !!consultoraId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metas_consultoras')
        .select('*')
        .eq('meta_mensal_id', metaMensal!.id)
        .eq('consultora_id', consultoraId!)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as MetaConsultora | null;
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

  const { data: totalVendidoInicio } = useQuery({
    queryKey: ['dashboard-vendido-inicio', mesSelecionado],
    queryFn: async () => {
      const [ano, mes] = mesSelecionado.split('-').map(Number);
      const inicioMes = `${mesSelecionado}-01`;
      const fimMes = new Date(ano, mes, 0).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('lancamentos')
        .select('valor')
        .eq('entra_meta', true)
        .gte('data_inicio', inicioMes)
        .lte('data_inicio', fimMes);
      if (error) throw error;
      return (data || []).reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
    },
  });

  const { data: totalFaturado } = useQuery({
    queryKey: ['dashboard-faturado', mesSelecionado],
    queryFn: async () => {
      const [ano, mes] = mesSelecionado.split('-').map(Number);
      const inicioMes = `${mesSelecionado}-01`;
      const fimMes = new Date(ano, mes, 0).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('lancamentos')
        .select('valor')
        .eq('entra_meta', true)
        .gte('data_lancamento', inicioMes)
        .lte('data_lancamento', fimMes);
      if (error) throw error;
      return (data || []).reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
    },
  });

  // === Queries Gerenciais (admin only) ===
  const anoSelecionado = Number(mesSelecionado.split('-')[0]);
  const mesSelecionadoNum = Number(mesSelecionado.split('-')[1]);

  const { data: realizadoGerencial } = useQuery({
    queryKey: ['dashboard-realizado-gerencial', mesSelecionado, empresaId],
    enabled: isAdmin && !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_realizado_por_mes', {
        p_empresa_id: empresaId!,
        p_ano: anoSelecionado,
      });
      if (error) throw error;
      const mesData = (data || []).find((d: any) => d.mes === mesSelecionadoNum);
      return mesData ? Number(mesData.total) : 0;
    },
  });

  const { data: metaAnual } = useQuery({
    queryKey: ['dashboard-meta-anual', anoSelecionado, empresaId],
    enabled: isAdmin && !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_anual')
        .select('*')
        .eq('ano', anoSelecionado)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const { data: metaAnualMeses } = useQuery({
    queryKey: ['dashboard-meta-anual-meses', metaAnual?.id],
    enabled: isAdmin && !!metaAnual?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_anual_meses')
        .select('*')
        .eq('meta_anual_id', metaAnual!.id);
      if (error) throw error;
      return data;
    },
  });

  const metaGerencialMes = useMemo(() => {
    if (!metaAnual) return 0;
    const pesoMes = metaAnualMeses?.find((m: any) => m.mes === mesSelecionadoNum);
    if (pesoMes && Number(pesoMes.peso_percent) > 0) {
      return Number(metaAnual.meta_total) * (Number(pesoMes.peso_percent) / 100);
    }
    return Number(metaAnual.meta_total) / 12;
  }, [metaAnual, metaAnualMeses, mesSelecionadoNum]);

  const atingimentoGerencial = metaGerencialMes > 0 ? ((realizadoGerencial || 0) / metaGerencialMes) * 100 : 0;

  // === Cálculos de metas ===
  const dashboardData = useMemo(() => {
    if (!lancamentos || !metaMensal) return null;

    const totalVendido = lancamentos.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
    const percentualAtingido = (totalVendido / Number(metaMensal.meta_total)) * 100;

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
        consultoraId: metaConsultora?.consultora_id || null,
      };
    }).sort((a, b) => b.vendido - a.vendido);

    const comissaoTotal = consultoraDados.reduce((acc, c) => acc + c.comissao, 0);

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
    vendido: c.vendido,
    falta: c.falta,
    meta: c.meta,
    percentual: c.percentual,
  })) || [];

  const salesMetrics = useSalesMetrics(lancamentos);

  // Clientes únicos por consultora (data_inicio no mês, excluindo loja)
  const { clientesUnicosData, clientesDetalhes } = useMemo(() => {
    if (!lancamentos) return { clientesUnicosData: [], clientesDetalhes: [] };
    const [ano, mes] = mesSelecionado.split('-').map(Number);
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0);

    const porConsultora: Record<string, Map<string, string>> = {};

    for (const l of lancamentos) {
      // Excluir loja: duracao = 0, vazio ou nulo
      const dur = l.duracao;
      if (!dur || dur === '0' || dur.trim() === '') continue;

      // Filtrar por data_inicio no mês
      if (!l.data_inicio) continue;
      const [dAno, dMes, dDia] = l.data_inicio.split('-').map(Number);
      const dataInicio = new Date(dAno, dMes - 1, dDia);
      if (dataInicio < inicioMes || dataInicio > fimMes) continue;

      const chave = l.consultora_chave || 'Não identificado';
      const cliente = l.nome_cliente || 'Não informado';
      if (!porConsultora[chave]) porConsultora[chave] = new Map();
      if (!porConsultora[chave].has(cliente)) {
        porConsultora[chave].set(cliente, l.data_inicio);
      }
    }

    const chartData = Object.entries(porConsultora)
      .map(([nome, clientes]) => ({ nome, clientes: clientes.size }))
      .sort((a, b) => b.clientes - a.clientes);

    const detalhes: { consultora: string; cliente: string; data_inicio: string }[] = [];
    for (const [consultora, clientes] of Object.entries(porConsultora)) {
      for (const [cliente, dataInicio] of clientes.entries()) {
        detalhes.push({ consultora, cliente, data_inicio: dataInicio });
      }
    }
    detalhes.sort((a, b) => a.consultora.localeCompare(b.consultora) || a.cliente.localeCompare(b.cliente));

    return { clientesUnicosData: chartData, clientesDetalhes: detalhes };
  }, [lancamentos, mesSelecionado]);

  // Ritmo Semanal — meta geral
  const ritmoGeral = useMetaSemanal(
    metaMensal?.id,
    metaMensal ? Number(metaMensal.meta_total) : 0,
    totalVendidoInicio || 0,
    mesSelecionado,
    lancamentos || undefined,
  );

  // Ritmo Semanal — consultora individual
  const minhaMetaValorRitmo = useMemo(() => {
    if (!metaMensal || !metaIndividual) return 0;
    return Number(metaMensal.meta_total) * Number(metaIndividual.percentual);
  }, [metaMensal, metaIndividual]);

  const meuVendidoRitmo = useMemo(() => {
    if (!dashboardData || !consultoraId) return 0;
    return dashboardData.consultoras.find(c => c.consultoraId === consultoraId)?.vendido || 0;
  }, [dashboardData, consultoraId]);

  // Filter lancamentos for this consultora
  const meusLancamentosConsultora = useMemo(() => {
    if (!lancamentos || !consultoraId || !dashboardData) return undefined;
    const meuNome = dashboardData.consultoras.find(c => c.consultoraId === consultoraId)?.nome;
    if (!meuNome) return undefined;
    return lancamentos.filter(l => l.consultora_chave === meuNome);
  }, [lancamentos, consultoraId, dashboardData]);

  const ritmoConsultora = useMetaSemanal(
    metaMensal?.id,
    minhaMetaValorRitmo,
    meuVendidoRitmo,
    mesSelecionado,
    meusLancamentosConsultora,
  );

  const getVendidoColor = (percentual: number) => {
    if (percentual >= 100) return 'hsl(var(--success))';
    return 'hsl(var(--chart-1))';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md text-sm space-y-1">
        <p className="font-semibold">{label}</p>
        <p>Vendido: {formatCurrency(data.vendido)}</p>
        {data.meta > 0 && <p className="text-destructive">Falta: {formatCurrency(data.falta)}</p>}
        {data.meta > 0 && <p className="text-muted-foreground">Meta: {formatCurrency(data.meta)} ({data.percentual.toFixed(1)}%)</p>}
      </div>
    );
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatCurrencyCompact = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(value);

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-8">
        {/* Header do mês — redesenhado */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold capitalize">
              {format(new Date(Number(mesSelecionado.split('-')[0]), Number(mesSelecionado.split('-')[1]) - 1, 1), 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <p className="text-sm text-muted-foreground">Resumo de performance e vendas</p>
          </div>
          <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
            <SelectTrigger className="w-52">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meses.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Consultora view — sem tabs */}
        {isConsultora && (
          <>
            {/* Cards resumo rápido */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {show('card_total_vendido') && (
              <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Vendido</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(totalVendidoInicio || 0)}
                  </div>
                  {metaMensal ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        <span className={(() => {
                          const pct = metaMensal ? ((totalVendidoInicio || 0) / Number(metaMensal.meta_total)) * 100 : 0;
                          return pct >= 100 ? 'text-success' : 'text-warning';
                        })()}>
                          {(metaMensal ? ((totalVendidoInicio || 0) / Number(metaMensal.meta_total)) * 100 : 0).toFixed(1)}% da meta
                        </span>
                      </p>
                      <Progress value={Math.min(metaMensal ? ((totalVendidoInicio || 0) / Number(metaMensal.meta_total)) * 100 : 0, 100)} className="mt-2" />
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Vendas com início no mês</p>
                  )}
                </CardContent>
              </Card>
              )}

            </div>

            {/* Ritmo Semanal — Consultora */}
            {show('card_ritmo_semanal') && metaMensal && metaIndividual && minhaMetaValorRitmo > 0 && (
              <RitmoSemanalCard
                semanas={ritmoConsultora.semanas}
                status={ritmoConsultora.status}
                motivacional
              />
            )}

            {/* Cards de meta individual para consultora */}
            {metaMensal && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-all">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Minha Meta</CardTitle>
                    <Target className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metaIndividual
                        ? formatCurrency(Number(metaMensal.meta_total) * Number(metaIndividual.percentual))
                        : 'Não definida'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {metaIndividual
                        ? `${(Number(metaIndividual.percentual) * 100).toFixed(0)}% da meta total`
                        : 'Fale com o administrador'}
                    </p>
                  </CardContent>
                </Card>

                {metaIndividual && dashboardData && (() => {
                  const minhaMetaValor = Number(metaMensal.meta_total) * Number(metaIndividual.percentual);
                  const meusDados = dashboardData.consultoras.find(c => c.consultoraId === consultoraId);
                  const meuVendido = meusDados?.vendido || 0;
                  const meuPercentual = minhaMetaValor > 0 ? (meuVendido / minhaMetaValor) * 100 : 0;
                  
                  let meuNivel = 1;
                  if (niveisComissao && niveisComissao.length > 0) {
                    const sorted = [...niveisComissao].sort((a, b) => b.nivel - a.nivel);
                    for (const nivel of sorted) {
                      if (meuPercentual >= Number(nivel.de_percent) * 100) {
                        meuNivel = nivel.nivel;
                        break;
                      }
                    }
                  }

                  return (
                    <>
                      <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Meu Atingimento</CardTitle>
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                          <div className={`text-2xl font-bold ${
                            meuPercentual >= 100 ? 'text-success' :
                            meuPercentual >= 80 ? 'text-warning' : ''
                          }`}>
                            {meuPercentual.toFixed(1)}%
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(meuVendido)} vendido
                          </p>
                          <Progress value={Math.min(meuPercentual, 100)} className="mt-2" />
                        </CardContent>
                      </Card>

                      <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Meu Nível</CardTitle>
                          <Award className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{getNivelNome(meuNivel)}</div>
                          <p className="text-xs text-muted-foreground">Ferro → Diamante</p>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}

                {/* Níveis de Comissão */}
                {niveisComissao && niveisComissao.length > 0 && (
                  <Card className="md:col-span-2 lg:col-span-3">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Níveis de Comissão</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {niveisComissao.map(n => {
                          const minhaMetaValor = metaIndividual ? Number(metaMensal.meta_total) * Number(metaIndividual.percentual) : 0;
                          return (
                            <div key={n.id} className="rounded-lg border p-3 text-center space-y-1">
                              <p className="text-xs font-semibold">{getNivelNome(n.nivel)}</p>
                              <p className="text-xs text-muted-foreground">
                                {(Number(n.de_percent) * 100).toFixed(0)}% – {(Number(n.ate_percent) * 100).toFixed(0)}%
                              </p>
                              <p className="text-sm font-bold text-primary">
                                {(Number(n.comissao_percent) * 100).toFixed(1)}%
                              </p>
                              {minhaMetaValor > 0 && (
                                <p className="text-[10px] text-muted-foreground">
                                  {formatCurrencyCompact(minhaMetaValor * Number(n.de_percent))} – {formatCurrencyCompact(minhaMetaValor * Number(n.ate_percent))}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}

        {/* Admin view — com tabs */}
        {isAdmin && (
          <Tabs defaultValue="consultoras" className="space-y-6">
            <TabsList>
              <TabsTrigger value="consultoras">Vendas Consultoras</TabsTrigger>
              <TabsTrigger value="gerencial">Meta Gerencial</TabsTrigger>
            </TabsList>

            {/* Aba Vendas Consultoras */}
            <TabsContent value="consultoras" className="space-y-8">
              {/* Cards resumo rápido */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {show('card_total_vendido') && (
                <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-all">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Vendido</CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(totalVendidoInicio || 0)}
                    </div>
                    {metaMensal ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          <span className={(() => {
                            const pct = metaMensal ? ((totalVendidoInicio || 0) / Number(metaMensal.meta_total)) * 100 : 0;
                            return pct >= 100 ? 'text-success' : 'text-warning';
                          })()}>
                            {(metaMensal ? ((totalVendidoInicio || 0) / Number(metaMensal.meta_total)) * 100 : 0).toFixed(1)}% da meta
                          </span>
                        </p>
                        <Progress value={Math.min(metaMensal ? ((totalVendidoInicio || 0) / Number(metaMensal.meta_total)) * 100 : 0, 100)} className="mt-2" />
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">Vendas com início no mês</p>
                    )}
                  </CardContent>
                </Card>
                )}

                <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-all">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Meta do Mês</CardTitle>
                    <Target className="h-4 w-4 text-purple-500" />
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

                <Card className="border-l-4 border-l-slate-400 hover:shadow-md transition-all">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Lançamentos</CardTitle>
                    <FileText className="h-4 w-4 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalLancamentos}</div>
                    <Link to="/gerencial" className="text-xs text-primary hover:underline">
                      Ver todos →
                    </Link>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-all">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pendentes de Regra</CardTitle>
                    <AlertCircle className="h-4 w-4 text-amber-500" />
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

              {/* Atingimento da Meta */}
              {metaMensal && dashboardData && (
                <>
                  <SectionTitle>Atingimento da Meta</SectionTitle>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-all">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">% Atingimento</CardTitle>
                        <Target className="h-4 w-4 text-blue-500" />
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

                    <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-all">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nível Atual</CardTitle>
                        <Award className="h-4 w-4 text-amber-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{getNivelNome(dashboardData.nivelAtual)}</div>
                        <p className="text-xs text-muted-foreground">Ferro → Diamante</p>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-all">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comissão Estimada</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-success">
                          {formatCurrency(dashboardData.comissaoTotal)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {/* Ritmo Semanal — Admin */}
              {metaMensal && (
                <RitmoSemanalCard
                  semanas={ritmoGeral.semanas}
                  status={ritmoGeral.status}
                />
              )}

              {/* Performance por Consultora */}
              {metaMensal && dashboardData && dashboardData.consultoras.length > 0 && (
                <>
                <SectionTitle>Performance por Consultora</SectionTitle>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="hover:shadow-md transition-all">
                    <CardHeader>
                      <CardTitle className="text-base">Progresso da Meta por Consultora</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 45)}>
                          <BarChart data={chartData} layout="vertical" stackOffset="none">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="vendido" stackId="a" name="Vendido" radius={[0, 0, 0, 0]}>
                              {chartData.map((entry, index) => (
                                <Cell key={`vendido-${index}`} fill={getVendidoColor(entry.percentual)} />
                              ))}
                            </Bar>
                            <Bar dataKey="falta" stackId="a" name="Falta" fill="hsl(var(--destructive) / 0.3)" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          Nenhum dado disponível
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-all">
                    <CardHeader>
                      <CardTitle className="text-base">Detalhamento por Consultora</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-hidden rounded-lg border">
                        <Table className="table-dense">
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="text-xs uppercase tracking-wide">Consultora</TableHead>
                              <TableHead className="text-right text-xs uppercase tracking-wide">Meta</TableHead>
                              <TableHead className="text-right text-xs uppercase tracking-wide">Vendido</TableHead>
                              <TableHead className="text-right text-xs uppercase tracking-wide">%</TableHead>
                              <TableHead className="text-right text-xs uppercase tracking-wide">Falta</TableHead>
                              <TableHead className="text-right text-xs uppercase tracking-wide">Nível</TableHead>
                              <TableHead className="text-right text-xs uppercase tracking-wide">Comissão</TableHead>
                              <TableHead className="text-center w-12 text-xs uppercase tracking-wide">Coach</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dashboardData.consultoras.map((c, i) => {
                              const nivelNome = getNivelNome(c.nivel);
                              const badgeClass = nivelBadgeClass[nivelNome] || '';
                              return (
                                <TableRow key={i} className="even:bg-muted/30">
                                  <TableCell className="font-medium">{c.nome}</TableCell>
                                  <TableCell className="text-right text-muted-foreground">
                    {c.meta > 0 ? formatCurrency(c.meta) : '-'}
                                  </TableCell>
                                  <TableCell className="text-right">{formatCurrency(c.vendido)}</TableCell>
                                  <TableCell className={`text-right font-medium ${
                                    c.percentual >= 100 ? 'text-success' :
                                    c.percentual >= 80 ? 'text-warning' : ''
                                  }`}>
                                    {c.percentual.toFixed(0)}%
                                  </TableCell>
                                  <TableCell className={`text-right font-medium ${
                                    c.falta === 0 ? 'text-success' : 'text-destructive'
                                  }`}>
                                    {c.falta === 0 ? 'Atingida ✓' : formatCurrency(c.falta)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
                                      {nivelNome}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right text-success">
                                    {formatCurrency(c.comissao)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {c.consultoraId && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        title="Coach IA"
                                        onClick={() => {
                                          setSelectedConsultoraId(c.consultoraId!);
                                          setCoachOpen(true);
                                        }}
                                      >
                                        <Lightbulb className="h-4 w-4 text-primary" />
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            {/* Linha de totais */}
                            {(() => {
                              const totalMeta = dashboardData.consultoras.reduce((s, c) => s + c.meta, 0);
                              const totalVendido = dashboardData.consultoras.reduce((s, c) => s + c.vendido, 0);
                              const totalComissao = dashboardData.consultoras.reduce((s, c) => s + c.comissao, 0);
                              const percGeral = totalMeta > 0 ? (totalVendido / totalMeta) * 100 : 0;
                              return (
                                <TableRow className="border-t-2 font-semibold bg-muted/50">
                                  <TableCell>Total</TableCell>
                                  <TableCell className="text-right">{formatCurrency(totalMeta)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(totalVendido)}</TableCell>
                                  <TableCell className="text-right">{percGeral.toFixed(0)}%</TableCell>
                                  <TableCell className="text-right">-</TableCell>
                                  <TableCell className="text-right">-</TableCell>
                                  <TableCell className="text-right text-success">{formatCurrency(totalComissao)}</TableCell>
                                  <TableCell className="text-center">-</TableCell>
                                </TableRow>
                              );
                            })()}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {(show('grafico_share_consultora') || clientesUnicosData.length > 0) && (
                <div className="grid gap-4 md:grid-cols-2">
                  {show('grafico_share_consultora') && (() => {
                    const totalVendidoConsultoras = dashboardData.consultoras.reduce((acc, c) => acc + c.vendido, 0);
                    const shareData = dashboardData.consultoras.map(c => ({
                      nome: c.nome,
                      vendido: c.vendido,
                      percentual: totalVendidoConsultoras > 0 ? (c.vendido / totalVendidoConsultoras) * 100 : 0,
                    }));
                    return <ConsultoraShareChart data={shareData} />;
                  })()}
                  <ClientesUnicosChart
                    data={clientesUnicosData}
                    detalhes={clientesDetalhes}
                    mesSelecionado={mesSelecionado}
                  />
                </div>
                )}
                </>
              )}

              {/* Análise de Vendas */}
              {lancamentos && lancamentos.length > 0 && (
                <>
                  <SectionTitle>Análise de Vendas</SectionTitle>
                  {(show('grafico_tendencia_receita') || show('grafico_forma_pagamento')) && (
                  <div className="grid gap-4 lg:grid-cols-3">
                    {show('grafico_tendencia_receita') && (
                    <div className="lg:col-span-2">
                      <RevenueTrendChart data={salesMetrics.revenueByDay} />
                    </div>
                    )}
                    {show('grafico_forma_pagamento') && (
                    <RevenueByPaymentChart data={salesMetrics.revenueByPayment} />
                    )}
                  </div>
                  )}

                  {(show('tabela_vendas_plano') || show('grafico_categoria')) && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {show('tabela_vendas_plano') && <PlanSalesTable data={salesMetrics.salesByPlan} />}
                    {show('grafico_categoria') && <CategoryShareChart data={salesMetrics.salesByPlan} />}
                  </div>
                  )}

                  {show('histograma_ticket') && (
                  <TicketHistogram
                    data={salesMetrics.ticketDistribution}
                    ticketMedio={salesMetrics.ticketMedioGlobal}
                  />
                  )}
                </>
              )}

              {/* Analista IA — no final da aba Vendas Consultoras */}
              <SectionTitle>Inteligência Artificial</SectionTitle>
              <AnalistaIaCard />
            </TabsContent>

            {/* Aba Meta Gerencial */}
            <TabsContent value="gerencial" className="space-y-8">
              {metaAnual ? (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border-l-4 border-l-indigo-500 hover:shadow-md transition-all">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Gerencial</CardTitle>
                        <DollarSign className="h-4 w-4 text-indigo-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatCurrency(realizadoGerencial || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Inclui agregadores e Entuspass</p>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-indigo-400 hover:shadow-md transition-all">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Meta Gerencial</CardTitle>
                        <Target className="h-4 w-4 text-indigo-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatCurrency(metaGerencialMes)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Meta anual: {formatCurrency(Number(metaAnual.meta_total))}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-indigo-600 hover:shadow-md transition-all">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">% Atingimento Gerencial</CardTitle>
                        <TrendingUp className="h-4 w-4 text-indigo-600" />
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${
                          atingimentoGerencial >= 100 ? 'text-success' :
                          atingimentoGerencial >= 80 ? 'text-warning' : ''
                        }`}>
                          {atingimentoGerencial.toFixed(1)}%
                        </div>
                        <Progress value={Math.min(atingimentoGerencial, 100)} className="mt-2" />
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <p>Nenhuma meta anual configurada para {anoSelecionado}.</p>
                    <Link to="/relatorios" className="text-sm text-primary hover:underline mt-2 inline-block">
                      Configurar Meta Anual →
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

      </div>
      {selectedConsultoraId && (
        <AiCoach
          consultoraId={selectedConsultoraId}
          open={coachOpen}
          onOpenChange={setCoachOpen}
        />
      )}
    </AppLayout>
  );
}
