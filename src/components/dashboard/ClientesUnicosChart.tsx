import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { exportToCSV } from '@/lib/csv';

interface ClienteUnicoData {
  nome: string;
  clientes: number;
}

interface ClienteDetalhe {
  consultora: string;
  cliente: string;
  data_inicio: string;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm space-y-1">
      <p className="font-semibold">{d.nome}</p>
      <p>{d.clientes} cliente{d.clientes !== 1 ? 's' : ''} único{d.clientes !== 1 ? 's' : ''}</p>
    </div>
  );
}

interface Props {
  data: ClienteUnicoData[];
  detalhes: ClienteDetalhe[];
  mesSelecionado: string;
}

export function ClientesUnicosChart({ data, detalhes, mesSelecionado }: Props) {
  const handleExport = () => {
    if (detalhes.length === 0) return;
    exportToCSV(
      detalhes.map(d => ({
        Consultora: d.consultora,
        Cliente: d.cliente,
        'Data Início': d.data_inicio,
      })),
      `clientes-atendidos-${mesSelecionado}.csv`
    );
  };

  const barHeight = 36;
  const chartHeight = Math.max(200, data.length * barHeight + 40);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Clientes Atendidos por Consultora</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Exportar CSV"
          onClick={handleExport}
          disabled={detalhes.length === 0}
        >
          <Download className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="nome"
                width={110}
                tick={{ fontSize: 12 }}
                tickFormatter={(v: string) => v.length > 14 ? v.substring(0, 14) + '…' : v}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="clientes" radius={[0, 4, 4, 0]} maxBarSize={28}>
                {data.map((_, i) => (
                  <Cell key={i} fill={`hsl(var(--chart-${(i % 5) + 1}))`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível
          </div>
        )}
      </CardContent>
    </Card>
  );
}
