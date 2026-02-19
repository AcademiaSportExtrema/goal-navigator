import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TicketIcon,
  Send,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  aberto: { label: 'Aberto', variant: 'destructive', icon: Clock },
  em_andamento: { label: 'Em andamento', variant: 'default', icon: AlertTriangle },
  resolvido: { label: 'Resolvido', variant: 'secondary', icon: CheckCircle },
  fechado: { label: 'Fechado', variant: 'outline', icon: XCircle },
};

const prioridadeConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  baixa: { label: 'Baixa', variant: 'outline' },
  media: { label: 'Média', variant: 'secondary' },
  alta: { label: 'Alta', variant: 'default' },
  urgente: { label: 'Urgente', variant: 'destructive' },
};

export default function Tickets() {
  const { user, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('all');
  const [prioridadeFilter, setPrioridadeFilter] = useState('all');
  const [empresaFilter, setEmpresaFilter] = useState('all');

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  // Tickets query
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support-tickets', statusFilter, prioridadeFilter, empresaFilter],
    queryFn: async () => {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') query = query.eq('status', statusFilter as any);
      if (prioridadeFilter !== 'all') query = query.eq('prioridade', prioridadeFilter as any);
      if (empresaFilter !== 'all') query = query.eq('empresa_id', empresaFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Empresas for filter
  const { data: empresas } = useQuery({
    queryKey: ['empresas-tickets-filter'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas').select('id, nome').order('nome');
      if (error) throw error;
      return data;
    },
  });

  // Selected ticket messages
  const { data: messages } = useQuery({
    queryKey: ['ticket-messages', selectedTicketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', selectedTicketId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTicketId,
  });

  const selectedTicket = tickets?.find(t => t.id === selectedTicketId);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!selectedTicketId || !newMessage.trim()) throw new Error('Mensagem vazia');
      const { error } = await supabase.from('support_messages').insert({
        ticket_id: selectedTicketId,
        user_id: user!.id,
        mensagem: newMessage.trim(),
        is_internal: isSuperAdmin ? isInternal : false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage('');
      setIsInternal(false);
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', selectedTicketId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      if (!selectedTicketId) return;
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: status as any })
        .eq('id', selectedTicketId);
      if (error) throw error;
      // Audit log
      await supabase.functions.invoke('audit-log', {
        body: {
          action: 'ticket.update_status',
          target_table: 'support_tickets',
          target_id: selectedTicketId,
          empresa_id: selectedTicket?.empresa_id,
          metadata: { old_status: selectedTicket?.status, new_status: status },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('Status atualizado');
    },
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getEmpresaNome = (empresaId: string) =>
    empresas?.find(e => e.id === empresaId)?.nome || empresaId;

  // Stats
  const stats = {
    aberto: tickets?.filter(t => t.status === 'aberto').length || 0,
    em_andamento: tickets?.filter(t => t.status === 'em_andamento').length || 0,
    resolvido: tickets?.filter(t => t.status === 'resolvido').length || 0,
    total: tickets?.length || 0,
  };

  return (
    <AppLayout title="Tickets de Suporte">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tickets de Suporte</h1>
          <p className="text-muted-foreground">Gerencie solicitações de suporte das empresas</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-destructive">{stats.aberto}</p>
              <p className="text-xs text-muted-foreground">Abertos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-primary">{stats.em_andamento}</p>
              <p className="text-xs text-muted-foreground">Em andamento</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{stats.resolvido}</p>
              <p className="text-xs text-muted-foreground">Resolvidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as prioridades</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
              {isSuperAdmin && (
                <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
                  <SelectTrigger className="w-full md:w-[250px]">
                    <SelectValue placeholder="Empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as empresas</SelectItem>
                    {empresas?.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TicketIcon className="h-5 w-5" />
              Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Atualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets?.map(ticket => {
                    const st = statusConfig[ticket.status] || statusConfig.aberto;
                    const pr = prioridadeConfig[ticket.prioridade] || prioridadeConfig.media;
                    const StIcon = st.icon;
                    return (
                      <TableRow
                        key={ticket.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedTicketId(ticket.id);
                          setNewStatus(ticket.status);
                        }}
                      >
                        <TableCell className="font-medium max-w-[300px] truncate">{ticket.assunto}</TableCell>
                        <TableCell>
                          <Link
                            to={`/super-admin/empresas/${ticket.empresa_id}`}
                            className="text-primary hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            {getEmpresaNome(ticket.empresa_id)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={st.variant} className="gap-1">
                            <StIcon className="h-3 w-3" />
                            {st.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={pr.variant}>{pr.label}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(ticket.created_at)}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(ticket.updated_at)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {tickets?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum ticket encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ticket Detail Sheet */}
      <Sheet open={!!selectedTicketId} onOpenChange={(open) => { if (!open) setSelectedTicketId(null); }}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-left">{selectedTicket?.assunto || 'Ticket'}</SheetTitle>
          </SheetHeader>

          {selectedTicket && (
            <div className="flex flex-col flex-1 min-h-0 gap-4">
              {/* Ticket info */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Empresa:</span>{' '}
                  <span className="font-medium">{getEmpresaNome(selectedTicket.empresa_id)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Prioridade:</span>{' '}
                  <Badge variant={prioridadeConfig[selectedTicket.prioridade]?.variant || 'secondary'}>
                    {prioridadeConfig[selectedTicket.prioridade]?.label || selectedTicket.prioridade}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Descrição:</span>
                  <p className="mt-1 text-sm">{selectedTicket.descricao}</p>
                </div>
              </div>

              {/* Status update */}
              {isSuperAdmin && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Status:</Label>
                  <Select
                    value={newStatus}
                    onValueChange={(v) => {
                      setNewStatus(v);
                      updateStatus.mutate(v);
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="em_andamento">Em andamento</SelectItem>
                      <SelectItem value="resolvido">Resolvido</SelectItem>
                      <SelectItem value="fechado">Fechado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              {/* Messages */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-3 pr-4">
                  {messages?.map(msg => (
                    <div
                      key={msg.id}
                      className={`rounded-lg p-3 text-sm ${
                        msg.is_internal
                          ? 'bg-accent/50 border border-accent'
                          : msg.user_id === user?.id
                            ? 'bg-primary/10 ml-4'
                            : 'bg-muted mr-4'
                      }`}
                    >
                      {msg.is_internal && (
                        <span className="text-xs font-semibold text-accent-foreground block mb-1">
                          🔒 Nota interna
                        </span>
                      )}
                      <p className="whitespace-pre-wrap">{msg.mensagem}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(msg.created_at)}</p>
                    </div>
                  ))}
                  {messages?.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">Nenhuma mensagem</p>
                  )}
                </div>
              </ScrollArea>

              {/* New message */}
              <div className="space-y-2 pt-2 border-t">
                <Textarea
                  placeholder="Escreva uma mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  {isSuperAdmin && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="internal"
                        checked={isInternal}
                        onCheckedChange={(v) => setIsInternal(!!v)}
                      />
                      <Label htmlFor="internal" className="text-xs text-muted-foreground cursor-pointer">
                        Nota interna (só super admin vê)
                      </Label>
                    </div>
                  )}
                  <Button
                    size="sm"
                    onClick={() => sendMessage.mutate()}
                    disabled={!newMessage.trim() || sendMessage.isPending}
                    className="ml-auto"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    {sendMessage.isPending ? 'Enviando...' : 'Enviar'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
