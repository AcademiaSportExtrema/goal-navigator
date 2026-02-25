import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted-foreground))',
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm space-y-1">
      <p className="font-semibold">{d.nome}</p>
      <p>Vendido: {formatCurrency(d.vendido)}</p>
      <p>Participação: {d.percentual.toFixed(1)}%</p>
    </div>
  );
}

interface ConsultoraShare {
  nome: string;
  vendido: number;
  percentual: number;
}

interface Props {
  data: ConsultoraShare[];
}

export function ConsultoraShareChart({ data }: Props) {
  // Top 5 + "Outras"
  const chartData = (() => {
    if (data.length <= 6) return data;
    const top5 = data.slice(0, 5);
    const outras = data.slice(5);
    const outrasTotal = outras.reduce((acc, c) => acc + c.vendido, 0);
    const outrasPercent = outras.reduce((acc, c) => acc + c.percentual, 0);
    return [...top5, { nome: 'Outras', vendido: outrasTotal, percentual: outrasPercent }];
  })();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Participação por Consultora</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="vendido"
                nameKey="nome"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                label={({ nome, percentual }) =>
                  `${nome.length > 12 ? nome.substring(0, 12) + '…' : nome} ${percentual.toFixed(0)}%`
                }
                labelLine={{ strokeWidth: 1 }}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
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
