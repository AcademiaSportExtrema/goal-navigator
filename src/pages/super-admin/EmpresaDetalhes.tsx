import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
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
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Building,
  Users,
  FileText,
  Upload,
  Clock,
  CheckCircle,
  XCircle,
  Shield,
  UserCheck,
  ImagePlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useImpersonation } from '@/hooks/useImpersonation';

interface EmpresaDetails {
  empresa: {
    id: string;
    nome: string;
    slug: string;
    ativo: boolean;
    subscription_status: string;
    trial_ends_at: string | null;
    created_at: string;
    updated_at: string;
    logo_url: string | null;
  };
  users: {
    user_id: string;
    email: string;
    role: string;
    consultora_id: string | null;
    created_at: string;
    last_sign_in_at: string | null;
  }[];
  counts: {
    consultoras: number;
    lancamentos: number;
    uploads: number;
  };
  recent_logs: {
    id: string;
    created_at: string;
    actor_email: string;
    action: string;
    target_table: string | null;
    metadata: Record<string, any>;
  }[];
}

const statusLabels: Record<string, string> = {
  active: 'Ativa',
  past_due: 'Inadimplente',
  canceled: 'Cancelada',
  trialing: 'Trial',
};

export default function EmpresaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { startImpersonation } = useImpersonation();
  const [impersonateDialog, setImpersonateDialog] = useState<{ user_id: string; email: string } | null>(null);
  const [impersonateMotivo, setImpersonateMotivo] = useState('');
  const [impersonating, setImpersonating] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, error } = useQuery<EmpresaDetails>({
    queryKey: ['empresa-details', id],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-empresa-details?empresa_id=${id}`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao carregar detalhes');
      }
      return res.json();
    },
    enabled: !!id,
  });

  const toggleAtivo = useMutation({
    mutationFn: async (ativo: boolean) => {
      const { error } = await supabase
        .from('empresas')
        .update({ ativo })
        .eq('id', id!);
      if (error) throw error;
      await supabase.functions.invoke('audit-log', {
        body: {
          action: 'empresa.toggle_ativo',
          target_table: 'empresas',
          target_id: id,
          empresa_id: id,
          metadata: { ativo, nome: data?.empresa.nome },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-details', id] });
      toast.success('Empresa atualizada');
    },
  });

  const updateSubscription = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from('empresas')
        .update({ subscription_status: status })
        .eq('id', id!);
      if (error) throw error;
      await supabase.functions.invoke('audit-log', {
        body: {
          action: 'empresa.update_subscription',
          target_table: 'empresas',
          target_id: id,
          empresa_id: id,
          metadata: { subscription_status: status, nome: data?.empresa.nome },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa-details', id] });
      toast.success('Status da assinatura atualizado');
    },
  });

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use PNG, JPG, SVG ou WebP.');
      return;
    }

    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${id}/logo.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(path, file, { upsert: true });
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('empresas')
        .update({ logo_url: publicUrl } as any)
        .eq('id', id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['empresa-details', id] });
      toast.success('Logo atualizado com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao fazer upload do logo');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const roleLabel = (role: string) => {
    const map: Record<string, string> = { admin: 'Admin', consultora: 'Consultora', super_admin: 'Super Admin' };
    return map[role] || role;
  };

  if (isLoading) {
    return (
      <AppLayout title="Detalhes da Empresa">
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout title="Detalhes da Empresa">
        <div className="space-y-4">
          <Button variant="ghost" asChild>
            <Link to="/super-admin/empresas"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Link>
          </Button>
          <p className="text-destructive">Erro ao carregar detalhes da empresa.</p>
        </div>
      </AppLayout>
    );
  }

  const { empresa, users, counts, recent_logs } = data;

  return (
    <AppLayout title={`Empresa: ${empresa.nome}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/super-admin/empresas"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{empresa.nome}</h1>
              <p className="text-muted-foreground">Slug: {empresa.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={empresa.ativo ? 'default' : 'secondary'}>
              {empresa.ativo ? 'Ativa' : 'Inativa'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAtivo.mutate(!empresa.ativo)}
              disabled={toggleAtivo.isPending}
            >
              {empresa.ativo ? 'Desativar' : 'Ativar'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.consultoras}</p>
                <p className="text-xs text-muted-foreground">Consultoras</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.lancamentos.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">Lançamentos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.uploads}</p>
                <p className="text-xs text-muted-foreground">Uploads</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{formatDate(empresa.created_at)}</p>
                <p className="text-xs text-muted-foreground">Criada em</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logo & Subscription Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-5 w-5" />
              Informações da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Logo Upload */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground">Logo</p>
                <div
                  className="relative h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {empresa.logo_url ? (
                    <img src={empresa.logo_url} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
                  )}
                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">Enviando...</span>
                    </div>
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                  {empresa.logo_url ? 'Alterar logo' : 'Subir logo'}
                </Button>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status da Assinatura</p>
                <div className="flex items-center gap-2 mt-1">
                  <Select
                    value={empresa.subscription_status}
                    onValueChange={(v) => updateSubscription.mutate(v)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="trialing">Trial</SelectItem>
                      <SelectItem value="past_due">Inadimplente</SelectItem>
                      <SelectItem value="canceled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trial expira em</p>
                <p className="text-sm font-medium mt-1">{empresa.trial_ends_at ? formatDate(empresa.trial_ends_at) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Última atualização</p>
                <p className="text-sm font-medium mt-1">{formatDate(empresa.updated_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Usuários ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Último login</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                        {roleLabel(u.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(u.last_sign_in_at)}</TableCell>
                    <TableCell className="text-right">
                      {u.role !== 'super_admin' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setImpersonateDialog({ user_id: u.user_id, email: u.email });
                            setImpersonateMotivo('');
                          }}
                        >
                          <UserCheck className="h-3 w-3 mr-1" />
                          Impersonar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Audit Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Logs de Auditoria Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Ator</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Tabela</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent_logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(log.created_at)}</TableCell>
                    <TableCell className="text-sm">{log.actor_email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.target_table || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {JSON.stringify(log.metadata)}
                    </TableCell>
                  </TableRow>
                ))}
                {recent_logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum log encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Impersonate Dialog */}
      <Dialog open={!!impersonateDialog} onOpenChange={(open) => { if (!open) setImpersonateDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Impersonar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você entrará na sessão de <strong>{impersonateDialog?.email}</strong>.
            </p>
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive font-medium">
                ⚠️ Esta ação será registrada no log de auditoria.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Motivo da impersonação</Label>
              <Textarea
                value={impersonateMotivo}
                onChange={(e) => setImpersonateMotivo(e.target.value)}
                placeholder="Ex: investigar erro reportado pelo cliente..."
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
                await startImpersonation(impersonateDialog.user_id, impersonateMotivo);
                setImpersonating(false);
              }}
              disabled={impersonateMotivo.trim().length < 5 || impersonating}
            >
              {impersonating ? 'Impersonando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
