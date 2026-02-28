import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart3, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Lancamento {
  condicao_pagamento: string | null;
  forma_pagamento: string | null;
  mes_competencia: string | null;
  data_inicio: string | null;
  plano: string | null;
}

type DurationKey = 'recorrente' | 'entuspass' | 'mensal' | 'pix' | 'dois' | 'tres' | 'quatro' | 'seis' | 'doze' | 'dezoito';

const DURATION_COLUMNS: { key: DurationKey; label: string }[] = [
  { key: 'recorrente', label: 'Recorrente' },
  { key: 'entuspass', label: 'Entuspass' },
  { key: 'mensal', label: 'Mensal' },
  { key: 'pix', label: 'PIX' },
  { key: 'dois', label: '2x' },
  { key: 'tres', label: '3x' },
  { key: 'quatro', label: '4x' },
  { key: 'seis', label: '6x' },
  { key: 'doze', label: '12x' },
  { key: 'dezoito', label: '18x' },
];

function classifyDuration(l: Lancamento): DurationKey {
  const cp = (l.condicao_pagamento || '').toUpperCase();
  const fp = (l.forma_pagamento || '').toUpperCase();
  const plano = (l.plano || '').toUpperCase();

  if (plano.includes('ENTUSPASS')) return 'entuspass';
  if (cp.includes('RECORRÊNCIA') || cp.includes('RECORRENCIA')) return 'recorrente';
  if (cp === 'A VISTA') return 'mensal';
  if (cp.includes('18')) return 'dezoito';
  if (cp.includes('12') && !cp.includes('RECORRÊNCIA') && !cp.includes('RECORRENCIA')) return 'doze';
  if (cp.includes('6')) return 'seis';
  if (cp.includes('4')) return 'quatro';
  if (cp.includes('3')) return 'tres';
  if (cp.includes('2')) return 'dois';
  // null condicao with PIX
  if (!l.condicao_pagamento && fp.includes('PIX')) return 'pix';
  // null condicao without PIX → mensal fallback
  if (!l.condicao_pagamento) return 'mensal';
  return 'mensal';
}

function emptyDurationRow(): Record<DurationKey, number> {
  return { recorrente: 0, entuspass: 0, mensal: 0, pix: 0, dois: 0, tres: 0, quatro: 0, seis: 0, doze: 0, dezoito: 0 };
}

function formatMonth(mc: string) {
  const [y, m] = mc.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}

