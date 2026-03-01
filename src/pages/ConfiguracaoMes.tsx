import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, TrendingUp, Save, CalendarDays } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { useMetaSemanalSalvar, getSemanasDoMes } from '@/hooks/useMetaSemanal';
import { ptBR } from 'date-fns/locale';
import type { MetaMensal, Consultora, MetaConsultora, ComissaoNivel } from '@/types/database';
import { getNivelNome } from '@/lib/utils';

interface NivelConfig {
  nivel: number;
  de_percent: string;
  ate_percent: string;
  comissao_percent: string;
}

const defaultNiveis: NivelConfig[] = [
  { nivel: 1, de_percent: '0', ate_percent: '79.99', comissao_percent: '2' },
  { nivel: 2, de_percent: '80', ate_percent: '99.99', comissao_percent: '3' },
  { nivel: 3, de_percent: '100', ate_percent: '119.99', comissao_percent: '4' },
  { nivel: 4, de_percent: '120', ate_percent: '149.99', comissao_percent: '5' },
  { nivel: 5, de_percent: '150', ate_percent: '999', comissao_percent: '6' },
];

const nivelColors: Record<number, string> = {
  1: 'bg-slate-100 text-slate-700 border-slate-200',
  2: 'bg-blue-100 text-blue-700 border-blue-200',
  3: 'bg-amber-100 text-amber-700 border-amber-200',
  4: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  5: 'bg-purple-100 text-purple-700 border-purple-200',
};

