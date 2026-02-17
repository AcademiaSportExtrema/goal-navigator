import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { SalesByPlan } from '@/hooks/useSalesMetrics';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface Props {
  data: SalesByPlan[];
}

export function PlanSalesTable({ data }: Props) {
  const totalReceita = data.reduce((s, d) => s + d.receita, 0);
  const totalPedidos = data.reduce((s, d) => s + d.pedidos, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Planos Vendidos</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{d.plano}</TableCell>
                  <TableCell className="text-right">{d.pedidos}</TableCell>
                  <TableCell className="text-right">{formatCurrency(d.receita)}</TableCell>
                  <TableCell className="text-right">{d.percentual.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{totalPedidos}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalReceita)}</TableCell>
                <TableCell className="text-right">100%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível
          </div>
        )}
      </CardContent>
    </Card>
  );
}
