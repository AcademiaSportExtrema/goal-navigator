import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Edit, Trash2, Mail, User } from 'lucide-react';
import type { Consultora } from '@/types/database';

interface ConsultoraForm {
  nome: string;
  email: string;
  ativo: boolean;
}

const defaultForm: ConsultoraForm = {
  nome: '',
  email: '',
  ativo: true,
};

export default function Consultoras() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConsultora, setEditingConsultora] = useState<Consultora | null>(null);
  const [form, setForm] = useState<ConsultoraForm>(defaultForm);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: consultoras, isLoading } = useQuery({
    queryKey: ['consultoras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consultoras')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      return data as Consultora[];
    },
  });

  const createConsultora = useMutation({
    mutationFn: async (data: ConsultoraForm) => {
      const { error } = await supabase
        .from('consultoras')
        .insert({
          nome: data.nome,
          email: data.email || null,
          ativo: data.ativo,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultoras'] });
      toast({ title: 'Consultora cadastrada com sucesso!' });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
    },
  });

  const updateConsultora = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ConsultoraForm> }) => {
      const { error } = await supabase
        .from('consultoras')
        .update({
          nome: data.nome,
          email: data.email || null,
          ativo: data.ativo,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultoras'] });
      toast({ title: 'Consultora atualizada!' });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  const deleteConsultora = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('consultoras')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultoras'] });
      toast({ title: 'Consultora excluída!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    },
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('consultoras')
        .update({ ativo })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultoras'] });
    },
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingConsultora(null);
    setForm(defaultForm);
  };

  const handleEdit = (consultora: Consultora) => {
    setEditingConsultora(consultora);
    setForm({
      nome: consultora.nome,
      email: consultora.email || '',
      ativo: consultora.ativo,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.nome.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    if (editingConsultora) {
      updateConsultora.mutate({ id: editingConsultora.id, data: form });
    } else {
      createConsultora.mutate(form);
    }
  };

  const ativas = consultoras?.filter(c => c.ativo).length || 0;
  const inativas = consultoras?.filter(c => !c.ativo).length || 0;

  return (
    <AppLayout title="Consultoras">
      <div className="space-y-4">
        {/* Resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-4xl font-bold">{consultoras?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-success">{ativas}</p>
                <p className="text-sm text-muted-foreground">Ativas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-muted-foreground">{inativas}</p>
                <p className="text-sm text-muted-foreground">Inativas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Equipe de Vendas
                </CardTitle>
                <CardDescription>
                  Cadastre as consultoras que aparecem nos arquivos Excel
                </CardDescription>
              </div>
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingConsultora(null); setForm(defaultForm); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Consultora
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingConsultora ? 'Editar Consultora' : 'Nova Consultora'}</DialogTitle>
                    <DialogDescription>
                      O nome deve corresponder exatamente ao que aparece na coluna "Resp. Venda" do Excel
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={form.nome}
                          onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                          placeholder="Nome completo"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Email (opcional)</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="email@empresa.com"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                      <Label className="cursor-pointer">Ativo</Label>
                      <Switch
                        checked={form.ativo}
                        onCheckedChange={(checked) => setForm(f => ({ ...f, ativo: checked }))}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={createConsultora.isPending || updateConsultora.isPending}>
                      {editingConsultora ? 'Salvar Alterações' : 'Cadastrar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : consultoras && consultoras.length > 0 ? (
              <div className="space-y-2">
                {consultoras.map((consultora) => (
                  <div
                    key={consultora.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      consultora.ativo ? 'bg-card' : 'bg-muted/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        {consultora.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{consultora.nome}</p>
                        {consultora.email && (
                          <p className="text-sm text-muted-foreground">{consultora.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        consultora.ativo ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                      }`}>
                        {consultora.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                      <Switch
                        checked={consultora.ativo}
                        onCheckedChange={(checked) => toggleAtivo.mutate({ id: consultora.id, ativo: checked })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(consultora)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir esta consultora?')) {
                            deleteConsultora.mutate(consultora.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Nenhuma consultora cadastrada</p>
                <p className="text-sm">Cadastre as consultoras para vincular às metas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
