import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Target, TrendingUp, DollarSign, Award, Calendar } from 'lucide-react';
import { CoachDicaDoDia } from '@/components/CoachDicaDoDia';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Lancamento, MetaMensal, ComissaoNivel, MetaConsultora, Consultora } from '@/types/database';
import { getNivelNome } from '@/lib/utils';

export default function MinhaPerformance() {
  const { consultoraId } = useAuth();
  const mesAtual = format(new Date(), 'yyyy-MM');

  // Buscar dados da consultora
  const { data: consultora } = useQuery({
    queryKey: ['minha-consultora', consultoraId],
    enabled: !!consultoraId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consultoras')
        .select('*')
        .eq('id', consultoraId)
        .single();
      
      if (error) throw error;
      return data as Consultora;
    },
  });

  // Buscar meta do mês
  const { data: metaMensal } = useQuery({
    queryKey: ['meta-mensal-consultora', mesAtual],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metas_mensais')
        .select('*')
        .eq('mes_referencia', mesAtual)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as MetaMensal | null;
    },
  });

  // Buscar minha meta
  const { data: minhaMeta } = useQuery({
    queryKey: ['minha-meta', metaMensal?.id, consultoraId],
    enabled: !!metaMensal?.id && !!consultoraId,
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

  // Buscar níveis de comissão
  const { data: niveisComissao } = useQuery({
    queryKey: ['comissao-niveis-consultora', metaMensal?.id],
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

  // Buscar meus lançamentos
  const { data: meusLancamentos } = useQuery({
    queryKey: ['meus-lancamentos', mesAtual, consultora?.nome],
    enabled: !!consultora?.nome,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('*')
        .eq('entra_meta', true)
        .eq('mes_competencia', mesAtual)
        .eq('consultora_chave', consultora!.nome);
      
      if (error) throw error;
      return data as Lancamento[];
    },
  });

  // Calcular métricas
  const metricas = useMemo(() => {
    if (!meusLancamentos || !metaMensal) return null;

    const totalVendido = meusLancamentos.reduce((acc, l) => acc + (Number(l.valor) || 0), 0);
    const metaIndividual = minhaMeta 
      ? Number(metaMensal.meta_total) * Number(minhaMeta.percentual) 
      : 0;
    const percentualAtingido = metaIndividual > 0 ? (totalVendido / metaIndividual) * 100 : 0;

    // Determinar nível
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

    const comissaoEstimada = totalVendido * comissaoPercent;

    return {
      totalVendido,
      metaIndividual,
      percentualAtingido,
      nivelAtual,
      comissaoEstimada,
    };
  }, [meusLancamentos, metaMensal, minhaMeta, niveisComissao]);

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <AppLayout title="Minha Performance">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
              {consultora?.nome?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{consultora?.nome || 'Carregando...'}</h2>
              <p className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
              </p>
            </div>
          </div>
          
        </div>

        {!metaMensal ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium text-lg">Meta não configurada</p>
              <p className="text-muted-foreground">
                A meta deste mês ainda não foi definida pelo administrador.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Cards de resumo */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Minha Meta</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    }).format(metricas?.metaIndividual || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {minhaMeta ? `${(Number(minhaMeta.percentual) * 100).toFixed(0)}% da meta total` : 'Não definida'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vendido</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    }).format(metricas?.totalVendido || 0)}
                  </div>
                  <Progress 
                    value={Math.min(metricas?.percentualAtingido || 0, 100)} 
                    className="mt-2"
                  />
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
                  <p className="text-xs text-muted-foreground">
                    {getNivelNome(metricas?.nivelAtual || 1)}
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
                    }).format(metricas?.comissaoEstimada || 0)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dica do Dia */}
            {consultoraId && <CoachDicaDoDia consultoraId={consultoraId} />}

            {/* Níveis de comissão */}
            <Card>
              <CardHeader>
                <CardTitle>Níveis de Comissão</CardTitle>
              </CardHeader>
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
                          {(deP * 100).toFixed(0)}% - {(ateP * 100).toFixed(0)}%
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

            {/* Meus lançamentos */}
            <Card>
              <CardHeader>
                <CardTitle>Minhas Vendas do Mês ({meusLancamentos?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {meusLancamentos && meusLancamentos.length > 0 ? (
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
                        {meusLancamentos.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell>
                              {l.data_lancamento ? format(new Date(l.data_lancamento), 'dd/MM') : '-'}
                            </TableCell>
                            <TableCell>{l.produto || '-'}</TableCell>
                            <TableCell>{l.nome_cliente || '-'}</TableCell>
                            <TableCell>{l.plano || '-'}</TableCell>
                            <TableCell className="text-right font-medium">
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
