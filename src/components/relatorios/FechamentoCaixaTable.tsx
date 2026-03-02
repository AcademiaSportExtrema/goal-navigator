import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportToCSV } from '@/lib/csv';
import { toast } from 'sonner';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PAYMENT_COLS = [
  { key: 'CARTÃO RECORRENTE', label: 'Cartão Recorrente' },
  { key: 'PIX INTER', label: 'PIX Inter' },
  { key: 'CARTÃO DE CRÉDITO', label: 'Cartão de Crédito' },
  { key: 'PIX SICRED', label: 'PIX Sicred CNPJ' },
  { key: 'DINHEIRO', label: 'Dinheiro' },
  { key: 'CARTÃO DE DÉBITO', label: 'Cartão de Débito' },
];

const PIX_KEYS = ['PIX INTER', 'PIX SICRED'];

function matchPayment(forma: string | null, key: string): boolean {
  if (!forma) return false;
  const upper = forma.toUpperCase();
  if (key === 'PIX SICRED') return upper.includes('PIX SICRED');
  return upper === key;
}

function fmtCur(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface Props {
  empresaId: string;
  mes: string; // yyyy-MM
}

interface F360Row {
  id: string;
  data: string;
  valor_f360: number;
  valor_pix_f360: number;
}

export function FechamentoCaixaTable({ empresaId, mes }: Props) {
  const queryClient = useQueryClient();
  const [year, month] = mes.split('-').map(Number);
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);
  const days = eachDayOfInterval({ start, end });
  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');

  // Lancamentos for this month
  const { data: lancamentos } = useQuery({
    queryKey: ['fechamento-lancamentos', empresaId, mes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('data_lancamento, forma_pagamento, valor, data_inicio, data_termino')
        .eq('empresa_id', empresaId)
        .gte('data_lancamento', startStr)
        .lte('data_lancamento', endStr);
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaId,
  });

  // F360 manual values
  const { data: f360Data } = useQuery({
    queryKey: ['fechamento-f360', empresaId, mes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fechamento_caixa_f360' as any)
        .select('*')
        .eq('empresa_id', empresaId)
        .gte('data', startStr)
        .lte('data', endStr);
      if (error) throw error;
      return (data || []) as unknown as F360Row[];
    },
    enabled: !!empresaId,
  });

  const upsertF360 = useMutation({
    mutationFn: async (params: { data: string; field: 'valor_f360' | 'valor_pix_f360'; value: number }) => {
      const { error } = await supabase
        .from('fechamento_caixa_f360' as any)
        .upsert(
          { empresa_id: empresaId, data: params.data, [params.field]: params.value } as any,
          { onConflict: 'empresa_id,data' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fechamento-f360', empresaId, mes] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar'),
  });

  const f360Map = useMemo(() => {
    const map: Record<string, F360Row> = {};
    if (f360Data) for (const r of f360Data) map[r.data] = r;
    return map;
  }, [f360Data]);

  // Aggregate lancamentos by day and payment
  const dailyData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    const inicioFimMap: Record<string, { minInicio: string | null; maxFim: string | null }> = {};
    if (!lancamentos) return { map, inicioFimMap };
    for (const l of lancamentos) {
      const d = l.data_lancamento;
      if (!d) continue;
      if (!map[d]) {
        map[d] = {};
        inicioFimMap[d] = { minInicio: null, maxFim: null };
      }
      for (const col of PAYMENT_COLS) {
        if (matchPayment(l.forma_pagamento, col.key)) {
          map[d][col.key] = (map[d][col.key] || 0) + (l.valor || 0);
        }
      }
      // Track inicio/fim
      if (l.data_inicio) {
        if (!inicioFimMap[d].minInicio || l.data_inicio < inicioFimMap[d].minInicio!)
          inicioFimMap[d].minInicio = l.data_inicio;
      }
      if (l.data_termino) {
        if (!inicioFimMap[d].maxFim || l.data_termino > inicioFimMap[d].maxFim!)
          inicioFimMap[d].maxFim = l.data_termino;
      }
    }
    return { map, inicioFimMap };
  }, [lancamentos]);

  // Totals
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    let totalAll = 0, totalPix = 0, totalF360 = 0, totalPixF360 = 0;
    for (const day of days) {
      const ds = format(day, 'yyyy-MM-dd');
      let dayTotal = 0;
      let dayPix = 0;
      for (const col of PAYMENT_COLS) {
        const v = dailyData.map[ds]?.[col.key] || 0;
        t[col.key] = (t[col.key] || 0) + v;
        dayTotal += v;
        if (PIX_KEYS.some(pk => col.key.includes(pk.replace('PIX ', '')))) {
          // Check if this is a PIX column
        }
        if (col.key === 'PIX INTER' || col.key === 'PIX SICRED') {
          dayPix += v;
        }
      }
      totalAll += dayTotal;
      totalPix += dayPix;
      totalF360 += f360Map[ds]?.valor_f360 || 0;
      totalPixF360 += f360Map[ds]?.valor_pix_f360 || 0;
    }
    return { byPayment: t, totalAll, totalPix, totalF360, totalPixF360 };
  }, [days, dailyData, f360Map]);

  const handleExportCSV = useCallback(() => {
    const rows = days.map(day => {
      const ds = format(day, 'yyyy-MM-dd');
      const dayNum = format(day, 'dd');
      const dayName = DAY_NAMES[getDay(day)];
      const paymentValues: Record<string, unknown> = {};
      let total = 0;
      let totalPix = 0;
      for (const col of PAYMENT_COLS) {
        const v = dailyData.map[ds]?.[col.key] || 0;
        paymentValues[col.label] = v;
        total += v;
        if (col.key === 'PIX INTER' || col.key === 'PIX SICRED') totalPix += v;
      }
      const f = f360Map[ds];
      return {
        Dia: dayNum,
        'Dia Semana': dayName,
        ...paymentValues,
        Total: total,
        F360: f?.valor_f360 || 0,
        'Dif': total - (f?.valor_f360 || 0),
        'Total PIX': totalPix,
        'PIX F360': f?.valor_pix_f360 || 0,
        'Dif PIX': totalPix - (f?.valor_pix_f360 || 0),
      };
    });
    exportToCSV(rows, `fechamento-caixa-${mes}.csv`);
  }, [days, dailyData, f360Map, mes]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Auditoria do Fechamento de Caixa — {format(start, 'MMMM yyyy', { locale: ptBR })}</CardTitle>
        <Button size="sm" variant="outline" onClick={handleExportCSV} className="gap-1">
          <Download className="h-4 w-4" /> CSV
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold whitespace-nowrap">Dia</TableHead>
                <TableHead className="text-xs font-semibold whitespace-nowrap">Dia Semana</TableHead>
                {PAYMENT_COLS.map(c => (
                  <TableHead key={c.key} className="text-xs font-semibold whitespace-nowrap text-right">{c.label}</TableHead>
                ))}
                <TableHead className="text-xs font-semibold whitespace-nowrap text-right bg-muted">Total</TableHead>
                <TableHead className="text-xs font-semibold whitespace-nowrap text-right bg-yellow-50 dark:bg-yellow-900/20">F360</TableHead>
                <TableHead className="text-xs font-semibold whitespace-nowrap text-right">Dif</TableHead>
                <TableHead className="text-xs font-semibold whitespace-nowrap text-right bg-muted">Total PIX</TableHead>
                <TableHead className="text-xs font-semibold whitespace-nowrap text-right bg-yellow-50 dark:bg-yellow-900/20">PIX F360</TableHead>
                <TableHead className="text-xs font-semibold whitespace-nowrap text-right">Dif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map(day => {
                const ds = format(day, 'yyyy-MM-dd');
                const dayNum = format(day, 'dd');
                const dayName = DAY_NAMES[getDay(day)];
                const isSunday = getDay(day) === 0;
                let dayTotal = 0;
                let dayPix = 0;
                const cells = PAYMENT_COLS.map(col => {
                  const v = dailyData.map[ds]?.[col.key] || 0;
                  dayTotal += v;
                  if (col.key === 'PIX INTER' || col.key === 'PIX SICRED') dayPix += v;
                  return v;
                });
                const f = f360Map[ds];
                const f360Val = f?.valor_f360 || 0;
                const pixF360Val = f?.valor_pix_f360 || 0;
                const dif = dayTotal - f360Val;
                const difPix = dayPix - pixF360Val;

                return (
                  <TableRow key={ds} className={isSunday ? 'bg-muted/30' : ''}>
                    <TableCell className="text-xs font-medium tabular-nums">{dayNum}</TableCell>
                    <TableCell className="text-xs">{dayName}</TableCell>
                    {cells.map((v, i) => (
                      <TableCell key={i} className="text-right text-xs tabular-nums">
                        {v > 0 ? fmtCur(v) : '-'}
                      </TableCell>
                    ))}
                    <TableCell className="text-right text-xs tabular-nums font-semibold bg-muted/30">{dayTotal > 0 ? fmtCur(dayTotal) : '-'}</TableCell>
                    <EditableCell
                      value={f360Val}
                      onSave={(val) => upsertF360.mutate({ data: ds, field: 'valor_f360', value: val })}
                    />
                    <TableCell className={`text-right text-xs tabular-nums font-medium ${dif > 0 ? 'text-green-600' : dif < 0 ? 'text-red-600' : 'text-foreground'}`}>
                      {dayTotal > 0 || f360Val > 0 ? fmtCur(dif) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums font-semibold bg-muted/30">{dayPix > 0 ? fmtCur(dayPix) : '-'}</TableCell>
                    <EditableCell
                      value={pixF360Val}
                      onSave={(val) => upsertF360.mutate({ data: ds, field: 'valor_pix_f360', value: val })}
                    />
                    <TableCell className={`text-right text-xs tabular-nums font-medium ${difPix > 0 ? 'text-green-600' : difPix < 0 ? 'text-red-600' : 'text-foreground'}`}>
                      {dayPix > 0 || pixF360Val > 0 ? fmtCur(difPix) : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="font-semibold">
                <TableCell className="text-xs">Total</TableCell>
                <TableCell />
                {PAYMENT_COLS.map(col => (
                  <TableCell key={col.key} className="text-right text-xs tabular-nums">
                    {(totals.byPayment[col.key] || 0) > 0 ? fmtCur(totals.byPayment[col.key] || 0) : '-'}
                  </TableCell>
                ))}
                <TableCell className="text-right text-xs tabular-nums bg-muted/30">{fmtCur(totals.totalAll)}</TableCell>
                <TableCell className="text-right text-xs tabular-nums bg-yellow-50 dark:bg-yellow-900/20">{fmtCur(totals.totalF360)}</TableCell>
                <TableCell className={`text-right text-xs tabular-nums ${totals.totalAll - totals.totalF360 > 0 ? 'text-green-600' : totals.totalAll - totals.totalF360 < 0 ? 'text-red-600' : 'text-foreground'}`}>
                  {fmtCur(totals.totalAll - totals.totalF360)}
                </TableCell>
                <TableCell className="text-right text-xs tabular-nums bg-muted/30">{fmtCur(totals.totalPix)}</TableCell>
                <TableCell className="text-right text-xs tabular-nums bg-yellow-50 dark:bg-yellow-900/20">{fmtCur(totals.totalPixF360)}</TableCell>
                <TableCell className={`text-right text-xs tabular-nums ${totals.totalPix - totals.totalPixF360 > 0 ? 'text-green-600' : totals.totalPix - totals.totalPixF360 < 0 ? 'text-red-600' : 'text-foreground'}`}>
                  {fmtCur(totals.totalPix - totals.totalPixF360)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Inline editable cell for f360 values
function EditableCell({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  const startEdit = () => {
    setText(value > 0 ? value.toFixed(2).replace('.', ',') : '');
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const parsed = parseFloat(text.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(parsed) && parsed !== value) {
      onSave(parsed);
    }
  };

  if (editing) {
    return (
      <TableCell className="text-right p-1 bg-yellow-50 dark:bg-yellow-900/20">
        <input
          autoFocus
          className="w-24 text-xs text-right border rounded px-1 py-0.5 bg-background"
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        />
      </TableCell>
    );
  }

  return (
    <TableCell
      className="text-right text-xs tabular-nums cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 bg-yellow-50 dark:bg-yellow-900/20"
      onClick={startEdit}
    >
      {value > 0 ? fmtCur(value) : <span className="text-muted-foreground">—</span>}
    </TableCell>
  );
}