export default function Relatorios() {
  const { empresaId } = useAuth();

  const { data: lancamentos, isLoading } = useQuery({
    queryKey: ['relatorios-lancamentos', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      // Fetch all lancamentos with entra_meta, selecting only needed fields
      const { data, error } = await supabase
        .from('lancamentos')
        .select('condicao_pagamento, forma_pagamento, mes_competencia, data_inicio, plano')
        .eq('empresa_id', empresaId)
        .eq('entra_meta', true);
      if (error) throw error;
      return (data || []) as Lancamento[];
    },
    enabled: !!empresaId,
  });

  const { durationByMonth, recurrenceByMonth, months, durationTotals, recurrenceTotals } = useMemo(() => {
    if (!lancamentos?.length) return { durationByMonth: {}, recurrenceByMonth: {}, months: [], durationTotals: emptyDurationRow(), recurrenceTotals: { novo: 0, recorrencia: 0 } };

    const durMap: Record<string, Record<DurationKey, number>> = {};
    const recMap: Record<string, { novo: number; recorrencia: number }> = {};

    for (const l of lancamentos) {
      const mc = l.mes_competencia;
      if (!mc) continue;

      // Duration table
      if (!durMap[mc]) durMap[mc] = emptyDurationRow();
      const cat = classifyDuration(l);
      durMap[mc][cat]++;

      // Recurrence table
      const cp = (l.condicao_pagamento || '').toUpperCase();
      if (cp.includes('RECORRÊNCIA') || cp.includes('RECORRENCIA')) {
        if (!recMap[mc]) recMap[mc] = { novo: 0, recorrencia: 0 };
        const dataInicioMonth = l.data_inicio ? l.data_inicio.slice(0, 7) : null;
        if (dataInicioMonth && dataInicioMonth === mc) {
          recMap[mc].novo++;
        } else if (dataInicioMonth && dataInicioMonth < mc) {
          recMap[mc].recorrencia++;
        } else {
          // fallback: treat as new if no data_inicio
          recMap[mc].novo++;
        }
      }
    }

    const sortedMonths = Object.keys(durMap).sort();

    const durationTotals = emptyDurationRow();
    for (const m of sortedMonths) {
      for (const k of DURATION_COLUMNS) {
        durationTotals[k.key] += durMap[m][k.key];
      }
    }

    const recurrenceTotals = { novo: 0, recorrencia: 0 };
    for (const m of sortedMonths) {
      if (recMap[m]) {
        recurrenceTotals.novo += recMap[m].novo;
        recurrenceTotals.recorrencia += recMap[m].recorrencia;
      }
    }

    return { durationByMonth: durMap, recurrenceByMonth: recMap, months: sortedMonths, durationTotals, recurrenceTotals };
  }, [lancamentos]);

  const durTotal = (row: Record<DurationKey, number>) =>
    DURATION_COLUMNS.reduce((sum, c) => sum + row[c.key], 0);

  return (
    <AppLayout title="Relatórios">
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Table 1 - Plans by Duration */}
            <Card className="xl:col-span-2 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Planos por Duração</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold text-xs whitespace-nowrap">Mês</TableHead>
                        {DURATION_COLUMNS.map(c => (
                          <TableHead key={c.key} className="text-center font-semibold text-xs whitespace-nowrap">{c.label}</TableHead>
                        ))}
                        <TableHead className="text-center font-semibold text-xs whitespace-nowrap">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {months.map(mc => {
                        const row = durationByMonth[mc];
                        return (
                          <TableRow key={mc} className="hover:bg-muted/30">
                            <TableCell className="font-medium text-xs whitespace-nowrap">{formatMonth(mc)}</TableCell>
                            {DURATION_COLUMNS.map(c => (
                              <TableCell key={c.key} className="text-center text-xs tabular-nums">
                                {row[c.key] || '-'}
                              </TableCell>
                            ))}
                            <TableCell className="text-center font-semibold text-xs tabular-nums">{durTotal(row)}</TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Totals row */}
                      <TableRow className="bg-muted/50 font-bold border-t-2">
                        <TableCell className="text-xs font-bold">Total</TableCell>
                        {DURATION_COLUMNS.map(c => (
                          <TableCell key={c.key} className="text-center text-xs font-bold tabular-nums">
                            {durationTotals[c.key] || '-'}
                          </TableCell>
                        ))}
                        <TableCell className="text-center text-xs font-bold tabular-nums">{durTotal(durationTotals)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Table 2 - Recurrence Detail */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base font-semibold">Recorrência Detalhada</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold text-xs">Mês</TableHead>
                        <TableHead className="text-center font-semibold text-xs whitespace-nowrap">Novos</TableHead>
                        <TableHead className="text-center font-semibold text-xs whitespace-nowrap">Recorrência</TableHead>
                        <TableHead className="text-center font-semibold text-xs whitespace-nowrap">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {months.map(mc => {
                        const rec = recurrenceByMonth[mc] || { novo: 0, recorrencia: 0 };
                        return (
                          <TableRow key={mc} className="hover:bg-muted/30">
                            <TableCell className="font-medium text-xs whitespace-nowrap">{formatMonth(mc)}</TableCell>
                            <TableCell className="text-center text-xs tabular-nums">{rec.novo || '-'}</TableCell>
                            <TableCell className="text-center text-xs tabular-nums">{rec.recorrencia || '-'}</TableCell>
                            <TableCell className="text-center font-semibold text-xs tabular-nums">{rec.novo + rec.recorrencia || '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-muted/50 font-bold border-t-2">
                        <TableCell className="text-xs font-bold">Total</TableCell>
                        <TableCell className="text-center text-xs font-bold tabular-nums">{recurrenceTotals.novo || '-'}</TableCell>
                        <TableCell className="text-center text-xs font-bold tabular-nums">{recurrenceTotals.recorrencia || '-'}</TableCell>
                        <TableCell className="text-center text-xs font-bold tabular-nums">{recurrenceTotals.novo + recurrenceTotals.recorrencia || '-'}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
