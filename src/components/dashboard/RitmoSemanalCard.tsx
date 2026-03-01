import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RitmoSemanalCardProps {
  semanaAtual: number;
  metaEsperadaValor: number;
  metaEsperadaPercent: number;
  vendido: number;
  percentualDoEsperado: number;
  status: 'adiantada' | 'no_ritmo' | 'atrasada';
  metaTotal: number;
  /** Show motivational message for consultora view */
  motivacional?: boolean;
}

const statusConfig = {
  adiantada: {
    label: 'Adiantada',
    color: 'text-success',
    borderColor: 'border-l-green-500',
    icon: TrendingUp,
    mensagem: '🚀 Ótimo ritmo! Continue assim que a meta está no caminho!',
  },
  no_ritmo: {
    label: 'No Ritmo',
    color: 'text-primary',
    borderColor: 'border-l-blue-500',
    icon: Minus,
    mensagem: '👍 Você está no ritmo certo. Mantenha o foco!',
  },
  atrasada: {
    label: 'Atrasada',
    color: 'text-destructive',
    borderColor: 'border-l-red-500',
    icon: TrendingDown,
    mensagem: '⚡ Hora de acelerar! Foque nos clientes mais quentes para recuperar o ritmo.',
  },
};

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function RitmoSemanalCard({
  semanaAtual,
  metaEsperadaValor,
  metaEsperadaPercent,
  vendido,
  percentualDoEsperado,
  status,
  metaTotal,
  motivacional = false,
}: RitmoSemanalCardProps) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  const progressValue = Math.min(percentualDoEsperado, 100);

  return (
    <Card className={`border-l-4 ${cfg.borderColor} hover:shadow-md transition-all`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Ritmo Semanal — Semana {semanaAtual}
        </CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${cfg.color}`} />
          <span className={`text-lg font-bold ${cfg.color}`}>{cfg.label}</span>
          <span className="text-sm text-muted-foreground ml-auto">
            {percentualDoEsperado.toFixed(0)}% do esperado
          </span>
        </div>

        <Progress value={progressValue} className="h-3" />

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Vendido:</span>
            <span className="ml-1 font-medium">{fmt(vendido)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Esperado agora:</span>
            <span className="ml-1 font-medium">{fmt(metaEsperadaValor)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Meta total:</span>
            <span className="ml-1 font-medium">{fmt(metaTotal)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Progresso esperado:</span>
            <span className="ml-1 font-medium">{metaEsperadaPercent.toFixed(0)}%</span>
          </div>
        </div>

        {motivacional && (
          <p className="text-sm text-muted-foreground border-t pt-2 mt-1">
            {cfg.mensagem}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
