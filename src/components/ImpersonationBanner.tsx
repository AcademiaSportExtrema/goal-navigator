import { useImpersonation } from '@/hooks/useImpersonation';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';

export function ImpersonationBanner() {
  const { isImpersonating, targetEmail, targetRole, endImpersonation } = useImpersonation();

  if (!isImpersonating) return null;

  const roleLabel = targetRole === 'admin' ? 'Admin' : targetRole === 'consultora' ? 'Consultora' : targetRole;

  return (
    <>
      <div className="h-10" /> {/* Spacer */}
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4" />
          <span>
            Você está impersonando <strong>{targetEmail}</strong> ({roleLabel})
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={endImpersonation}
          className="border-destructive-foreground/30 text-destructive-foreground hover:bg-destructive-foreground/10 hover:text-destructive-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Encerrar
        </Button>
      </div>
    </>
  );
}
