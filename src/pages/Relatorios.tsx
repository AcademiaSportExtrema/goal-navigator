import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart3, RefreshCw, Layers, Download, Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { exportToCSV } from '@/lib/csv';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { FechamentoCaixaTable } from '@/components/relatorios/FechamentoCaixaTable';
import { MetaAnualTable } from '@/components/relatorios/MetaAnualTable';

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
  entra_meta?: boolean | null;
}

interface AgregadorRow {
  id: string;
  agregador: string;
  mes_referencia: string;
  data_recebimento: string | null;
  valor: number;
  quantidade_clientes: number;
  observacao: string | null;
}

// ── Tabela 1: Planos por Duração (campo `duracao`) ──
type DurationKey = 'loja' | 'mensal' | 'recorrente' | 'quatro' | 'seis' | 'doze' | 'dezoito' | 'outros';

const DURATION_MONTHS: Partial<Record<DurationKey, number>> = { recorrente: 1, quatro: 4, seis: 6, doze: 12, dezoito: 18 };

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

function isEntuspass(plano: string | null): boolean {
  if (!plano) return false;
  const upper = plano.toUpperCase();
  return upper.includes('ENTUSPASS') || upper.includes('SPORT PASS');
}

// ── Drill-down types ──
interface DrillDownState {
  title: string;
  items: Lancamento[];
}

