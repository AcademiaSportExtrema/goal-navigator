import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, TrendingUp, TrendingDown, Minus, CheckCircle2 } from 'lucide-react';
import type { SemanaDetalhe } from '@/hooks/useMetaSemanal';

interface RitmoSemanalCardProps {
  semanas: SemanaDetalhe[];
  /** Show motivational message for consultora view */
  motivacional?: boolean;
  status: 'adiantada' | 'no_ritmo' | 'atrasada';
}

const statusConfig = {
  adiantada: {
    mensagem: '🚀 Ótimo ritmo! Continue assim que a meta está no caminho!',
  },
  no_ritmo: {
    mensagem: '👍 Você está no ritmo certo. Mantenha o foco!',
  },
  atrasada: {
    mensagem: '⚡ Hora de acelerar! Foque nos clientes mais quentes para recuperar o ritmo.',
  },
};

const semanaStatusStyle: Record<SemanaDetalhe['status'], string> = {
  bateu: 'bg-green-50 border-green-300 dark:bg-green-950/40 dark:border-green-700',
  no_ritmo: 'bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-700',
  atrasada: 'bg-red-50 border-red-300 dark:bg-red-950/40 dark:border-red-700',
  futura: 'bg-muted/30 border-border opacity-60',
};

const semanaStatusIcon: Record<SemanaDetalhe['status'], React.ReactNode> = {
  bateu: <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />,
  no_ritmo: <Minus className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
  atrasada: <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />,
  futura: <Clock className="h-4 w-4 text-muted-foreground" />,
};

const semanaStatusLabel: Record<SemanaDetalhe['status'], string> = {
  bateu: '✅ Bateu',
  no_ritmo: '🔶 Quase',
  atrasada: '🔴 Falta',
  futura: '⏳ Futuro',
};

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(v);

export function RitmoSemanalCard({
  semanas,
  motivacional = false,
  status,
}: RitmoSemanalCardProps) {
  const gridCols = semanas.length === 5 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Ritmo Semanal
        </CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`grid ${gridCols} gap-2`}>
          {semanas.map(s => (
            <div
              key={s.semana}
              className={`rounded-lg border p-3 text-center transition-all ${
                s.isCurrent
                  ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/30'
                  : semanaStatusStyle[s.status]
              }`}
            >
              <div className="font-bold text-sm">Semana {s.semana}</div>
              <div className={`text-xs ${s.isCurrent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                dias {s.diasLabel}
              </div>
              <div className={`text-xs ${s.isCurrent ? 'text-primary-foreground/60' : 'text-muted-foreground/80'}`}>
                ({s.pesoPercent}% da meta)
              </div>

              <div className="mt-2 space-y-0.5">
                <div className={`text-xs ${s.isCurrent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  Meta: {fmt(s.metaValor)}
                </div>
                <div className="text-base font-bold">
                  {fmt(s.vendido)}
                </div>
                <div className={`text-sm font-semibold ${
                  s.isCurrent
                    ? 'text-primary-foreground'
                    : s.percentual >= 100
                      ? 'text-green-600 dark:text-green-400'
                      : s.percentual >= 90
                        ? 'text-amber-600 dark:text-amber-400'
                        : s.status === 'futura'
                          ? 'text-muted-foreground'
                          : 'text-red-600 dark:text-red-400'
                }`}>
                  {s.percentual.toFixed(0)}%
                </div>
              </div>

              <div className={`mt-1 flex items-center justify-center gap-1 text-xs font-medium ${
                s.isCurrent ? 'text-primary-foreground/80' : ''
              }`}>
                {!s.isCurrent && semanaStatusIcon[s.status]}
                <span>{semanaStatusLabel[s.status]}</span>
              </div>
            </div>
          ))}
        </div>

        {motivacional && (
          <p className="text-sm text-muted-foreground border-t pt-2 mt-1">
            {statusConfig[status].mensagem}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
