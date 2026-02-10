import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Building, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function Financeiro() {
  const { data: empresas, isLoading } = useQuery({
    queryKey: ['empresas-financeiro'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  const ativas = empresas?.filter(e => e.subscription_status === 'active').length ?? 0;
  const inadimplentes = empresas?.filter(e => e.subscription_status === 'past_due').length ?? 0;
  const canceladas = empresas?.filter(e => e.subscription_status === 'canceled').length ?? 0;

  return (
    <AppLayout title="Financeiro">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground">Visão geral das assinaturas das empresas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{ativas}</p>
                  <p className="text-sm text-muted-foreground">Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inadimplentes}</p>
                  <p className="text-sm text-muted-foreground">Inadimplentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{canceladas}</p>
                  <p className="text-sm text-muted-foreground">Canceladas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Status por Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status Assinatura</TableHead>
                    <TableHead>Ativa</TableHead>
                    <TableHead>Criada em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresas?.map((empresa) => (
                    <TableRow key={empresa.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        {empresa.nome}
                      </TableCell>
                      <TableCell>
                        <Badge variant={empresa.subscription_status === 'active' ? 'default' : 'destructive'}>
                          {empresa.subscription_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={empresa.ativo ? 'default' : 'secondary'}>
                          {empresa.ativo ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(empresa.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
