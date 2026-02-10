import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { Users, Plus, Edit, Trash2, Mail, User, UserPlus, Unlink, KeyRound } from 'lucide-react';
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

interface ResetPasswordForm {
  email: string;
  password: string;
}

export default function ConsultorasContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConsultora, setEditingConsultora] = useState<Consultora | null>(null);
  const [form, setForm] = useState<ConsultoraForm>(defaultForm);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetForm, setResetForm] = useState<ResetPasswordForm>({ email: '', password: '' });
  const [createAccessDialogOpen, setCreateAccessDialogOpen] = useState(false);
  const [createAccessConsultora, setCreateAccessConsultora] = useState<Consultora | null>(null);
  const [createAccessPassword, setCreateAccessPassword] = useState('');
  
  const { toast } = useToast();
  const { empresaId } = useAuth();
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

  const { data: userRoles } = useQuery({
    queryKey: ['user-roles-consultoras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'consultora');
      if (error) throw error;
      return data;
    },
  });

  const getAccessStatus = (consultora: Consultora) => {
    if (!consultora.email) return 'no_email';
    const hasRole = userRoles?.some(r => r.consultora_id === consultora.id);
    return hasRole ? 'linked' : 'not_linked';
  };

  const createAndLink = useMutation({
    mutationFn: async ({ email, password, consultora_id }: { email: string; password: string; consultora_id: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-consultora-access', {
        body: { action: 'create_and_link', email, password, consultora_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles-consultoras'] });
      toast({ title: 'Conta criada e acesso vinculado com sucesso!' });
      setCreateAccessDialogOpen(false);
      setCreateAccessConsultora(null);
      setCreateAccessPassword('');
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar acesso', description: error.message, variant: 'destructive' });
    },
  });

  const unlinkAccess = useMutation({
    mutationFn: async (consultora_id: string) => {
      const { data, error } = await supabase.functions.invoke('manage-consultora-access', {
        body: { action: 'unlink', consultora_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles-consultoras'] });
      toast({ title: 'Acesso removido!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao remover acesso', description: error.message, variant: 'destructive' });
    },
  });

  const resetPassword = useMutation({
    mutationFn: async ({ email, password }: ResetPasswordForm) => {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { email, password },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Senha redefinida com sucesso!' });
      setResetDialogOpen(false);
      setResetForm({ email: '', password: '' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao redefinir senha', description: error.message, variant: 'destructive' });
    },
  });

  const createConsultora = useMutation({
    mutationFn: async (data: ConsultoraForm) => {
      const { error } = await supabase
        .from('consultoras')
        .insert({ nome: data.nome, email: data.email || null, ativo: data.ativo, empresa_id: empresaId! });
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
        .update({ nome: data.nome, email: data.email || null, ativo: data.ativo })
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
      const { error } = await supabase.from('consultoras').delete().eq('id', id);
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
      const { error } = await supabase.from('consultoras').update({ ativo }).eq('id', id);
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
    setForm({ nome: consultora.nome, email: consultora.email || '', ativo: consultora.ativo });
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
  const comAcesso = consultoras?.filter(c => getAccessStatus(c) === 'linked').length || 0;

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
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
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">{comAcesso}</p>
              <p className="text-sm text-muted-foreground">Com Acesso</p>
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
                Cadastre as consultoras e gerencie o acesso ao sistema
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
                    <Label>Email (usado para vincular acesso ao sistema)</Label>
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
                    <p className="text-xs text-muted-foreground">
                      A consultora deve se cadastrar no sistema com este mesmo email
                    </p>
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
              {consultoras.map((consultora) => {
                const accessStatus = getAccessStatus(consultora);
                return (
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{consultora.nome}</p>
                          {accessStatus === 'linked' && (
                            <Badge variant="default" className="bg-success text-success-foreground text-[10px] px-1.5 py-0">
                              Com acesso
                            </Badge>
                          )}
                          {accessStatus === 'not_linked' && (
                            <Badge variant="secondary" className="bg-warning/20 text-warning text-[10px] px-1.5 py-0">
                              Sem vínculo
                            </Badge>
                          )}
                          {accessStatus === 'no_email' && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              Sem email
                            </Badge>
                          )}
                        </div>
                        {consultora.email && (
                          <p className="text-sm text-muted-foreground">{consultora.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {accessStatus === 'not_linked' && consultora.email && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs gap-1"
                          onClick={() => {
                            setCreateAccessConsultora(consultora);
                            setCreateAccessPassword('');
                            setCreateAccessDialogOpen(true);
                          }}
                        >
                          <UserPlus className="h-3 w-3" />
                          Criar Acesso
                        </Button>
                      )}
                      {accessStatus === 'linked' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs gap-1 text-destructive"
                            disabled={unlinkAccess.isPending}
                            onClick={() => {
                              if (confirm('Remover acesso desta consultora?')) {
                                unlinkAccess.mutate(consultora.id);
                              }
                            }}
                          >
                            <Unlink className="h-3 w-3" />
                            Desvincular
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs gap-1"
                            onClick={() => {
                              setResetForm({ email: consultora.email!, password: '' });
                              setResetDialogOpen(true);
                            }}
                          >
                            <KeyRound className="h-3 w-3" />
                            Senha
                          </Button>
                        </>
                      )}

                      <span className={`text-xs px-2 py-1 rounded-full ${
                        consultora.ativo ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                      }`}>
                        {consultora.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                      <Switch
                        checked={consultora.ativo}
                        onCheckedChange={(checked) => toggleAtivo.mutate({ id: consultora.id, ativo: checked })}
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(consultora)}>
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
                );
              })}
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

      {/* Dialog de redefinir senha */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para {resetForm.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input
                type="password"
                value={resetForm.password}
                onChange={(e) => setResetForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => resetPassword.mutate(resetForm)}
              disabled={resetPassword.isPending || resetForm.password.length < 6}
            >
              Redefinir Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de criar acesso */}
      <Dialog open={createAccessDialogOpen} onOpenChange={setCreateAccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Acesso</DialogTitle>
            <DialogDescription>
              Crie uma conta de login para {createAccessConsultora?.nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={createAccessConsultora?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                value={createAccessPassword}
                onChange={(e) => setCreateAccessPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateAccessDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (createAccessConsultora?.email) {
                  createAndLink.mutate({
                    email: createAccessConsultora.email,
                    password: createAccessPassword,
                    consultora_id: createAccessConsultora.id,
                  });
                }
              }}
              disabled={createAndLink.isPending || createAccessPassword.length < 6}
            >
              Criar Acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
