import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { TicketBin } from '@/hooks/useSalesMetrics';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm space-y-1">
      <p className="font-semibold">{label}</p>
      <p>Lançamentos: {payload[0]?.value}</p>
    </div>
  );
}

interface Props {
  data: TicketBin[];
  ticketMedio: number;
}

export function TicketHistogram({ data, ticketMedio }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Distribuição de Ticket</CardTitle>
        <span className="text-sm text-muted-foreground">
          Ticket Médio: <strong className="text-foreground">{formatCurrency(ticketMedio)}</strong>
        </span>
      </CardHeader>
      <CardContent>
        {data.some(d => d.contagem > 0) ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="faixa" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="contagem" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível
          </div>
        )}
      </CardContent>
    </Card>
  );
}
