import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CobrancaStatusBadge } from '@/components/CobrancaStatusBadge';
import { Target, TrendingUp, DollarSign, Award, Eye, AlertTriangle } from 'lucide-react';
import { CoachDicaDoDia } from '@/components/CoachDicaDoDia';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Lancamento, MetaMensal, ComissaoNivel, MetaConsultora, Consultora } from '@/types/database';
import { PaginationControls } from '@/components/PaginationControls';
import { getNivelNome } from '@/lib/utils';
import { useSalesMetrics } from '@/hooks/useSalesMetrics';
import { useDashboardVisibilidade } from '@/hooks/useDashboardVisibilidade';
import { useMetaSemanal } from '@/hooks/useMetaSemanal';
import { RevenueTrendChart } from '@/components/dashboard/RevenueTrendChart';
import { RevenueByPaymentChart } from '@/components/dashboard/RevenueByPaymentChart';
import { PlanSalesTable } from '@/components/dashboard/PlanSalesTable';
import { CategoryShareChart } from '@/components/dashboard/CategoryShareChart';
import { TicketHistogram } from '@/components/dashboard/TicketHistogram';
import { RitmoSemanalCard } from '@/components/dashboard/RitmoSemanalCard';

const ITEMS_PER_PAGE = 20;

export default function VisaoConsultora() {
  const { empresaId } = useAuth();
  const { isComponenteVisivel } = useDashboardVisibilidade();
  const [selectedConsultoraId, setSelectedConsultoraId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'));

  const mesAnterior = useMemo(() => format(subMonths(startOfMonth(new Date()), 1), 'yyyy-MM'), []);
  const mesAtual = useMemo(() => format(startOfMonth(new Date()), 'yyyy-MM'), []);
  const proximoMes = useMemo(() => format(addMonths(startOfMonth(new Date()), 1), 'yyyy-MM'), []);
  const showPreviousMonth = new Date().getDate() <= 5;

  useEffect(() => { setCurrentPage(1); }, [selectedConsultoraId]);

  // Buscar todas as consultoras da empresa
  const { data: consultoras } = useQuery({
    queryKey: ['consultoras-visao', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consultoras')
        .select('id, nome')
        .eq('empresa_id', empresaId!)
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data as Pick<Consultora, 'id' | 'nome'>[];
    },
  });

  const consultoraSelecionada = consultoras?.find(c => c.id === selectedConsultoraId);

  // Buscar meta do mês
  const { data: metaMensal } = useQuery({
    queryKey: ['meta-mensal-visao', mesSelecionado, empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metas_mensais')
        .select('*')
        .eq('mes_referencia', mesSelecionado)
        .eq('empresa_id', empresaId!)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as MetaMensal | null;
    },
  });

  // Buscar meta individual da consultora
  const { data: metaConsultora } = useQuery({
    queryKey: ['meta-consultora-visao', metaMensal?.id, selectedConsultoraId],
    enabled: !!metaMensal?.id && !!selectedConsultoraId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metas_consultoras')
        .select('*')
        .eq('meta_mensal_id', metaMensal!.id)
        .eq('consultora_id', selectedConsultoraId!)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as MetaConsultora | null;
    },
  });

  // Buscar níveis de comissão
  const { data: niveisComissao } = useQuery({
    queryKey: ['comissao-niveis-visao', metaMensal?.id],
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

  // Buscar lançamentos da consultora selecionada
  const { data: lancamentos } = useQuery({
    queryKey: ['lancamentos-visao', mesSelecionado, consultoraSelecionada?.nome],
    enabled: !!consultoraSelecionada?.nome,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('*')
        .eq('entra_meta', true)
        .eq('mes_competencia', mesSelecionado)
        .ilike('consultora_chave', consultoraSelecionada!.nome);
      if (error) throw error;
      return data as Lancamento[];
    },
  });

  // Calcular métricas
  const metricas = useMemo(() => {
    if (!lancamentos || !metaMensal) return null;

    const totalVendido = lancamentos.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
    const metaIndividual = metaConsultora
      ? Number(metaMensal.meta_total) * Number(metaConsultora.percentual)
      : 0;
    const percentualAtingido = metaIndividual > 0 ? (totalVendido / metaIndividual) * 100 : 0;

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

    const comissaoEstimada = totalVendido * comissaoPercent;

    return { totalVendido, metaIndividual, percentualAtingido, nivelAtual, comissaoEstimada };
  }, [lancamentos, metaMensal, metaConsultora, niveisComissao]);

  const salesMetrics = useSalesMetrics(lancamentos);

  // Ritmo Semanal
  const ritmo = useMetaSemanal(
    metaMensal?.id,
    metricas?.metaIndividual || 0,
    metricas?.totalVendido || 0,
    mesSelecionado,
    lancamentos || undefined,
  );

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <AppLayout title="Visão Consultora">
      <div className="space-y-6">
        {/* Seletor */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <Eye className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 max-w-sm">
                <Select
                  value={selectedConsultoraId || ''}
                  onValueChange={setSelectedConsultoraId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma consultora" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultoras?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                {[...(showPreviousMonth ? [mesAnterior] : []), mesAtual, proximoMes].map((mes) => {
                  const [y, m] = mes.split('-').map(Number);
                  const label = format(new Date(y, m - 1, 1), 'MMM yyyy', { locale: ptBR });
                  const isActive = mesSelecionado === mes;
                  return (
                    <button
                      key={mes}
                      onClick={() => setMesSelecionado(mes)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedConsultoraId ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Eye className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium text-lg">Selecione uma consultora</p>
              <p className="text-muted-foreground">
                Escolha uma consultora no seletor acima para visualizar a performance dela.
              </p>
            </CardContent>
          </Card>
        ) : !metaMensal ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium text-lg">Meta não configurada</p>
              <p className="text-muted-foreground">
                A meta deste mês ainda não foi definida.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Header com nome */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  {consultoraSelecionada?.nome?.charAt(0) || '?'}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{consultoraSelecionada?.nome}</h2>
                  <p className="text-muted-foreground text-sm">Visualização como consultora</p>
                </div>
              </div>
              
            </div>

            {/* Cards de resumo */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Meta</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fmt(metricas?.metaIndividual || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    {metaConsultora ? `${(Number(metaConsultora.percentual) * 100).toFixed(0)}% da meta total` : 'Não definida'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vendido</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fmt(metricas?.totalVendido || 0)}</div>
                  <Progress value={Math.min(metricas?.percentualAtingido || 0, 100)} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">% Atingido</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${
                    (metricas?.percentualAtingido || 0) >= 100 ? 'text-success' :
                    (metricas?.percentualAtingido || 0) >= 80 ? 'text-warning' : ''
                  }`}>
                    {(metricas?.percentualAtingido || 0).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">{getNivelNome(metricas?.nivelAtual || 1)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Comissão Estimada</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{fmt(metricas?.comissaoEstimada || 0)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Ritmo Semanal */}
            {metricas && metricas.metaIndividual > 0 && (
              <RitmoSemanalCard
                semanas={ritmo.semanas}
                status={ritmo.status}
                motivacional
              />
            )}

            {/* Dica do Dia */}
            <CoachDicaDoDia consultoraId={selectedConsultoraId} />

            {/* Níveis de comissão */}
            <Card>
              <CardHeader><CardTitle>Níveis de Comissão</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {niveisComissao?.map((nivel, idx) => {
                    const mi = metricas?.metaIndividual || 0;
                    const deP = Number(nivel.de_percent);
                    const ateP = Number(nivel.ate_percent);
                    const comP = Number(nivel.comissao_percent);
                    const isLast = idx === (niveisComissao.length - 1);
                    const valorMin = mi * deP;
                    const valorMax = mi * ateP;
                    const bonusMin = valorMin * comP;
                    const bonusMax = valorMax * comP;

                    return (
                      <div
                        key={nivel.nivel}
                        className={`flex-1 p-3 rounded-lg text-center border ${
                          metricas?.nivelAtual === nivel.nivel
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="font-bold">{getNivelNome(nivel.nivel)}</div>
                        <div className="text-sm opacity-80">
                          {((deP * 100) % 1 === 0 ? (deP * 100).toFixed(0) : (deP * 100).toFixed(2))}% - {((ateP * 100) % 1 === 0 ? (ateP * 100).toFixed(0) : (ateP * 100).toFixed(2))}%
                        </div>
                        <div className="text-xs opacity-70 mt-0.5">
                          {mi > 0
                            ? isLast
                              ? `${fmt(valorMin)}+`
                              : `${fmt(valorMin)} - ${fmt(valorMax)}`
                            : '-'}
                        </div>
                        <div className="text-lg font-bold mt-1">
                          {(comP * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs opacity-70">
                          {mi > 0
                            ? isLast
                              ? `Bônus: ${fmt(bonusMin)}+`
                              : `Bônus: ${fmt(bonusMin)} - ${fmt(bonusMax)}`
                            : '-'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Gráficos de Performance */}
            {lancamentos && lancamentos.length > 0 && (() => {
              const showTrend = isComponenteVisivel('grafico_tendencia_receita');
              const showPayment = isComponenteVisivel('grafico_forma_pagamento');
              const showPlan = isComponenteVisivel('tabela_vendas_plano');
              const showCategory = isComponenteVisivel('grafico_categoria');
              const showTicket = isComponenteVisivel('histograma_ticket');
              return (
                <>
                  {(showTrend || showPayment) && (
                    <div className="grid gap-4 lg:grid-cols-3">
                      {showTrend && <div className="lg:col-span-2"><RevenueTrendChart data={salesMetrics.revenueByDay} /></div>}
                      {showPayment && <RevenueByPaymentChart data={salesMetrics.revenueByPayment} />}
                    </div>
                  )}
                  {(showPlan || showCategory) && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {showPlan && <PlanSalesTable data={salesMetrics.salesByPlan} />}
                      {showCategory && <CategoryShareChart data={salesMetrics.salesByPlan} />}
                    </div>
                  )}
                  {showTicket && <TicketHistogram data={salesMetrics.ticketDistribution} ticketMedio={salesMetrics.ticketMedioGlobal} />}
                </>
              );
            })()}

            {/* Devedores da consultora */}
            <DevedoresConsultora empresaId={empresaId!} consultoraNome={consultoraSelecionada?.nome || ''} />

            {/* Lançamentos */}
            <Card>
              <CardHeader>
                <CardTitle>Vendas do Mês ({lancamentos?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {lancamentos && lancamentos.length > 0 ? (() => {
                  const totalPages = Math.ceil(lancamentos.length / ITEMS_PER_PAGE);
                  const paginatedLancamentos = lancamentos.slice(
                    (currentPage - 1) * ITEMS_PER_PAGE,
                    currentPage * ITEMS_PER_PAGE
                  );
                  const pagination = totalPages > 1 ? (
                    <PaginationControls
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalCount={lancamentos.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                      onPageChange={setCurrentPage}
                    />
                  ) : null;
                  return (
                    <>
                      {pagination}
                      <div className="overflow-x-auto scrollbar-thin">
                        <Table className="table-dense">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Produto</TableHead>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Plano</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedLancamentos.map((l) => (
                              <TableRow key={l.id}>
                                <TableCell>
                                  {l.data_lancamento ? format(new Date(l.data_lancamento), 'dd/MM') : '-'}
                                </TableCell>
                                <TableCell>{l.produto || '-'}</TableCell>
                                <TableCell>{l.nome_cliente || '-'}</TableCell>
                                <TableCell>{l.plano || '-'}</TableCell>
                                <TableCell className="text-right font-medium">{fmt(Number(l.valor))}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {pagination}
                    </>
                  );
                })() : (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhuma venda encontrada para este mês
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

function DevedoresConsultora({ empresaId, consultoraNome }: { empresaId: string; consultoraNome: string }) {
  const { data: devedores, isLoading } = useQuery({
    queryKey: ['devedores-consultora-visao', empresaId, consultoraNome],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('devedores_parcelas')
        .select('*')
        .eq('empresa_id', empresaId)
        .ilike('consultor', consultoraNome)
        .order('data_vencimento', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaId && !!consultoraNome,
  });

  const pendentes = devedores?.filter(d => d.status_cobranca === 'pendente').length || 0;
  const total = devedores?.length || 0;

  const fmt = (v: number | null) => {
    if (v == null) return '-';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const fmtDate = (d: string | null) => {
    if (!d) return '-';
    try { return format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy'); } catch { return d; }
  };

  const fmtDateTime = (d: string | null) => {
    if (!d) return '-';
    try { return format(new Date(d), 'dd/MM/yyyy HH:mm'); } catch { return d; }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Devedores ({total})
          </CardTitle>
          {pendentes > 0 && (
            <Badge variant="destructive">{pendentes} pendente(s)</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-4 text-center text-muted-foreground">Carregando...</p>
        ) : total > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Data Vencimento</TableHead>
                <TableHead className="text-right">Valor Parcela</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último contato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devedores!.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.nome || '-'}</TableCell>
                  <TableCell>{fmtDate(row.data_vencimento)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(row.valor_parcela)}</TableCell>
                  <TableCell>
                    <CobrancaStatusBadge status={row.status_cobranca} />
                  </TableCell>
                  <TableCell>{fmtDateTime(row.ultimo_contato_em)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-8 text-center text-muted-foreground">
            Nenhum devedor vinculado a esta consultora
          </p>
        )}
      </CardContent>
    </Card>
  );
}