export default function Relatorios() {
  const { empresaId } = useAuth();
  const queryClient = useQueryClient();
  const [drillDown, setDrillDown] = useState<DrillDownState | null>(null);
  const [showAgregadorForm, setShowAgregadorForm] = useState(false);
  const [formAgregador, setFormAgregador] = useState('Wellhub');
  const [formMesRef, setFormMesRef] = useState('');
  const [formDataReceb, setFormDataReceb] = useState('');
  const [formValor, setFormValor] = useState('');
  const [formQtdClientes, setFormQtdClientes] = useState('');
  const [formObs, setFormObs] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fechamentoMes, setFechamentoMes] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [metaAnualAno, setMetaAnualAno] = useState(() => new Date().getFullYear());

  // Query 1: lancamentos entra_meta = true (vendas normais)
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

  // Query 2: lancamentos Entuspass (entra_meta = false, plano ILIKE '%ENTUSPASS%' ou '%SPORT PASS%')
  const { data: entuspassLancamentos } = useQuery({
    queryKey: ['relatorios-entuspass', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from('lancamentos')
        .select('condicao_pagamento, forma_pagamento, mes_competencia, data_inicio, data_lancamento, plano, duracao, nome_cliente, produto, valor, numero_contrato, entra_meta')
        .eq('empresa_id', empresaId)
        .eq('entra_meta', false);
      if (error) throw error;
      // Filter only entuspass/sport pass plans
      return ((data || []) as Lancamento[]).filter(l => isEntuspass(l.plano));
    },
    enabled: !!empresaId,
  });

  // Query 3: pagamentos_agregadores (Wellhub, Total Pass - manual)
  const { data: agregadores } = useQuery({
    queryKey: ['pagamentos-agregadores', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from('pagamentos_agregadores' as any)
        .select('*')
        .eq('empresa_id', empresaId);
      if (error) throw error;
      return (data || []) as unknown as AgregadorRow[];
    },
    enabled: !!empresaId,
  });

  const resetForm = () => {
    setFormMesRef(''); setFormDataReceb(''); setFormValor(''); setFormQtdClientes(''); setFormObs('');
    setEditingId(null);
  };

  const insertAgregador = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error('Sem empresa');
      const payload = {
        empresa_id: empresaId,
        agregador: formAgregador,
        mes_referencia: formMesRef,
        data_recebimento: formDataReceb || null,
        valor: parseFloat(formValor.replace(/\./g, '').replace(',', '.')),
        quantidade_clientes: parseInt(formQtdClientes, 10) || 0,
        observacao: formObs || null,
      };
      if (editingId) {
        const { error } = await supabase.from('pagamentos_agregadores' as any).update(payload as any).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pagamentos_agregadores' as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Registro atualizado!' : 'Pagamento agregador salvo!');
      queryClient.invalidateQueries({ queryKey: ['pagamentos-agregadores'] });
      setShowAgregadorForm(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar'),
  });

  const deleteAgregador = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pagamentos_agregadores' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Registro excluído!');
      queryClient.invalidateQueries({ queryKey: ['pagamentos-agregadores'] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao excluir'),
  });

  // Aggregate Wellhub & Total Pass separately by month
  const wellhubByMonth = useMemo(() => {
    const map: Record<string, { qty: number; val: number }> = {};
    if (!agregadores?.length) return map;
    for (const a of agregadores) {
      if (a.agregador.toLowerCase().includes('wellhub')) {
        const mesKey = a.data_recebimento ? a.data_recebimento.slice(0, 7) : a.mes_referencia;
        if (!map[mesKey]) map[mesKey] = { qty: 0, val: 0 };
        map[mesKey].qty += a.quantidade_clientes;
        map[mesKey].val += a.valor;
      }
    }
    return map;
  }, [agregadores]);

  const totalpassByMonth = useMemo(() => {
    const map: Record<string, { qty: number; val: number }> = {};
    if (!agregadores?.length) return map;
    for (const a of agregadores) {
      if (a.agregador.toLowerCase().includes('total pass')) {
        const mesKey = a.data_recebimento ? a.data_recebimento.slice(0, 7) : a.mes_referencia;
        if (!map[mesKey]) map[mesKey] = { qty: 0, val: 0 };
        map[mesKey].qty += a.quantidade_clientes;
        map[mesKey].val += a.valor;
      }
    }
    return map;
  }, [agregadores]);

  // Aggregate Entuspass by month (from lancamentos entra_meta=false)
  const entuspassByMonth = useMemo(() => {
    const map: Record<string, { qty: number; val: number; items: Lancamento[] }> = {};
    if (!entuspassLancamentos?.length) return map;
    for (const l of entuspassLancamentos) {
      const mc = l.data_lancamento?.slice(0, 7);
      if (!mc) continue;
      if (!map[mc]) map[mc] = { qty: 0, val: 0, items: [] };
      map[mc].qty++;
      map[mc].val += l.valor || 0;
      map[mc].items.push(l);
    }
    return map;
  }, [entuspassLancamentos]);

  const { durationByMonth, recurrenceByMonth, durationMonths, recurrenceMonths, durationTotals, recurrenceTotals, lancamentosByMonthDuration, lancamentosByMonthRecurrence, durationValByMonth, recurrenceValByMonth, durationValTotals, recurrenceValTotals } = useMemo(() => {
    const empty = {
      durationByMonth: {} as Record<string, Record<DurationKey, number>>,
      recurrenceByMonth: {} as Record<string, { novo: number; recorrencia: number }>,
      durationMonths: [] as string[],
      recurrenceMonths: [] as string[],
      durationTotals: emptyDurationRow(),
      recurrenceTotals: { novo: 0, recorrencia: 0 },
      lancamentosByMonthDuration: {} as Record<string, Record<DurationKey, Lancamento[]>>,
      lancamentosByMonthRecurrence: {} as Record<string, Record<'novo' | 'recorrencia', Lancamento[]>>,
      durationValByMonth: {} as Record<string, Record<DurationKey, number>>,
      recurrenceValByMonth: {} as Record<string, { novo: number; recorrencia: number }>,
      durationValTotals: emptyDurationRow(),
      recurrenceValTotals: { novo: 0, recorrencia: 0 },
    };
    if (!lancamentos?.length) return empty;

    const durMap: Record<string, Record<DurationKey, number>> = {};
    const recMap: Record<string, { novo: number; recorrencia: number }> = {};
    const ldMap: Record<string, Record<DurationKey, Lancamento[]>> = {};
    const lrMap: Record<string, Record<'novo' | 'recorrencia', Lancamento[]>> = {};
    const durValMap: Record<string, Record<DurationKey, number>> = {};
    const recValMap: Record<string, { novo: number; recorrencia: number }> = {};

    for (const l of lancamentos) {
      const mc = l.mes_competencia;
      if (!mc) continue;

      const cat = classifyDuration(l);
      const valor = l.valor || 0;

      if (['mensal', 'quatro', 'seis', 'doze', 'dezoito'].includes(cat)) {
        const diM = l.data_inicio?.slice(0, 7);
        const dlM = l.data_lancamento?.slice(0, 7);
        if (diM && dlM && diM !== dlM) continue;
      }

      const durMonth = (cat === 'recorrente')
        ? (l.data_lancamento?.slice(0, 7) || mc)
        : mc;

      if (!durMap[durMonth]) {
        durMap[durMonth] = emptyDurationRow();
        ldMap[durMonth] = { loja: [], mensal: [], recorrente: [], quatro: [], seis: [], doze: [], dezoito: [], outros: [] };
        durValMap[durMonth] = emptyDurationRow();
      }
      durMap[durMonth][cat]++;
      durValMap[durMonth][cat] += valor;
      ldMap[durMonth][cat].push(l);

      if (isRecorrente(l)) {
        const recMonth = l.data_lancamento?.slice(0, 7) || mc;
        if (!recMap[recMonth]) {
          recMap[recMonth] = { novo: 0, recorrencia: 0 };
          lrMap[recMonth] = { novo: [], recorrencia: [] };
          recValMap[recMonth] = { novo: 0, recorrencia: 0 };
        }
        const diMonth = l.data_inicio ? l.data_inicio.slice(0, 7) : null;
        if (diMonth && diMonth === recMonth) {
          recMap[recMonth].novo++;
          recValMap[recMonth].novo += valor;
          lrMap[recMonth].novo.push(l);
        } else {
          recMap[recMonth].recorrencia++;
          recValMap[recMonth].recorrencia += valor;
          lrMap[recMonth].recorrencia.push(l);
        }
      }
    }

    // Collect all months including entuspass & agregadores months
    const allMonthSet = new Set<string>(Object.keys(durMap));
    for (const mc of Object.keys(entuspassByMonth)) allMonthSet.add(mc);
    for (const mc of Object.keys(wellhubByMonth)) allMonthSet.add(mc);
    for (const mc of Object.keys(totalpassByMonth)) allMonthSet.add(mc);

    const durationMonths = Array.from(allMonthSet).sort();
    const recurrenceMonths = Object.keys(recMap).sort();

    const durationTotals = emptyDurationRow();
    const durationValTotals = emptyDurationRow();
    for (const m of durationMonths) {
      for (const k of DURATION_COLUMNS) {
        durationTotals[k.key] += (durMap[m]?.[k.key] || 0);
        durationValTotals[k.key] += (durValMap[m]?.[k.key] || 0);
      }
    }

    const recurrenceTotals = { novo: 0, recorrencia: 0 };
    const recurrenceValTotals = { novo: 0, recorrencia: 0 };
    for (const m of recurrenceMonths) {
      recurrenceTotals.novo += recMap[m].novo;
      recurrenceTotals.recorrencia += recMap[m].recorrencia;
      recurrenceValTotals.novo += (recValMap[m]?.novo || 0);
      recurrenceValTotals.recorrencia += (recValMap[m]?.recorrencia || 0);
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
      durationValByMonth: durValMap,
      recurrenceValByMonth: recValMap,
      durationValTotals,
      recurrenceValTotals,
    };
  }, [lancamentos, entuspassByMonth, wellhubByMonth, totalpassByMonth]);

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

  const ClickableCurrencyCell = ({ value, title, items, className = '' }: { value: number; title: string; items: Lancamento[]; className?: string }) => (
    <TableCell className={`text-center text-xs tabular-nums ${className}`}>
      {value > 0 ? (
        <button
          onClick={() => openDrillDown(title, items)}
          className="underline decoration-dotted underline-offset-2 hover:text-primary transition-colors cursor-pointer"
        >
          {formatCurrency(value)}
        </button>
      ) : '-'}
    </TableCell>
  );

  const durValTotal = (row: Record<DurationKey, number>) =>
    DURATION_COLUMNS.reduce((sum, c) => sum + row[c.key], 0);

  // Aggregator totals
  const wellhubTotalQty = Object.values(wellhubByMonth).reduce((s, a) => s + a.qty, 0);
  const wellhubTotalVal = Object.values(wellhubByMonth).reduce((s, a) => s + a.val, 0);
  const totalpassTotalQty = Object.values(totalpassByMonth).reduce((s, a) => s + a.qty, 0);
  const totalpassTotalVal = Object.values(totalpassByMonth).reduce((s, a) => s + a.val, 0);
  const entuspassTotalQty = Object.values(entuspassByMonth).reduce((s, a) => s + a.qty, 0);
  const entuspassTotalVal = Object.values(entuspassByMonth).reduce((s, a) => s + a.val, 0);

  return (
    <AppLayout title="Relatórios">
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          </div>
          <Button size="sm" onClick={() => setShowAgregadorForm(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Lançar Agregador
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Tabela 1 — Quantidade por Duração (full width) ── */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Tabela 1 — Quantidade por Duração</CardTitle>
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
                        <TableHead className="text-center font-semibold text-xs whitespace-nowrap">Wellhub</TableHead>
                        <TableHead className="text-center font-semibold text-xs whitespace-nowrap">Total Pass</TableHead>
                        <TableHead className="text-center font-semibold text-xs whitespace-nowrap">Entuspass</TableHead>
                        <TableHead className="text-center font-semibold text-xs whitespace-nowrap">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {durationMonths.map(mc => {
                        const row = durationByMonth[mc] || emptyDurationRow();
                        const wQty = wellhubByMonth[mc]?.qty || 0;
                        const tpQty = totalpassByMonth[mc]?.qty || 0;
                        const epQty = entuspassByMonth[mc]?.qty || 0;
                        const rowTotal = durTotal(row) + wQty + tpQty + epQty;
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
                            <TableCell className="text-center text-xs tabular-nums">{wQty || '-'}</TableCell>
                            <TableCell className="text-center text-xs tabular-nums">{tpQty || '-'}</TableCell>
                            <ClickableCell
                              value={epQty}
                              title={`Entuspass — ${formatMonth(mc)}`}
                              items={entuspassByMonth[mc]?.items || []}
                            />
                            <TableCell className="text-center font-semibold text-xs tabular-nums">{rowTotal}</TableCell>
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
                        <TableCell className="text-center text-xs font-bold tabular-nums">{wellhubTotalQty || '-'}</TableCell>
                        <TableCell className="text-center text-xs font-bold tabular-nums">{totalpassTotalQty || '-'}</TableCell>
                        <TableCell className="text-center text-xs font-bold tabular-nums">{entuspassTotalQty || '-'}</TableCell>
                        <TableCell className="text-center text-xs font-bold tabular-nums">{durTotal(durationTotals) + wellhubTotalQty + totalpassTotalQty + entuspassTotalQty}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* ── Tabela 2 — Receita por Duração (full width) ── */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Tabela 2 — Receita por Duração</CardTitle>
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
                        <TableHead className="text-center font-semibold text-xs whitespace-nowrap">Wellhub</TableHead>
                        <TableHead className="text-center font-semibold text-xs whitespace-nowrap">Total Pass</TableHead>
                        <TableHead className="text-center font-semibold text-xs whitespace-nowrap">Entuspass</TableHead>
                        <TableHead className="text-center font-semibold text-xs whitespace-nowrap">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {durationMonths.map(mc => {
                        const row = durationValByMonth[mc] || emptyDurationRow();
                        const wVal = wellhubByMonth[mc]?.val || 0;
                        const tpVal = totalpassByMonth[mc]?.val || 0;
                        const epVal = entuspassByMonth[mc]?.val || 0;
                        const rowTotal = durValTotal(row) + wVal + tpVal + epVal;
                        return (
                          <TableRow key={mc} className="hover:bg-muted/30">
                            <TableCell className="font-medium text-xs whitespace-nowrap">{formatMonth(mc)}</TableCell>
                            {DURATION_COLUMNS.map(c => (
                              <ClickableCurrencyCell
                                key={c.key}
                                value={row[c.key]}
                                title={`${c.label} — ${formatMonth(mc)}`}
                                items={lancamentosByMonthDuration[mc]?.[c.key] || []}
                              />
                            ))}
                            <TableCell className="text-center text-xs tabular-nums">
                              {wVal > 0 ? formatCurrency(wVal) : '-'}
                            </TableCell>
                            <TableCell className="text-center text-xs tabular-nums">
                              {tpVal > 0 ? formatCurrency(tpVal) : '-'}
                            </TableCell>
                            <ClickableCurrencyCell
                              value={epVal}
                              title={`Entuspass — ${formatMonth(mc)}`}
                              items={entuspassByMonth[mc]?.items || []}
                            />
                            <TableCell className="text-center font-semibold text-xs tabular-nums">{formatCurrency(rowTotal)}</TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-muted/50 font-bold border-t-2">
                        <TableCell className="text-xs font-bold">Total</TableCell>
                        {DURATION_COLUMNS.map(c => (
                          <TableCell key={c.key} className="text-center text-xs font-bold tabular-nums">
                            {durationValTotals[c.key] ? formatCurrency(durationValTotals[c.key]) : '-'}
                          </TableCell>
                        ))}
                        <TableCell className="text-center text-xs font-bold tabular-nums">{wellhubTotalVal > 0 ? formatCurrency(wellhubTotalVal) : '-'}</TableCell>
                        <TableCell className="text-center text-xs font-bold tabular-nums">{totalpassTotalVal > 0 ? formatCurrency(totalpassTotalVal) : '-'}</TableCell>
                        <TableCell className="text-center text-xs font-bold tabular-nums">{entuspassTotalVal > 0 ? formatCurrency(entuspassTotalVal) : '-'}</TableCell>
                        <TableCell className="text-center text-xs font-bold tabular-nums">{formatCurrency(durValTotal(durationValTotals) + wellhubTotalVal + totalpassTotalVal + entuspassTotalVal)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* ── Tabela 3 — Ticket Médio por Duração (full width) ── */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Tabela 3 — Ticket Médio por Duração</CardTitle>
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
                        <TableHead className="text-center font-semibold text-xs whitespace-nowrap">Wellhub</TableHead>
                        <TableHead className="text-center font-semibold text-xs whitespace-nowrap">Total Pass</TableHead>
                        <TableHead className="text-center font-semibold text-xs whitespace-nowrap">Entuspass</TableHead>
                        
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {durationMonths.map(mc => {
                        const qtyRow = durationByMonth[mc] || emptyDurationRow();
                        const valRow = durationValByMonth[mc] || emptyDurationRow();
                        const wQty = wellhubByMonth[mc]?.qty || 0;
                        const wVal = wellhubByMonth[mc]?.val || 0;
                        const tpQty = totalpassByMonth[mc]?.qty || 0;
                        const tpVal = totalpassByMonth[mc]?.val || 0;
                        const epQty = entuspassByMonth[mc]?.qty || 0;
                        const epVal = entuspassByMonth[mc]?.val || 0;
                        return (
                          <TableRow key={mc} className="hover:bg-muted/30">
                            <TableCell className="font-medium text-xs whitespace-nowrap">{formatMonth(mc)}</TableCell>
                            {DURATION_COLUMNS.map(c => (
                              <TableCell key={c.key} className="text-center text-xs tabular-nums">
                                {qtyRow[c.key] > 0 ? formatCurrency(valRow[c.key] / qtyRow[c.key]) : '-'}
                              </TableCell>
                            ))}
                            <TableCell className="text-center text-xs tabular-nums">
                              {wQty > 0 ? formatCurrency(wVal / wQty) : '-'}
                            </TableCell>
                            <TableCell className="text-center text-xs tabular-nums">
                              {tpQty > 0 ? formatCurrency(tpVal / tpQty) : '-'}
                            </TableCell>
                            <TableCell className="text-center text-xs tabular-nums">
                              {epQty > 0 ? formatCurrency(epVal / epQty) : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-muted/50 font-bold border-t-2">
                        <TableCell className="text-xs font-bold">Total</TableCell>
                        {DURATION_COLUMNS.map(c => (
                          <TableCell key={c.key} className="text-center text-xs font-bold tabular-nums">
                            {durationTotals[c.key] > 0 ? formatCurrency(durationValTotals[c.key] / durationTotals[c.key]) : '-'}
                          </TableCell>
                        ))}
                        <TableCell className="text-center text-xs font-bold tabular-nums">{wellhubTotalQty > 0 ? formatCurrency(wellhubTotalVal / wellhubTotalQty) : '-'}</TableCell>
                        <TableCell className="text-center text-xs font-bold tabular-nums">{totalpassTotalQty > 0 ? formatCurrency(totalpassTotalVal / totalpassTotalQty) : '-'}</TableCell>
                        <TableCell className="text-center text-xs font-bold tabular-nums">{entuspassTotalQty > 0 ? formatCurrency(entuspassTotalVal / entuspassTotalQty) : '-'}</TableCell>
                      </TableRow>
                      <TableRow className="bg-primary/5 border-t-2">
                        <TableCell className="text-xs font-bold">Valor Mensal</TableCell>
                        {DURATION_COLUMNS.map(c => {
                          const months = DURATION_MONTHS[c.key];
                          const ticket = durationTotals[c.key] > 0
                            ? durationValTotals[c.key] / durationTotals[c.key]
                            : 0;
                          return (
                            <TableCell key={c.key} className="text-center text-xs font-bold tabular-nums">
                              {months && ticket > 0 ? formatCurrency(ticket / months) : '-'}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center text-xs font-bold">-</TableCell>
                        <TableCell className="text-center text-xs font-bold">-</TableCell>
                        <TableCell className="text-center text-xs font-bold">-</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* ── Tabelas 4 e 5 — Recorrência (lado a lado) ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Tabela 4 — Recorrência Detalhada (qty) */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">Tabela 4 — Recorrência Detalhada</CardTitle>
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

              {/* Tabela 5 — Receita Recorrência (R$) */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">Tabela 5 — Receita Recorrência</CardTitle>
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
                          const rec = recurrenceValByMonth[mc] || { novo: 0, recorrencia: 0 };
                          return (
                            <TableRow key={mc} className="hover:bg-muted/30">
                              <TableCell className="font-medium text-xs whitespace-nowrap">{formatMonth(mc)}</TableCell>
                              <ClickableCurrencyCell
                                value={rec.novo}
                                title={`Novos — ${formatMonth(mc)}`}
                                items={lancamentosByMonthRecurrence[mc]?.novo || []}
                              />
                              <ClickableCurrencyCell
                                value={rec.recorrencia}
                                title={`Recorrência — ${formatMonth(mc)}`}
                                items={lancamentosByMonthRecurrence[mc]?.recorrencia || []}
                              />
                              <TableCell className="text-center font-semibold text-xs tabular-nums">{formatCurrency(rec.novo + rec.recorrencia)}</TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="bg-muted/50 font-bold border-t-2">
                          <TableCell className="text-xs font-bold">Total</TableCell>
                          <TableCell className="text-center text-xs font-bold tabular-nums">{recurrenceValTotals.novo ? formatCurrency(recurrenceValTotals.novo) : '-'}</TableCell>
                          <TableCell className="text-center text-xs font-bold tabular-nums">{recurrenceValTotals.recorrencia ? formatCurrency(recurrenceValTotals.recorrencia) : '-'}</TableCell>
                          <TableCell className="text-center text-xs font-bold tabular-nums">{formatCurrency(recurrenceValTotals.novo + recurrenceValTotals.recorrencia)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Tabela 6 — Fechamento de Caixa ── */}
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">Fechamento de Caixa</h2>
              <Input
                type="month"
                value={fechamentoMes}
                onChange={e => setFechamentoMes(e.target.value)}
                className="w-44"
              />
            </div>
            {empresaId && (
              <FechamentoCaixaTable empresaId={empresaId} mes={fechamentoMes} />
            )}

            {/* ── Meta Anual ── */}
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">Meta Anual</h2>
              <Input
                type="number"
                min={2020}
                max={2050}
                value={metaAnualAno}
                onChange={e => setMetaAnualAno(parseInt(e.target.value, 10) || new Date().getFullYear())}
                className="w-24"
              />
            </div>
            {empresaId && (
              <MetaAnualTable empresaId={empresaId} ano={metaAnualAno} />
            )}

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

      {/* Formulário Lançar Agregador */}
      <Dialog open={showAgregadorForm} onOpenChange={setShowAgregadorForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Lançar Pagamento Agregador</DialogTitle>
            <DialogDescription>Registre o recebimento mensal do agregador.</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto flex-1 space-y-6">
            {/* Registros existentes */}
            {agregadores && agregadores.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Registros existentes</h4>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold">Agregador</TableHead>
                      <TableHead className="text-xs font-semibold">Mês</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Valor</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Clientes</TableHead>
                      <TableHead className="text-xs font-semibold w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agregadores.map(a => (
                      <TableRow key={a.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs">{a.agregador}</TableCell>
                        <TableCell className="text-xs">{formatMonth(a.mes_referencia)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{formatCurrency(a.valor)}</TableCell>
                        <TableCell className="text-xs text-center">{a.quantidade_clientes}</TableCell>
                        <TableCell className="text-xs p-1 flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingId(a.id);
                              setFormAgregador(a.agregador);
                              setFormMesRef(a.mes_referencia);
                              setFormDataReceb(a.data_recebimento || '');
                              setFormValor(a.valor.toString().replace('.', ','));
                              setFormQtdClientes(a.quantidade_clientes.toString());
                              setFormObs(a.observacao || '');
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm('Excluir este registro?')) deleteAgregador.mutate(a.id);
                            }}
                            disabled={deleteAgregador.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Formulário novo registro */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="text-sm font-semibold text-muted-foreground">{editingId ? 'Editar registro' : 'Novo registro'}</h4>
              <div className="space-y-2">
                <Label>Agregador</Label>
                <Select value={formAgregador} onValueChange={setFormAgregador}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Wellhub">Wellhub</SelectItem>
                    <SelectItem value="Total Pass">Total Pass</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mês Referência</Label>
                <Input type="month" value={formMesRef} onChange={e => setFormMesRef(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data Recebimento</Label>
                <Input type="date" value={formDataReceb} onChange={e => setFormDataReceb(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input placeholder="18.902,50" value={formValor} onChange={e => setFormValor(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Qtd Clientes</Label>
                  <Input type="number" min="0" placeholder="0" value={formQtdClientes} onChange={e => setFormQtdClientes(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observação (opcional)</Label>
                <Textarea value={formObs} onChange={e => setFormObs(e.target.value)} rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAgregadorForm(false); resetForm(); }}>Cancelar</Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>Novo</Button>
            )}
            <Button
              onClick={() => insertAgregador.mutate()}
              disabled={!formMesRef || !formValor || insertAgregador.isPending}
            >
              {insertAgregador.isPending ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
