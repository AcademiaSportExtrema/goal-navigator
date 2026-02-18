import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Plus, Building, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle }> = {
  active: { label: 'Ativa', variant: 'default', icon: CheckCircle },
  past_due: { label: 'Inadimplente', variant: 'destructive', icon: XCircle },
  canceled: { label: 'Cancelada', variant: 'secondary', icon: XCircle },
  trialing: { label: 'Trial', variant: 'outline', icon: Clock },
};

export default function Empresas() {
  const queryClient = useQueryClient();

  const { data: empresas, isLoading } = useQuery({
    queryKey: ['empresas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo, nome }: { id: string; ativo: boolean; nome: string }) => {
      const { error } = await supabase
        .from('empresas')
        .update({ ativo })
        .eq('id', id);
      if (error) throw error;
      // Audit log
      await supabase.functions.invoke('audit-log', {
        body: {
          action: 'empresa.toggle_ativo',
          target_table: 'empresas',
          target_id: id,
          empresa_id: id,
          metadata: { ativo, nome },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast.success('Empresa atualizada');
    },
  });

  return (
    <AppLayout title="Empresas">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
            <p className="text-muted-foreground">Gerencie as empresas cadastradas na plataforma</p>
          </div>
          <Button asChild>
            <Link to="/super-admin/empresa/nova">
              <Plus className="h-4 w-4 mr-2" />
              Nova Empresa
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-5 w-5" />
              Todas as Empresas ({empresas?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ativa</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresas?.map((empresa) => {
                    const status = statusConfig[empresa.subscription_status] || statusConfig.active;
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={empresa.id}>
                        <TableCell className="font-medium">{empresa.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{empresa.slug}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
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
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link to={`/super-admin/empresas/${empresa.id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              Detalhes
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAtivo.mutate({ id: empresa.id, ativo: !empresa.ativo, nome: empresa.nome })}
                          >
                            {empresa.ativo ? 'Desativar' : 'Ativar'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
