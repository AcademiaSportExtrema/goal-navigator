import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react';

export default function Ajustes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<'aprovado' | 'rejeitado'>('aprovado');
  const [comentario, setComentario] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: solicitacoes, isLoading } = useQuery({
    queryKey: ['all-solicitacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitacoes_ajuste')
        .select('*, consultoras(nome), lancamentos(numero_contrato, nome_cliente, produto, valor, resp_venda, resp_recebimento, data_lancamento, empresa)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const processMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId || !user) throw new Error('Dados incompletos');

      const sol = solicitacoes?.find((s: any) => s.id === selectedId);
      if (!sol) throw new Error('Solicitação não encontrada');

      // Update solicitação status
      const { error: err1 } = await supabase
        .from('solicitacoes_ajuste')
        .update({
          status: action,
          admin_comentario: comentario || null,
          admin_user_id: user.id,
        })
        .eq('id', selectedId);
      if (err1) throw err1;

      // If approved, update the lancamento
      if (action === 'aprovado') {
        const { error: err2 } = await supabase
          .from('lancamentos')
          .update({
            resp_recebimento: sol.resp_recebimento_novo,
            consultora_chave: sol.resp_recebimento_novo,
          })
          .eq('id', sol.lancamento_id);
        if (err2) throw err2;
      }
    },
    onSuccess: () => {
      toast({ title: action === 'aprovado' ? 'Solicitação aprovada!' : 'Solicitação rejeitada.' });
      setDialogOpen(false);
      setComentario('');
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ['all-solicitacoes'] });
      // Invalidar dados de vendas que dependem de consultora_chave
      queryClient.invalidateQueries({ queryKey: ['lancamentos-meta'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-lancamentos'] });
      queryClient.invalidateQueries({ queryKey: ['metas-lancamentos'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao processar', description: error.message, variant: 'destructive' });
    },
  });

  const pendentes = solicitacoes?.filter((s: any) => s.status === 'pendente') || [];
  const processadas = solicitacoes?.filter((s: any) => s.status !== 'pendente') || [];

  const openDialog = (id: string, act: 'aprovado' | 'rejeitado') => {
    setSelectedId(id);
    setAction(act);
    setComentario('');
    setDialogOpen(true);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case 'aprovado':
        return <Badge className="gap-1 bg-primary text-primary-foreground"><CheckCircle className="h-3 w-3" /> Aprovado</Badge>;
      case 'rejeitado':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number | null) =>
    value != null ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-';

  const renderTable = (items: any[], showActions: boolean) => (
    <div className="border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Consultora</TableHead>
            <TableHead>Contrato</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>De</TableHead>
            <TableHead>Para</TableHead>
            <TableHead>Justificativa</TableHead>
            <TableHead>Status</TableHead>
            {showActions && <TableHead>Ações</TableHead>}
            {!showActions && <TableHead>Comentário</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 11 : 11} className="text-center text-muted-foreground py-8">
                Nenhuma solicitação {showActions ? 'pendente' : 'processada'}.
              </TableCell>
            </TableRow>
          ) : (
            items.map((sol: any) => (
              <TableRow key={sol.id}>
                <TableCell className="text-xs whitespace-nowrap">
                  {new Date(sol.created_at).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>{sol.consultoras?.nome || '-'}</TableCell>
                <TableCell className="font-mono text-xs">{sol.lancamentos?.numero_contrato || '-'}</TableCell>
                <TableCell>{sol.lancamentos?.nome_cliente || '-'}</TableCell>
                <TableCell>{sol.lancamentos?.produto || '-'}</TableCell>
                <TableCell>{formatCurrency(sol.lancamentos?.valor)}</TableCell>
                <TableCell>{sol.resp_recebimento_atual || '-'}</TableCell>
                <TableCell className="font-medium">{sol.resp_recebimento_novo}</TableCell>
                <TableCell className="text-xs max-w-[200px] truncate" title={sol.justificativa}>
                  {sol.justificativa}
                </TableCell>
                <TableCell>{statusBadge(sol.status)}</TableCell>
                {showActions ? (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="text-primary" onClick={() => openDialog(sol.id, 'aprovado')}>
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => openDialog(sol.id, 'rejeitado')}>
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                ) : (
                  <TableCell className="text-xs">{sol.admin_comentario || '-'}</TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <AppLayout title="Ajustes de Comissão">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Ajustes de Comissão</h1>
          {pendentes.length > 0 && (
            <Badge variant="destructive" className="text-sm">
              {pendentes.length} pendente{pendentes.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <Tabs defaultValue="pendentes">
          <TabsList>
            <TabsTrigger value="pendentes" className="gap-2">
              <Clock className="h-4 w-4" /> Pendentes ({pendentes.length})
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <MessageSquare className="h-4 w-4" /> Histórico ({processadas.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pendentes" className="mt-4">
            {renderTable(pendentes, true)}
          </TabsContent>
          <TabsContent value="historico" className="mt-4">
            {renderTable(processadas, false)}
          </TabsContent>
        </Tabs>

        {/* Approval/Rejection Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {action === 'aprovado' ? 'Aprovar Solicitação' : 'Rejeitar Solicitação'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {action === 'aprovado'
                  ? 'Ao aprovar, o responsável pelo recebimento será atualizado no lançamento.'
                  : 'Informe o motivo da rejeição (opcional).'}
              </p>
              <div>
                <label className="text-sm font-medium">Comentário</label>
                <Textarea
                  placeholder="Comentário (opcional)..."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button
                variant={action === 'aprovado' ? 'default' : 'destructive'}
                onClick={() => processMutation.mutate()}
                disabled={processMutation.isPending}
              >
                {processMutation.isPending
                  ? 'Processando...'
                  : action === 'aprovado'
                  ? 'Confirmar Aprovação'
                  : 'Confirmar Rejeição'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
