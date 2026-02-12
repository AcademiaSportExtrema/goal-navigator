import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, Send, Clock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

interface LancamentoSearch {
  id: string;
  produto: string | null;
  nome_cliente: string | null;
  numero_contrato: string | null;
  resp_venda: string | null;
  resp_recebimento: string | null;
  valor: number | null;
  data_lancamento: string | null;
  empresa: string | null;
  plano: string | null;
}

export default function SolicitarAjuste() {
  const { user, empresaId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLancamento, setSelectedLancamento] = useState<LancamentoSearch | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Get consultora info
  const { data: userRole } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('consultora_id')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: consultora } = useQuery({
    queryKey: ['consultora-info', userRole?.consultora_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consultoras')
        .select('id, nome')
        .eq('id', userRole!.consultora_id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userRole?.consultora_id,
  });

  // Search lancamentos using security definer function
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['search-lancamentos-ajuste', searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_lancamentos_for_ajuste', {
        _search: searchQuery,
        _limit: 20,
      });
      if (error) throw error;
      return (data || []) as LancamentoSearch[];
    },
    enabled: searchQuery.length >= 2,
  });

  // Get existing solicitações
  const { data: solicitacoes } = useQuery({
    queryKey: ['minhas-solicitacoes', consultora?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitacoes_ajuste')
        .select('*, lancamentos(numero_contrato, nome_cliente, produto, valor)')
        .eq('consultora_id', consultora!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!consultora?.id,
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLancamento || !consultora) throw new Error('Dados incompletos');
      const { error } = await supabase.from('solicitacoes_ajuste').insert({
        lancamento_id: selectedLancamento.id,
        consultora_id: consultora.id,
        resp_recebimento_atual: selectedLancamento.resp_recebimento || '',
        resp_recebimento_novo: consultora.nome,
        justificativa,
        empresa_id: empresaId!,
        numero_contrato: selectedLancamento.numero_contrato || null,
        nome_cliente: selectedLancamento.nome_cliente || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Solicitação enviada com sucesso!' });
      setDialogOpen(false);
      setSelectedLancamento(null);
      setJustificativa('');
      queryClient.invalidateQueries({ queryKey: ['minhas-solicitacoes'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao enviar solicitação', description: error.message, variant: 'destructive' });
    },
  });

  const handleSearch = () => {
    if (searchTerm.length >= 2) setSearchQuery(searchTerm);
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

  return (
    <AppLayout title="Solicitar Ajuste">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Solicitar Ajuste de Comissão</h1>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Buscar Lançamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar por contrato, cliente, responsável..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searchTerm.length < 2}>
                <Search className="h-4 w-4 mr-2" /> Buscar
              </Button>
            </div>

            {searching && <p className="text-sm text-muted-foreground">Buscando...</p>}

            {searchResults && searchResults.length > 0 && (
              <div className="border rounded-lg overflow-auto max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Resp. Recebimento</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.numero_contrato || '-'}</TableCell>
                        <TableCell>{item.nome_cliente || '-'}</TableCell>
                        <TableCell>{item.produto || '-'}</TableCell>
                        <TableCell>{item.resp_recebimento || '-'}</TableCell>
                        <TableCell>{formatCurrency(item.valor)}</TableCell>
                        <TableCell>{item.data_lancamento || '-'}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedLancamento(item);
                              setDialogOpen(true);
                            }}
                          >
                            Solicitar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {searchResults && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum lançamento encontrado.</p>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Minhas Solicitações</CardTitle>
          </CardHeader>
          <CardContent>
            {!solicitacoes || solicitacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma solicitação feita ainda.</p>
            ) : (
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>De</TableHead>
                      <TableHead>Para</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Comentário Admin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solicitacoes.map((sol: any) => (
                      <TableRow key={sol.id}>
                        <TableCell className="text-xs">
                          {new Date(sol.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {sol.numero_contrato || sol.lancamentos?.numero_contrato || '-'}
                        </TableCell>
                        <TableCell>{sol.nome_cliente || sol.lancamentos?.nome_cliente || '-'}</TableCell>
                        <TableCell>{sol.resp_recebimento_atual || '-'}</TableCell>
                        <TableCell>{sol.resp_recebimento_novo}</TableCell>
                        <TableCell>{statusBadge(sol.status)}</TableCell>
                        <TableCell className="text-xs">{sol.admin_comentario || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Ajuste de Comissão</DialogTitle>
            </DialogHeader>
            {selectedLancamento && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Contrato:</strong> {selectedLancamento.numero_contrato || '-'}</div>
                  <div><strong>Cliente:</strong> {selectedLancamento.nome_cliente || '-'}</div>
                  <div><strong>Produto:</strong> {selectedLancamento.produto || '-'}</div>
                  <div><strong>Valor:</strong> {formatCurrency(selectedLancamento.valor)}</div>
                  <div className="col-span-2">
                    <strong>Resp. Recebimento atual:</strong> {selectedLancamento.resp_recebimento || '-'}
                  </div>
                  <div className="col-span-2">
                    <strong>Novo Resp. Recebimento:</strong> {consultora?.nome || '-'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Justificativa *</label>
                  <Textarea
                    placeholder="Explique por que este lançamento deve ser creditado a você..."
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={!justificativa.trim() || submitMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {submitMutation.isPending ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
