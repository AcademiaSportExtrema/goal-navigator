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
import { BarChart3, RefreshCw, Layers, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportToCSV } from '@/lib/csv';
import { Skeleton } from '@/components/ui/skeleton';

interface Lancamento {
  condicao_pagamento: string | null;
  forma_pagamento: string | null;
  mes_competencia: string | null;
  data_inicio: string | null;
  data_lancamento: string | null;
  plano: string | null;
  duracao: string | null;
  nome_cliente: string | null;
  produto: string | null;
  valor: number | null;
  numero_contrato: string | null;
}

// ── Tabela 1: Planos por Duração (campo `duracao`) ──
type DurationKey = 'loja' | 'mensal' | 'recorrente' | 'quatro' | 'seis' | 'doze' | 'dezoito' | 'outros';

const DURATION_COLUMNS: { key: DurationKey; label: string }[] = [
  { key: 'loja', label: 'Loja' },
  { key: 'mensal', label: 'Mensal' },
  { key: 'recorrente', label: 'Recorrente' },
  { key: 'quatro', label: '4 meses' },
  { key: 'seis', label: '6 meses' },
  { key: 'doze', label: '12 meses' },
  { key: 'dezoito', label: '18 meses' },
  { key: 'outros', label: 'Outros' },
];

function isRecorrente(l: Lancamento): boolean {
  const cp = (l.condicao_pagamento || '').toUpperCase();
  return cp.includes('RECORRÊNCIA') || cp.includes('RECORRENCIA');
}

function classifyDuration(l: Lancamento): DurationKey {
  if (isRecorrente(l)) return 'recorrente';
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
  return { loja: 0, mensal: 0, recorrente: 0, quatro: 0, seis: 0, doze: 0, dezoito: 0, outros: 0 };
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
        .select('condicao_pagamento, forma_pagamento, mes_competencia, data_inicio, data_lancamento, plano, duracao, nome_cliente, produto, valor, numero_contrato')
        .eq('empresa_id', empresaId)
        .eq('entra_meta', true);
      if (error) throw error;
      return (data || []) as Lancamento[];
    },
    enabled: !!empresaId,
  });

  const { durationByMonth, recurrenceByMonth, durationMonths, recurrenceMonths, durationTotals, recurrenceTotals, lancamentosByMonthDuration, lancamentosByMonthRecurrence } = useMemo(() => {
    const empty = {
      durationByMonth: {} as Record<string, Record<DurationKey, number>>,
      recurrenceByMonth: {} as Record<string, { novo: number; recorrencia: number }>,
      durationMonths: [] as string[],
      recurrenceMonths: [] as string[],
      durationTotals: emptyDurationRow(),
      recurrenceTotals: { novo: 0, recorrencia: 0 },
      lancamentosByMonthDuration: {} as Record<string, Record<DurationKey, Lancamento[]>>,
      lancamentosByMonthRecurrence: {} as Record<string, Record<'novo' | 'recorrencia', Lancamento[]>>,
    };
    if (!lancamentos?.length) return empty;

    const durMap: Record<string, Record<DurationKey, number>> = {};
    const recMap: Record<string, { novo: number; recorrencia: number }> = {};
    const ldMap: Record<string, Record<DurationKey, Lancamento[]>> = {};
    const lrMap: Record<string, Record<'novo' | 'recorrencia', Lancamento[]>> = {};

    for (const l of lancamentos) {
      const mc = l.mes_competencia;
      if (!mc) continue;

      // ── Tabela 1: Duração (com separação Recorrente) ──
      if (!durMap[mc]) {
        durMap[mc] = emptyDurationRow();
        ldMap[mc] = { loja: [], mensal: [], recorrente: [], quatro: [], seis: [], doze: [], dezoito: [], outros: [] };
      }
      const cat = classifyDuration(l);
      durMap[mc][cat]++;
      ldMap[mc][cat].push(l);

      // ── Tabela 2: Recorrência Detalhada (indexada por mês de processamento) ──
      if (isRecorrente(l)) {
        const recMonth = l.data_lancamento?.slice(0, 7) || mc;
        if (!recMap[recMonth]) {
          recMap[recMonth] = { novo: 0, recorrencia: 0 };
          lrMap[recMonth] = { novo: [], recorrencia: [] };
        }
        const diMonth = l.data_inicio ? l.data_inicio.slice(0, 7) : null;
        if (diMonth && diMonth === recMonth) {
          recMap[recMonth].novo++;
          lrMap[recMonth].novo.push(l);
        } else {
          recMap[recMonth].recorrencia++;
          lrMap[recMonth].recorrencia.push(l);
        }
      }
    }

    const durationMonths = Object.keys(durMap).sort();
    const recurrenceMonths = Object.keys(recMap).sort();

    const durationTotals = emptyDurationRow();
    for (const m of durationMonths) {
      for (const k of DURATION_COLUMNS) {
        durationTotals[k.key] += durMap[m][k.key];
      }
    }

    const recurrenceTotals = { novo: 0, recorrencia: 0 };
    for (const m of recurrenceMonths) {
      recurrenceTotals.novo += recMap[m].novo;
      recurrenceTotals.recorrencia += recMap[m].recorrencia;
    }

    return {
      durationByMonth: durMap,
      recurrenceByMonth: recMap,
      durationMonths,
      recurrenceMonths,
      durationTotals,
      recurrenceTotals,
      lancamentosByMonthDuration: ldMap,
      lancamentosByMonthRecurrence: lrMap,
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
                        {durationMonths.map(mc => {
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
                        {recurrenceMonths.map(mc => {
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
                  <TableHead className="text-xs font-semibold">Data Lançamento</TableHead>
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
                    <TableCell className="text-xs">{item.data_lancamento || '-'}</TableCell>
                  </TableRow>
                ))}
                {(!drillDown?.items.length) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">
                      Nenhum lançamento encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {drillDown && drillDown.items.length > 0 && (
            <div className="border-t pt-3 text-xs text-muted-foreground flex items-center justify-between">
              <span>{drillDown.items.length} lançamento(s)</span>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground">
                  Total: {formatCurrency(drillDown.items.reduce((s, i) => s + (i.valor || 0), 0))}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    const rows = drillDown.items.map(i => ({
                      'Cliente': i.nome_cliente || '-',
                      'Produto': i.produto || '-',
                      'Plano': i.plano || '-',
                      'Condição Pgto': i.condicao_pagamento || '-',
                      'Duração': i.duracao ? `${i.duracao} meses` : '-',
                      'Valor': i.valor ?? 0,
                      'Data Início': i.data_inicio || '-',
                      'Data Lançamento': i.data_lancamento || '-',
                    }));
                    const filename = (drillDown.title || 'exportacao').replace(/[^a-zA-Z0-9À-ú\s-]/g, '').trim().replace(/\s+/g, '_') + '.csv';
                    exportToCSV(rows, filename);
                  }}
                >
                  <Download className="h-3 w-3" /> Exportar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
