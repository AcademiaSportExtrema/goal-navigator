import { useState, useMemo } from 'react';
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
import { Target, TrendingUp, DollarSign, Award, Calendar, Eye } from 'lucide-react';
import { AiCoach } from '@/components/AiCoach';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Lancamento, MetaMensal, ComissaoNivel, MetaConsultora, Consultora } from '@/types/database';

export default function VisaoConsultora() {
  const { empresaId } = useAuth();
  const [selectedConsultoraId, setSelectedConsultoraId] = useState<string | null>(null);
  const mesAtual = format(new Date(), 'yyyy-MM');

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
    queryKey: ['meta-mensal-visao', mesAtual, empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metas_mensais')
        .select('*')
        .eq('mes_referencia', mesAtual)
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
    queryKey: ['lancamentos-visao', mesAtual, consultoraSelecionada?.nome],
    enabled: !!consultoraSelecionada?.nome,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('*')
        .eq('entra_meta', true)
        .eq('mes_competencia', mesAtual)
        .eq('consultora_chave', consultoraSelecionada!.nome);
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

    return { totalVendido, metaIndividual, percentualAtingido, nivelAtual, comissaoEstimada };
  }, [lancamentos, metaMensal, metaConsultora, niveisComissao]);

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <AppLayout title="Visão Consultora">
      <div className="space-y-6">
        {/* Seletor */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
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
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
              </p>
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
              <AiCoach consultoraId={selectedConsultoraId} />
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
                  <p className="text-xs text-muted-foreground">Nível {metricas?.nivelAtual || 1} de 5</p>
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

            {/* Níveis de comissão */}
            <Card>
              <CardHeader><CardTitle>Níveis de Comissão</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {niveisComissao?.map((nivel) => (
                    <div
                      key={nivel.nivel}
                      className={`flex-1 p-3 rounded-lg text-center border ${
                        metricas?.nivelAtual === nivel.nivel
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="font-bold">Nível {nivel.nivel}</div>
                      <div className="text-sm opacity-80">
                        {(Number(nivel.de_percent) * 100).toFixed(0)}% - {(Number(nivel.ate_percent) * 100).toFixed(0)}%
                      </div>
                      <div className="text-lg font-bold mt-1">
                        {(Number(nivel.comissao_percent) * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Lançamentos */}
            <Card>
              <CardHeader>
                <CardTitle>Vendas do Mês ({lancamentos?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {lancamentos && lancamentos.length > 0 ? (
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
                        {lancamentos.map((l) => (
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
