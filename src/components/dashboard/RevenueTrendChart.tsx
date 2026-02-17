import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { RevenueByDay } from '@/hooks/useSalesMetrics';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatCompact = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(v);

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm space-y-1">
      <p className="font-semibold">{label}</p>
      <p>Receita: {formatCurrency(d.receita)}</p>
      <p>Acumulado: {formatCurrency(d.acumulado)}</p>
      <p>Pedidos: {d.pedidos}</p>
      <p>Ticket Médio: {formatCurrency(d.ticketMedio)}</p>
    </div>
  );
}

interface Props {
  data: RevenueByDay[];
}

export function RevenueTrendChart({ data }: Props) {
  const [mode, setMode] = useState<'diario' | 'acumulado'>('diario');

  const formatDay = (d: string) => {
    const parts = d.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Tendência de Receita</CardTitle>
        <div className="flex gap-1">
          <Button
            variant={mode === 'diario' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setMode('diario')}
          >
            Diário
          </Button>
          <Button
            variant={mode === 'acumulado' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setMode('acumulado')}
          >
            Acumulado
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" tickFormatter={formatDay} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey={mode === 'diario' ? 'receita' : 'acumulado'}
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível
          </div>
        )}
      </CardContent>
    </Card>
  );
}
