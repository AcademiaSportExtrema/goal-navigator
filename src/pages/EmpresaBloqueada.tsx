import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, LogOut, Mail } from 'lucide-react';

export default function EmpresaBloqueada() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Acesso Suspenso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            A assinatura da sua empresa está inativa. Entre em contato com o administrador
            da plataforma para regularizar o acesso.
          </p>
          <div className="flex flex-col gap-2">
            <Button variant="outline" asChild>
              <a href="mailto:suporte@example.com">
                <Mail className="h-4 w-4 mr-2" />
                Entrar em Contato
              </a>
            </Button>
            <Button variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