export default function ConfiguracaoMes() {
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'));
  const [metaTotal, setMetaTotal] = useState('');
  const [percentuais, setPercentuais] = useState<Record<string, string>>({});
  const [niveis, setNiveis] = useState<NivelConfig[]>(defaultNiveis);
  const [pesosSemana, setPesosSemana] = useState<Record<number, string>>({
    1: '30', 2: '25', 3: '25', 4: '20', 5: '0',
  });
  
  const { toast } = useToast();
  const { salvar: salvarMetaSemanal } = useMetaSemanalSalvar();
  const { empresaId } = useAuth();
  const queryClient = useQueryClient();

  // Buscar consultoras
  const { data: consultoras } = useQuery({
    queryKey: ['consultoras-ativas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consultoras')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      return data as Consultora[];
    },
  });

  // Buscar meta do mês selecionado
  const { data: metaMensal, refetch: refetchMeta } = useQuery({
    queryKey: ['meta-mensal', mesSelecionado],
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
    queryKey: ['metas-consultoras', metaMensal?.id],
    enabled: !!metaMensal?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metas_consultoras')
        .select('*')
        .eq('meta_mensal_id', metaMensal!.id);
      
      if (error) throw error;
      return data as MetaConsultora[];
    },
  });

  // Buscar pesos semanais
  const { data: pesosSemanalDb } = useQuery({
    queryKey: ['meta-semanal-config', metaMensal?.id],
    enabled: !!metaMensal?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('meta_semanal')
        .select('semana, peso_percent')
        .eq('meta_mensal_id', metaMensal!.id)
        .order('semana');
      if (error) throw error;
      return data as { semana: number; peso_percent: number }[];
    },
  });

  // Buscar níveis de comissão
  const { data: niveisComissao } = useQuery({
    queryKey: ['comissao-niveis', metaMensal?.id],
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

  // Buscar níveis do mês anterior mais recente (fallback para meses novos)
  const { data: niveisAnteriores } = useQuery({
    queryKey: ['comissao-niveis-anterior', mesSelecionado, empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data: metaAnterior, error: metaErr } = await supabase
        .from('metas_mensais')
        .select('id')
        .eq('empresa_id', empresaId!)
        .lt('mes_referencia', mesSelecionado)
        .order('mes_referencia', { ascending: false })
        .limit(1)
        .single();

      if (metaErr || !metaAnterior) return null;

      const { data, error } = await supabase
        .from('comissao_niveis')
        .select('*')
        .eq('meta_mensal_id', metaAnterior.id)
        .order('nivel');

      if (error) throw error;
      return data as ComissaoNivel[];
    },
  });

  const mapNiveisToConfig = (data: ComissaoNivel[]): NivelConfig[] =>
    data.map(n => ({
      nivel: n.nivel,
      de_percent: String(parseFloat((Number(n.de_percent) * 100).toFixed(10))),
      ate_percent: String(parseFloat((Number(n.ate_percent) * 100).toFixed(10))),
      comissao_percent: String(parseFloat((Number(n.comissao_percent) * 100).toFixed(10))),
    }));

  // Preencher dados quando carregar
  useEffect(() => {
    if (metaMensal) {
      setMetaTotal(String(Math.round(Number(metaMensal.meta_total) * 100)));
    } else {
      setMetaTotal('');
    }
  }, [metaMensal]);

  useEffect(() => {
    if (metasConsultoras && consultoras) {
      const newPercentuais: Record<string, string> = {};
      for (const mc of metasConsultoras) {
        newPercentuais[mc.consultora_id] = String(Number(mc.percentual) * 100);
      }
      setPercentuais(newPercentuais);
    } else {
      setPercentuais({});
    }
  }, [metasConsultoras, consultoras]);

  useEffect(() => {
    if (pesosSemanalDb && pesosSemanalDb.length > 0) {
      const newPesos: Record<number, string> = { 1: '0', 2: '0', 3: '0', 4: '0', 5: '0' };
      for (const p of pesosSemanalDb) {
        newPesos[p.semana] = String(Number(p.peso_percent));
      }
      setPesosSemana(newPesos);
    } else {
      setPesosSemana({ 1: '30', 2: '25', 3: '25', 4: '20', 5: '0' });
    }
  }, [pesosSemanalDb]);

   useEffect(() => {
    if (niveisComissao && niveisComissao.length > 0) {
      setNiveis(mapNiveisToConfig(niveisComissao));
    } else if (niveisAnteriores && niveisAnteriores.length > 0) {
      setNiveis(mapNiveisToConfig(niveisAnteriores));
    } else {
      setNiveis(defaultNiveis);
    }
  }, [niveisComissao, niveisAnteriores]);

  // Salvar configurações
  const salvarConfig = useMutation({
    mutationFn: async () => {
      const metaNum = parseFloat(metaTotal.replace(/\D/g, '')) / 100;
      if (!metaNum || metaNum <= 0) {
        throw new Error('Meta total deve ser maior que zero');
      }

      const somaPercentuais = Object.values(percentuais).reduce((acc, p) => acc + (parseFloat(p) || 0), 0);
      if (somaPercentuais > 0 && Math.abs(somaPercentuais - 100) > 0.01) {
        throw new Error(`A soma dos percentuais deve ser 100% (atual: ${somaPercentuais.toFixed(1)}%)`);
      }

      let metaId = metaMensal?.id;

      if (metaId) {
        const { error } = await supabase
          .from('metas_mensais')
          .update({ meta_total: metaNum })
          .eq('id', metaId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('metas_mensais')
          .insert({ mes_referencia: mesSelecionado, meta_total: metaNum, empresa_id: empresaId! })
          .select()
          .single();
        if (error) throw error;
        metaId = data.id;
      }

      await supabase.from('metas_consultoras').delete().eq('meta_mensal_id', metaId);
      
      const metasConsultorasInsert = Object.entries(percentuais)
        .filter(([_, p]) => parseFloat(p) > 0)
        .map(([consultora_id, p]) => ({
          meta_mensal_id: metaId,
          consultora_id,
          percentual: parseFloat(p) / 100,
          empresa_id: empresaId!,
        }));
      
      if (metasConsultorasInsert.length > 0) {
        const { error } = await supabase.from('metas_consultoras').insert(metasConsultorasInsert);
        if (error) throw error;
      }

      await supabase.from('comissao_niveis').delete().eq('meta_mensal_id', metaId);
      
      const niveisInsert = niveis.map(n => ({
        meta_mensal_id: metaId,
        nivel: n.nivel,
        de_percent: parseFloat(String(n.de_percent).replace(',', '.')) / 100,
        ate_percent: parseFloat(String(n.ate_percent).replace(',', '.')) / 100,
        comissao_percent: parseFloat(String(n.comissao_percent).replace(',', '.')) / 100,
        empresa_id: empresaId!,
      }));
      
      const { error: niveisError } = await supabase.from('comissao_niveis').insert(niveisInsert);
      if (niveisError) throw niveisError;

      // Salvar pesos semanais
      const semanasAtual = getSemanasDoMes(
        Number(mesSelecionado.split('-')[0]),
        Number(mesSelecionado.split('-')[1]),
      );
      const somaSemanas = semanasAtual.reduce((s, w) => s + (parseFloat(pesosSemana[w.semana]) || 0), 0);
      if (somaSemanas > 0 && Math.abs(somaSemanas - 100) > 0.01) {
        throw new Error(`A soma da distribuição semanal deve ser 100% (atual: ${somaSemanas.toFixed(1)}%)`);
      }
      await salvarMetaSemanal(
        metaId!,
        empresaId!,
        semanasAtual.map(s => ({ semana: s.semana, peso_percent: parseFloat(pesosSemana[s.semana]) || 0 })),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-mensal'] });
      queryClient.invalidateQueries({ queryKey: ['metas-consultoras'] });
      queryClient.invalidateQueries({ queryKey: ['comissao-niveis'] });
      queryClient.invalidateQueries({ queryKey: ['meta-semanal'] });
      toast({ title: 'Configurações salvas com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  const formatCurrency = (value: string) => {
    const num = value.replace(/\D/g, '');
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(parseFloat(num) / 100 || 0);
  };

  const somaPercentuais = Object.values(percentuais).reduce((acc, p) => acc + (parseFloat(p) || 0), 0);

  const meses = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(addMonths(new Date(), 2), 11 - i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: ptBR }),
    };
  });

  const metaNum = parseFloat(metaTotal.replace(/\D/g, '')) / 100 || 0;

  // Dynamic weeks for selected month
  const [anoSel, mesSel] = mesSelecionado.split('-').map(Number);
  const semanasDoMes = useMemo(() => getSemanasDoMes(anoSel, mesSel), [anoSel, mesSel]);
  const totalSemanas = semanasDoMes.length;

  return (
    <AppLayout title="Configuração do Mês">
      <div className="space-y-6">
        {/* Header com seletor de mês + botão salvar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meses.map(m => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={() => salvarConfig.mutate()}
            disabled={salvarConfig.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {salvarConfig.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>

        {/* Grid de 2 colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meta e Distribuição */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-primary" />
                Meta e Distribuição
              </CardTitle>
              <CardDescription>
                Valor total da meta e distribuição por consultora
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Meta do Mês</Label>
                <Input
                  value={metaTotal ? formatCurrency(metaTotal) : ''}
                  onChange={(e) => setMetaTotal(e.target.value.replace(/\D/g, ''))}
                  placeholder="R$ 0,00"
                  className="text-xl font-semibold h-12"
                />
              </div>


              {consultoras && consultoras.length > 0 ? (
                <div className="space-y-1">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide pb-2 border-b">
                    <span>Consultora</span>
                    <span className="w-28 text-right">Valor</span>
                    <span className="w-24 text-right">%</span>
                  </div>
                  {consultoras.map(c => {
                    const perc = parseFloat(percentuais[c.id]) || 0;
                    const valorConsultora = (perc / 100) * metaNum;
                    return (
                      <div key={c.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center py-1.5 hover:bg-muted/50 rounded px-1 -mx-1 transition-colors">
                        <span className="text-sm font-medium truncate">{c.nome}</span>
                        <span className="w-28 text-right text-sm text-muted-foreground tabular-nums">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorConsultora)}
                        </span>
                        <div className="flex items-center gap-1 w-24 justify-end">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={percentuais[c.id] || ''}
                            onChange={(e) => setPercentuais(p => ({ ...p, [c.id]: e.target.value }))}
                            className="w-18 text-right h-8 text-sm"
                            placeholder="0"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </div>
                    );
                  })}
                  {/* Totalizador */}
                  {(() => {
                    const valorTotal = (somaPercentuais / 100) * metaNum;
                    const isExact = Math.abs(somaPercentuais - 100) < 0.01;
                    const isOver = somaPercentuais > 100;
                    return (
                      <div className={`mt-2 rounded-lg px-3 py-2.5 grid grid-cols-[1fr_auto_auto] gap-2 font-bold text-sm ${
                        isExact 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                          : isOver 
                            ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' 
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                      }`}>
                        <span>Total</span>
                        <span className="w-28 text-right tabular-nums">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
                        </span>
                        <span className="w-24 text-right tabular-nums">{somaPercentuais.toFixed(1)}%</span>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-center py-4 text-muted-foreground text-sm">
                  Nenhuma consultora cadastrada.{' '}
                  <a href="/consultoras" className="text-primary hover:underline">
                    Cadastrar →
                  </a>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Níveis de Comissão */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Níveis de Comissão
              </CardTitle>
              <CardDescription>
                Faixas de atingimento e percentuais de comissão
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide pb-2 border-b">
                  <span className="w-16">Nível</span>
                  <span className="text-center">De %</span>
                  <span className="text-center">Até %</span>
                  <span className="text-center">Comissão %</span>
                </div>
                {niveis.map((nivel, index) => (
                  <div key={nivel.nivel} className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 items-center">
                    <div className="w-16">
                      <Badge className={`${nivelColors[nivel.nivel]} border text-xs font-bold justify-center min-w-10`}>
                        {getNivelNome(nivel.nivel)}
                      </Badge>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      value={nivel.de_percent}
                      onChange={(e) => {
                        const newNiveis = [...niveis];
                        newNiveis[index].de_percent = e.target.value;
                        setNiveis(newNiveis);
                      }}
                      className="text-center h-9 text-sm"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={nivel.ate_percent}
                      onChange={(e) => {
                        const newNiveis = [...niveis];
                        newNiveis[index].ate_percent = e.target.value;
                        setNiveis(newNiveis);
                      }}
                      className="text-center h-9 text-sm"
                    />
                    <Input
                      type="number"
                      step="0.1"
                      value={nivel.comissao_percent}
                      onChange={(e) => {
                        const newNiveis = [...niveis];
                        newNiveis[index].comissao_percent = e.target.value;
                        setNiveis(newNiveis);
                      }}
                      className="text-center h-9 text-sm"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Distribuição Semanal da Meta — card próprio com tabela */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-primary" />
              Distribuição Semanal da Meta
            </CardTitle>
            <CardDescription>
              Defina o peso de cada semana — o valor em R$ é calculado automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const somaPesos = semanasDoMes.reduce((s, w) => s + (parseFloat(pesosSemana[w.semana]) || 0), 0);
              const isExact = Math.abs(somaPesos - 100) < 0.01;
              return (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Semana</TableHead>
                      <TableHead className="w-28">Período</TableHead>
                      <TableHead className="w-36 text-center">Peso (%)</TableHead>
                      <TableHead className="text-right">Valor (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {semanasDoMes.map(s => {
                      const peso = parseFloat(pesosSemana[s.semana]) || 0;
                      const valor = metaNum * peso / 100;
                      return (
                        <TableRow key={s.semana}>
                          <TableCell className="font-medium">S{s.semana}</TableCell>
                          <TableCell className="text-muted-foreground">{s.diaInicio} – {s.diaFim}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={pesosSemana[s.semana] || '0'}
                                onChange={e => setPesosSemana(p => ({ ...p, [s.semana]: e.target.value }))}
                                className="w-20 text-center h-9 text-sm"
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2} className="font-bold">Total</TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold ${isExact ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                          {somaPesos.toFixed(0)}% {isExact ? '✓' : '(deve somar 100%)'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metaNum)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
