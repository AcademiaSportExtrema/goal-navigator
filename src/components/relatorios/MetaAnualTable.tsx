import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseBRL(val: string): number {
  return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
}

function formatInputBRL(v: number | string): string {
  const num = typeof v === 'string' ? parseFloat(v) || 0 : v;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  empresaId: string;
  ano: number;
}

export function MetaAnualTable({ empresaId, ano }: Props) {
  const queryClient = useQueryClient();
  const [metaTotal, setMetaTotal] = useState('0');
  const [pesos, setPesos] = useState<number[]>(Array(12).fill(0));
  const [dirty, setDirty] = useState(false);

  // Fetch meta_anual
  const { data: metaAnual, isLoading } = useQuery({
    queryKey: ['meta-anual', empresaId, ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_anual' as any)
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ano', ano)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!empresaId,
  });

  // Fetch meta_anual_meses
  const { data: meses } = useQuery({
    queryKey: ['meta-anual-meses', metaAnual?.id],
    queryFn: async () => {
      if (!metaAnual?.id) return [];
      const { data, error } = await supabase
        .from('meta_anual_meses' as any)
        .select('*')
        .eq('meta_anual_id', metaAnual.id)
        .order('mes');
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!metaAnual?.id,
  });

  // Fetch realized values via RPC (server-side aggregation, no row limit)
  const { data: realizadoRpc } = useQuery({
    queryKey: ['meta-anual-realizado', empresaId, ano],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_realizado_por_mes' as any, {
        p_empresa_id: empresaId,
        p_ano: ano,
      });
      if (error) throw error;
      return (data || []) as { mes: number; total: number }[];
    },
    enabled: !!empresaId,
  });

  // Map RPC result to array indexed 0-11
  const realizadoPorMes = useMemo(() => {
    const arr = Array(12).fill(0);
    if (!realizadoRpc) return arr;
    for (const r of realizadoRpc) {
      if (r.mes >= 1 && r.mes <= 12) arr[r.mes - 1] = Number(r.total) || 0;
    }
    return arr;
  }, [realizadoRpc]);

  // Sync state from DB
  useEffect(() => {
    if (metaAnual) {
      setMetaTotal(formatInputBRL(metaAnual.meta_total || 0));
    } else {
      setMetaTotal('0,00');
    }
    setDirty(false);
  }, [metaAnual]);

  useEffect(() => {
    const newPesos = Array(12).fill(0);
    if (meses?.length) {
      for (const m of meses) {
        if (m.mes >= 1 && m.mes <= 12) newPesos[m.mes - 1] = Number(m.peso_percent) || 0;
      }
    }
    setPesos(newPesos);
    setDirty(false);
  }, [meses]);

  const metaTotalNum = parseBRL(metaTotal);
  const totalPesos = pesos.reduce((s, p) => s + p, 0);
  const totalDistribuido = pesos.reduce((s, p) => s + (metaTotalNum * p / 100), 0);
  const totalRealizado = realizadoPorMes.reduce((s, v) => s + v, 0);
  const totalDif = totalRealizado - totalDistribuido;

  const setPeso = (i: number, val: string) => {
    const n = parseFloat(val) || 0;
    const newPesos = [...pesos];
    newPesos[i] = n;
    setPesos(newPesos);
    setDirty(true);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Upsert meta_anual
      const { data: upserted, error: err1 } = await supabase
        .from('meta_anual' as any)
        .upsert(
          { empresa_id: empresaId, ano, meta_total: metaTotalNum, updated_at: new Date().toISOString() } as any,
          { onConflict: 'empresa_id,ano' }
        )
        .select()
        .single();
      if (err1) throw err1;

      const metaId = (upserted as any).id;

      // Delete existing meses and re-insert
      await supabase.from('meta_anual_meses' as any).delete().eq('meta_anual_id', metaId);

      const rows = pesos.map((p, i) => ({
        meta_anual_id: metaId,
        mes: i + 1,
        peso_percent: p,
        empresa_id: empresaId,
      }));

      const { error: err2 } = await supabase.from('meta_anual_meses' as any).insert(rows as any);
      if (err2) throw err2;
    },
    onSuccess: () => {
      toast.success('Meta anual salva!');
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['meta-anual', empresaId, ano] });
      queryClient.invalidateQueries({ queryKey: ['meta-anual-meses'] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar'),
  });

  if (isLoading) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Meta Anual — {ano}</CardTitle>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-1"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Header cards */}
        <div className="flex gap-4 px-4 pb-4">
          <div className="rounded-md bg-amber-100 dark:bg-amber-900/30 p-3 flex-1">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">META MÊS (média)</p>
            <p className="text-lg font-bold text-amber-900 dark:text-amber-200 tabular-nums">
              {formatCurrency(metaTotalNum / 12)}
            </p>
          </div>
          <div className="rounded-md bg-amber-100 dark:bg-amber-900/30 p-3 flex-1">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">META ANO</p>
            <Input
              className="h-8 text-lg font-bold tabular-nums bg-transparent border-amber-300 dark:border-amber-700"
              value={metaTotal}
              onChange={e => { const v = e.target.value.replace(/[^\d.,]/g, ''); setMetaTotal(v); setDirty(true); }}
              placeholder="2.160.000,00"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-amber-100 dark:bg-amber-900/30">
                <TableHead className="text-xs font-semibold text-amber-900 dark:text-amber-200 w-16">%</TableHead>
                <TableHead className="text-xs font-semibold text-amber-900 dark:text-amber-200">Mês</TableHead>
                <TableHead className="text-xs font-semibold text-amber-900 dark:text-amber-200 text-right">Valor Distribuído</TableHead>
                <TableHead className="text-xs font-semibold text-amber-900 dark:text-amber-200 text-right">Realizado</TableHead>
                <TableHead className="text-xs font-semibold text-amber-900 dark:text-amber-200 text-right">Dif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MESES.map((nome, i) => {
                const distribuido = metaTotalNum * pesos[i] / 100;
                const realizado = realizadoPorMes[i];
                const dif = realizado - distribuido;
                return (
                  <TableRow key={i}>
                    <TableCell className="p-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        className="h-7 w-16 text-xs text-right tabular-nums"
                        value={pesos[i] || ''}
                        onChange={e => setPeso(i, e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-xs font-medium">{nome}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{formatCurrency(distribuido)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{formatCurrency(realizado)}</TableCell>
                    <TableCell className={`text-right text-xs tabular-nums font-semibold ${dif > 0 ? 'text-green-600' : dif < 0 ? 'text-red-600' : 'text-foreground'}`}>
                      {formatCurrency(dif)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-amber-50 dark:bg-amber-900/20 font-bold">
                <TableCell className="text-xs tabular-nums text-right">{totalPesos.toFixed(1)}%</TableCell>
                <TableCell className="text-xs">TOTAL</TableCell>
                <TableCell className="text-right text-xs tabular-nums">{formatCurrency(totalDistribuido)}</TableCell>
                <TableCell className="text-right text-xs tabular-nums">{formatCurrency(totalRealizado)}</TableCell>
                <TableCell className={`text-right text-xs tabular-nums ${totalDif > 0 ? 'text-green-600' : totalDif < 0 ? 'text-red-600' : 'text-foreground'}`}>
                  {formatCurrency(totalDif)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={2} className="text-xs text-muted-foreground">Valor médio mensal</TableCell>
                <TableCell className="text-right text-xs tabular-nums">{formatCurrency(totalDistribuido / 12)}</TableCell>
                <TableCell className="text-right text-xs tabular-nums">{formatCurrency(totalRealizado / 12)}</TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell colSpan={2} className="text-xs text-muted-foreground">% realizado do total</TableCell>
                <TableCell />
                <TableCell className="text-right text-xs tabular-nums font-semibold">
                  {totalDistribuido > 0 ? `${((totalRealizado / totalDistribuido) * 100).toFixed(1)}%` : '0%'}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
        {totalPesos > 0 && Math.abs(totalPesos - 100) > 0.1 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 px-4 py-2">
            ⚠ A soma dos pesos é {totalPesos.toFixed(1)}% — deveria ser 100%.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
