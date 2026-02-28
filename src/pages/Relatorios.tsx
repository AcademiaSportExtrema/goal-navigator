import { useMemo, useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BarChart3, RefreshCw, Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Lancamento {
  condicao_pagamento: string | null;
  forma_pagamento: string | null;
  mes_competencia: string | null;
  data_inicio: string | null;
  plano: string | null;
  duracao: string | null;
  nome_cliente: string | null;
  produto: string | null;
  valor: number | null;
  numero_contrato: string | null;
}

// ── Tabela 1: Planos por Duração (campo `duracao`) ──
type DurationKey = 'loja' | 'mensal' | 'quatro' | 'seis' | 'doze' | 'dezoito' | 'outros';

const DURATION_COLUMNS: { key: DurationKey; label: string }[] = [
  { key: 'loja', label: 'Loja' },
  { key: 'mensal', label: 'Mensal' },
  { key: 'quatro', label: '4 meses' },
  { key: 'seis', label: '6 meses' },
  { key: 'doze', label: '12 meses' },
  { key: 'dezoito', label: '18 meses' },
  { key: 'outros', label: 'Outros' },
];

function classifyDuration(l: Lancamento): DurationKey {
  const dur = parseInt(l.duracao || '0', 10);
  if (!dur || dur === 0) return 'loja';
  if (dur === 1) return 'mensal';
  if (dur === 4) return 'quatro';
  if (dur === 6) return 'seis';
  if (dur === 12) return 'doze';
  if (dur === 18) return 'dezoito';
  return 'outros';
}

function emptyDurationRow(): Record<DurationKey, number> {
  return { loja: 0, mensal: 0, quatro: 0, seis: 0, doze: 0, dezoito: 0, outros: 0 };
}

// ── Tabela 3: Parcelado vs Recorrência ──
type PaymentTypeKey = 'parcelado' | 'recorrente_processado';

const PAYMENT_TYPE_COLUMNS: { key: PaymentTypeKey; label: string }[] = [
  { key: 'parcelado', label: 'Parcelados' },
  { key: 'recorrente_processado', label: 'Recorrentes' },
];

function emptyPaymentTypeRow(): Record<PaymentTypeKey, number> {
  return { parcelado: 0, recorrente_processado: 0 };
}

function formatMonth(mc: string) {
  const [y, m] = mc.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}

function formatCurrency(v: number | null) {
  if (v == null) return '-';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Drill-down types ──
interface DrillDownState {
  title: string;
  items: Lancamento[];
}

export default function Relatorios() {
  const { empresaId } = useAuth();
  const [drillDown, setDrillDown] = useState<DrillDownState | null>(null);

  const { data: lancamentos, isLoading } = useQuery({
    queryKey: ['relatorios-lancamentos', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from('lancamentos')
        .select('condicao_pagamento, forma_pagamento, mes_competencia, data_inicio, plano, duracao, nome_cliente, produto, valor, numero_contrato')
        .eq('empresa_id', empresaId)
        .eq('entra_meta', true);
      if (error) throw error;
      return (data || []) as Lancamento[];
    },
    enabled: !!empresaId,
  });

  const { durationByMonth, recurrenceByMonth, paymentTypeByMonth, months, durationTotals, recurrenceTotals, paymentTypeTotals, lancamentosByMonthDuration, lancamentosByMonthRecurrence, lancamentosByMonthPaymentType } = useMemo(() => {
    const empty = {
      durationByMonth: {} as Record<string, Record<DurationKey, number>>,
      recurrenceByMonth: {} as Record<string, { novo: number; recorrencia: number }>,
      paymentTypeByMonth: {} as Record<string, Record<PaymentTypeKey, number>>,
      months: [] as string[],
      durationTotals: emptyDurationRow(),
      recurrenceTotals: { novo: 0, recorrencia: 0 },
      paymentTypeTotals: emptyPaymentTypeRow(),
      lancamentosByMonthDuration: {} as Record<string, Record<DurationKey, Lancamento[]>>,
      lancamentosByMonthRecurrence: {} as Record<string, Record<'novo' | 'recorrencia', Lancamento[]>>,
      lancamentosByMonthPaymentType: {} as Record<string, Record<PaymentTypeKey, Lancamento[]>>,
    };
    if (!lancamentos?.length) return empty;

    const durMap: Record<string, Record<DurationKey, number>> = {};
    const recMap: Record<string, { novo: number; recorrencia: number }> = {};
    const ptMap: Record<string, Record<PaymentTypeKey, number>> = {};
    const ldMap: Record<string, Record<DurationKey, Lancamento[]>> = {};
    const lrMap: Record<string, Record<'novo' | 'recorrencia', Lancamento[]>> = {};
    const lpMap: Record<string, Record<PaymentTypeKey, Lancamento[]>> = {};

    for (const l of lancamentos) {
      const mc = l.mes_competencia;
      if (!mc) continue;

      // ── Tabela 1: Duração ──
      if (!durMap[mc]) {
        durMap[mc] = emptyDurationRow();
        ldMap[mc] = { loja: [], mensal: [], quatro: [], seis: [], doze: [], dezoito: [], outros: [] };
      }
      const cat = classifyDuration(l);
      durMap[mc][cat]++;
      ldMap[mc][cat].push(l);

      // ── Tabela 2: Recorrência Detalhada ──
      const cp = (l.condicao_pagamento || '').toUpperCase();
      const isRecorrencia = cp.includes('RECORRÊNCIA') || cp.includes('RECORRENCIA');

      if (isRecorrencia) {
        if (!recMap[mc]) {
          recMap[mc] = { novo: 0, recorrencia: 0 };
          lrMap[mc] = { novo: [], recorrencia: [] };
        }
        const dataInicioMonth = l.data_inicio ? l.data_inicio.slice(0, 7) : null;
        if (dataInicioMonth && dataInicioMonth === mc) {
          recMap[mc].novo++;
          lrMap[mc].novo.push(l);
        } else if (dataInicioMonth && dataInicioMonth < mc) {
          recMap[mc].recorrencia++;
          lrMap[mc].recorrencia.push(l);
        } else {
          recMap[mc].novo++;
          if (!lrMap[mc]) lrMap[mc] = { novo: [], recorrencia: [] };
          lrMap[mc].novo.push(l);
        }
      }

      // ── Tabela 3: Parcelado vs Recorrência ──
      const dur = parseInt(l.duracao || '0', 10);
      if (dur > 1) {
        if (!ptMap[mc]) {
          ptMap[mc] = emptyPaymentTypeRow();
          lpMap[mc] = { parcelado: [], recorrente_processado: [] };
        }
        if (isRecorrencia) {
          const dataInicioMonth = l.data_inicio ? l.data_inicio.slice(0, 7) : null;
          if (dataInicioMonth && dataInicioMonth < mc) {
            ptMap[mc].recorrente_processado++;
            lpMap[mc].recorrente_processado.push(l);
          } else {
            // new recurrences go to parcelado (first month = like a new sale)
            ptMap[mc].parcelado++;
            lpMap[mc].parcelado.push(l);
          }
        } else {
          ptMap[mc].parcelado++;
          lpMap[mc].parcelado.push(l);
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

    const paymentTypeTotals = emptyPaymentTypeRow();
    for (const m of sortedMonths) {
      if (ptMap[m]) {
        paymentTypeTotals.parcelado += ptMap[m].parcelado;
        paymentTypeTotals.recorrente_processado += ptMap[m].recorrente_processado;
      }
    }

    return {
      durationByMonth: durMap,
      recurrenceByMonth: recMap,
      paymentTypeByMonth: ptMap,
      months: sortedMonths,
      durationTotals,
      recurrenceTotals,
      paymentTypeTotals,
      lancamentosByMonthDuration: ldMap,
      lancamentosByMonthRecurrence: lrMap,
      lancamentosByMonthPaymentType: lpMap,
    };
  }, [lancamentos]);

  const durTotal = (row: Record<DurationKey, number>) =>
    DURATION_COLUMNS.reduce((sum, c) => sum + row[c.key], 0);

  const openDrillDown = (title: string, items: Lancamento[]) => {
    if (items.length > 0) {
      setDrillDown({ title, items });
    }
  };

  const ClickableCell = ({ value, title, items, className = '' }: { value: number; title: string; items: Lancamento[]; className?: string }) => (
    <TableCell className={`text-center text-xs tabular-nums ${className}`}>
      {value > 0 ? (
        <button
          onClick={() => openDrillDown(title, items)}
          className="underline decoration-dotted underline-offset-2 hover:text-primary transition-colors cursor-pointer"
        >
          {value}
        </button>
      ) : '-'}
    </TableCell>
  );

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
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Tabela 1 - Planos por Duração */}
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
                                <ClickableCell
                                  key={c.key}
                                  value={row[c.key]}
                                  title={`${c.label} — ${formatMonth(mc)}`}
                                  items={lancamentosByMonthDuration[mc]?.[c.key] || []}
                                />
                              ))}
                              <TableCell className="text-center font-semibold text-xs tabular-nums">{durTotal(row)}</TableCell>
                            </TableRow>
                          );
                        })}
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

              {/* Tabela 2 - Recorrência Detalhada */}
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
                              <ClickableCell
                                value={rec.novo}
                                title={`Novos — ${formatMonth(mc)}`}
                                items={lancamentosByMonthRecurrence[mc]?.novo || []}
                              />
                              <ClickableCell
                                value={rec.recorrencia}
                                title={`Recorrência — ${formatMonth(mc)}`}
                                items={lancamentosByMonthRecurrence[mc]?.recorrencia || []}
                              />
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

            {/* Tabela 3 - Parcelado vs Recorrência */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base font-semibold">Parcelado vs Recorrência</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold text-xs">Mês</TableHead>
                        {PAYMENT_TYPE_COLUMNS.map(c => (
                          <TableHead key={c.key} className="text-center font-semibold text-xs whitespace-nowrap">{c.label}</TableHead>
                        ))}
                        <TableHead className="text-center font-semibold text-xs whitespace-nowrap">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {months.map(mc => {
                        const pt = paymentTypeByMonth[mc] || emptyPaymentTypeRow();
                        return (
                          <TableRow key={mc} className="hover:bg-muted/30">
                            <TableCell className="font-medium text-xs whitespace-nowrap">{formatMonth(mc)}</TableCell>
                            {PAYMENT_TYPE_COLUMNS.map(c => (
                              <ClickableCell
                                key={c.key}
                                value={pt[c.key]}
                                title={`${c.label} — ${formatMonth(mc)}`}
                                items={lancamentosByMonthPaymentType[mc]?.[c.key] || []}
                              />
                            ))}
                            <TableCell className="text-center font-semibold text-xs tabular-nums">
                              {pt.parcelado + pt.recorrente_processado || '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-muted/50 font-bold border-t-2">
                        <TableCell className="text-xs font-bold">Total</TableCell>
                        {PAYMENT_TYPE_COLUMNS.map(c => (
                          <TableCell key={c.key} className="text-center text-xs font-bold tabular-nums">
                            {paymentTypeTotals[c.key] || '-'}
                          </TableCell>
                        ))}
                        <TableCell className="text-center text-xs font-bold tabular-nums">
                          {paymentTypeTotals.parcelado + paymentTypeTotals.recorrente_processado || '-'}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Drill-down Dialog */}
      <Dialog open={!!drillDown} onOpenChange={(open) => !open && setDrillDown(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{drillDown?.title}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">Cliente</TableHead>
                  <TableHead className="text-xs font-semibold">Produto</TableHead>
                  <TableHead className="text-xs font-semibold">Plano</TableHead>
                  <TableHead className="text-xs font-semibold">Condição Pgto</TableHead>
                  <TableHead className="text-xs font-semibold">Duração</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Valor</TableHead>
                  <TableHead className="text-xs font-semibold">Data Início</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drillDown?.items.map((item, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="text-xs">{item.nome_cliente || '-'}</TableCell>
                    <TableCell className="text-xs">{item.produto || '-'}</TableCell>
                    <TableCell className="text-xs">{item.plano || '-'}</TableCell>
                    <TableCell className="text-xs">{item.condicao_pagamento || '-'}</TableCell>
                    <TableCell className="text-xs">{item.duracao ? `${item.duracao} meses` : '-'}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{formatCurrency(item.valor)}</TableCell>
                    <TableCell className="text-xs">{item.data_inicio || '-'}</TableCell>
                  </TableRow>
                ))}
                {(!drillDown?.items.length) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">
                      Nenhum lançamento encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {drillDown && drillDown.items.length > 0 && (
            <div className="border-t pt-3 text-xs text-muted-foreground flex justify-between">
              <span>{drillDown.items.length} lançamento(s)</span>
              <span className="font-semibold text-foreground">
                Total: {formatCurrency(drillDown.items.reduce((s, i) => s + (i.valor || 0), 0))}
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
