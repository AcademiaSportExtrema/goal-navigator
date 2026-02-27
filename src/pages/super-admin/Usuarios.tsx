import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import { Search, Users, KeyRound, Building, UserCheck, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useImpersonation } from '@/hooks/useImpersonation';
import { Textarea } from '@/components/ui/textarea';
import { useQueryClient } from '@tanstack/react-query';

interface UserEntry {
  id: string;
  email: string;
  role: string | null;
  empresa_id: string | null;
  empresa_nome: string | null;
  empresa_slug: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function Usuarios() {
  const [search, setSearch] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState('all');
  const [resetDialog, setResetDialog] = useState<UserEntry | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [impersonateDialog, setImpersonateDialog] = useState<UserEntry | null>(null);
  const [impersonateMotivo, setImpersonateMotivo] = useState('');
  const [impersonating, setImpersonating] = useState(false);
  const { startImpersonation } = useImpersonation();
  const queryClient = useQueryClient();

  // Create user state
  const [createDialog, setCreateDialog] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<string>('admin');
  const [createEmpresaId, setCreateEmpresaId] = useState('');
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, empresaFilter],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (empresaFilter && empresaFilter !== 'all') params.set('empresa_id', empresaFilter);

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users-admin?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao listar usuários');
      }
      return res.json() as Promise<{ users: UserEntry[]; total: number }>;
    },
  });

  // Get empresas for filter
  const { data: empresas } = useQuery({
    queryKey: ['empresas-filter'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas').select('id, nome').order('nome');
      if (error) throw error;
      return data;
    },
  });

  const handleResetPassword = async () => {
    if (!resetDialog || !newPassword) return;
    setResetting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { email: resetDialog.email, password: newPassword },
      });
      if (error) throw error;
      toast.success(`Senha redefinida para ${resetDialog.email}`);
      setResetDialog(null);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao redefinir senha');
    } finally {
      setResetting(false);
    }
  };

  const handleCreateUser = async () => {
    if (!createEmail || !createPassword || !createRole || !createEmpresaId) return;
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user-admin`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: createEmail,
            password: createPassword,
            role: createRole,
            empresa_id: createEmpresaId,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao criar usuário');
      toast.success(`Usuário ${createEmail} criado com sucesso`);
      setCreateDialog(false);
      setCreateEmail('');
      setCreatePassword('');
      setCreateRole('admin');
      setCreateEmpresaId('');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar usuário');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const roleLabel = (role: string | null) => {
    if (!role) return 'Sem role';
    const map: Record<string, string> = { admin: 'Admin', consultora: 'Consultora', super_admin: 'Super Admin' };
    return map[role] || role;
  };

  return (
    <AppLayout title="Usuários">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
            <p className="text-muted-foreground">Busca global de usuários da plataforma</p>
          </div>
          <Button onClick={() => setCreateDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
                <SelectTrigger className="w-full md:w-[250px]">
                  <SelectValue placeholder="Filtrar por empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {empresas?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              {data ? `${data.total} usuário(s)` : 'Usuários'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Último login</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : user.role === 'super_admin' ? 'destructive' : 'secondary'}>
                          {roleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.empresa_nome ? (
                          <Link
                            to={`/super-admin/empresas/${user.empresa_id}`}
                            className="text-primary hover:underline"
                          >
                            {user.empresa_nome}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(user.last_sign_in_at)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {user.role !== 'super_admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setImpersonateDialog(user);
                              setImpersonateMotivo('');
                            }}
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            Impersonar
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setResetDialog(user);
                            setNewPassword('');
                          }}
                        >
                          <KeyRound className="h-3 w-3 mr-1" />
                          Resetar Senha
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data?.users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetDialog} onOpenChange={(open) => { if (!open) setResetDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Redefinir a senha de <strong>{resetDialog?.email}</strong>
            </p>
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialog(null)}>Cancelar</Button>
            <Button
              onClick={handleResetPassword}
              disabled={!newPassword || newPassword.length < 6 || resetting}
            >
              {resetting ? 'Redefinindo...' : 'Redefinir Senha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Impersonate Dialog */}
      <Dialog open={!!impersonateDialog} onOpenChange={(open) => { if (!open) setImpersonateDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Impersonar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você entrará na sessão de <strong>{impersonateDialog?.email}</strong> ({impersonateDialog?.empresa_nome || 'sem empresa'}).
            </p>
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive font-medium">
                ⚠️ Esta ação será registrada no log de auditoria. Informe o motivo obrigatoriamente.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Motivo da impersonação</Label>
              <Textarea
                value={impersonateMotivo}
                onChange={(e) => setImpersonateMotivo(e.target.value)}
                placeholder="Ex: investigar erro reportado pelo cliente, verificar configuração..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImpersonateDialog(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!impersonateDialog) return;
                setImpersonating(true);
                await startImpersonation(impersonateDialog.id, impersonateMotivo);
                setImpersonating(false);
              }}
              disabled={impersonateMotivo.trim().length < 5 || impersonating}
            >
              {impersonating ? 'Impersonando...' : 'Confirmar Impersonação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="usuario@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={createRole} onValueChange={setCreateRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="consultora">Consultora</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={createEmpresaId} onValueChange={setCreateEmpresaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleCreateUser}
              disabled={!createEmail || !createPassword || createPassword.length < 6 || !createEmpresaId || creating}
            >
              {creating ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
