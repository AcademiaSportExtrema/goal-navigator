import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CobrancaStatus = "pendente" | "em_contato" | "pago" | null | undefined;

const statusConfig: Record<NonNullable<CobrancaStatus>, { label: string; variant: BadgeProps["variant"] }> = {
  pendente: { label: "Pendente", variant: "outline" },
  em_contato: { label: "Em contato", variant: "secondary" },
  pago: { label: "Pago", variant: "default" },
};

export function getCobrancaStatusLabel(status: CobrancaStatus) {
  return statusConfig[status ?? "pendente"]?.label ?? statusConfig.pendente.label;
}

export function CobrancaStatusBadge({ status, className }: { status: CobrancaStatus; className?: string }) {
  const config = statusConfig[status ?? "pendente"] ?? statusConfig.pendente;

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  );
}
